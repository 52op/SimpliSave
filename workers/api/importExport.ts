// Bookmark HTML import/export utilities for D1
import { successResponse, errorResponse } from '../utils/response';
import { verifyJWT } from '../utils/jwt';

async function getUserId(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  return payload?.userId || null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(tag)) !== null) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2]);
  }
  return attrs;
}

function parseBookmarkHtml(html: string): Array<{ title: string; url: string; description?: string; icon_url?: string; categoryPath?: string[] }> {
  const lines = html.split(/\r?\n/);
  const stack: string[] = [];
  const results: Array<{ title: string; url: string; description?: string; icon_url?: string; categoryPath?: string[] }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 文件夹标题
    const h3Match = line.match(/<H3[^>]*>(.*?)<\/H3>/i);
    if (h3Match) {
      stack.push(decodeHtmlEntities(h3Match[1].trim()));
      continue;
    }

    // 书签链接
    const aMatch = line.match(/<A\s+([^>]+)>(.*?)<\/A>/i);
    if (aMatch) {
      const attrs = extractAttributes(aMatch[1]);
      const title = decodeHtmlEntities(aMatch[2].trim());
      const url = attrs.href || '';
      if (!url) continue;

      const desc = attrs.add_date ? undefined : undefined;
      const icon = attrs.icon || attrs.icon_url || undefined;

      results.push({
        title,
        url,
        description: desc,
        icon_url: icon,
        categoryPath: [...stack],
      });
      continue;
    }

    // 文件夹结束，回退层级
    if (line.includes('</DL>')) {
      if (stack.length > 0) stack.pop();
      continue;
    }
  }

  return results;
}

function buildBookmarkHtml(items: Array<{ title: string; url: string; description?: string; icon_url?: string; category?: string }>): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n`;
  html += `<!-- This is an automatically generated file. -->\n`;
  html += `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n`;
  html += `<TITLE>SimpliSave Bookmarks</TITLE>\n`;
  html += `<H1>SimpliSave Bookmarks</H1>\n`;
  html += `<DL><p>\n`;

  // 简单按 category 分组
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category || '未分类';
    if (!groups.has(key)) groups.set(key, [] as any);
    groups.get(key)!.push(item);
  }

  for (const [category, list] of groups.entries()) {
    html += `  <DT><H3>${esc(category)}</H3>\n`;
    html += `  <DL><p>\n`;
    for (const item of list) {
      const attrs: string[] = [`HREF=\"${esc(item.url)}\"`];
      if (item.icon_url) attrs.push(`ICON=\"${esc(item.icon_url)}\"`);
      html += `    <DT><A ${attrs.join(' ')}>${esc(item.title)}</A>\n`;
    }
    html += `  </DL><p>\n`;
  }

  html += `</DL><p>\n`;
  return html;
}

// 导入浏览器书签 HTML 到 user_bookmarks
export async function handleImportUserBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const contentType = request.headers.get('content-type') || '';
  let html = '';

  if (contentType.includes('application/json')) {
    const body = await request.json() as { html?: string };
    html = body.html || '';
  } else {
    html = await request.text();
  }

  if (!html.trim()) return errorResponse('Empty bookmark HTML', 400);

  const items = parseBookmarkHtml(html);
  if (items.length === 0) return errorResponse('No bookmarks found in HTML', 400);

  // 先收集文件夹名并确保分类存在
  const categoryMap = new Map<string, string>();
  const categoryNames = new Set<string>();
  for (const item of items) {
    const cat = (item.categoryPath && item.categoryPath.length > 0) ? item.categoryPath[item.categoryPath.length - 1] : '未分类';
    categoryNames.add(cat);
  }

  for (const name of categoryNames) {
    const existed = await env.DB.prepare('SELECT id FROM user_categories WHERE user_id = ? AND name = ?').bind(userId, name).first();
    if (existed) {
      categoryMap.set(name, existed.id);
    } else {
      const created = await env.DB.prepare('INSERT INTO user_categories (user_id, name, color, sort_order) VALUES (?, ?, ?, ?)').bind(userId, name, '#3b82f6', 0).run();
      if (created.success) {
        const row = await env.DB.prepare('SELECT id FROM user_categories WHERE user_id = ? AND name = ?').bind(userId, name).first();
        if (row) categoryMap.set(name, row.id);
      }
    }
  }

  let inserted = 0;
  for (const item of items) {
    const categoryName = (item.categoryPath && item.categoryPath.length > 0) ? item.categoryPath[item.categoryPath.length - 1] : '未分类';
    const categoryId = categoryMap.get(categoryName) || null;

    const result = await env.DB.prepare(
      'INSERT INTO user_bookmarks (user_id, title, url, description, icon_url, category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      userId,
      item.title,
      item.url,
      item.description || null,
      item.icon_url || null,
      categoryId,
      JSON.stringify([])
    ).run();

    if (result.success) inserted += 1;
  }

  return successResponse({
    imported: inserted,
    total: items.length,
    message: `Imported ${inserted}/${items.length} bookmarks`
  });
}

// 导出 user_bookmarks 为 HTML
export async function handleExportUserBookmarksHtml(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const bookmarks = await env.DB.prepare(
    `SELECT ub.*, uc.name as category_name
     FROM user_bookmarks ub
     LEFT JOIN user_categories uc ON ub.category_id = uc.id
     WHERE ub.user_id = ? AND ub.archived = 0
     ORDER BY uc.sort_order ASC, ub.created_at DESC`
  ).bind(userId).all();

  const html = buildBookmarkHtml((bookmarks.results as any[]).map((b) => ({
    title: b.title,
    url: b.url,
    description: b.description || undefined,
    icon_url: b.icon_url || undefined,
    category: b.category_name || '未分类',
  })));

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Content-Disposition': `attachment; filename="simplisave-bookmarks-${Date.now()}.html"`
    }
  });
}
