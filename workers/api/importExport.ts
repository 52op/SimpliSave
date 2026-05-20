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

// 确保分类层级存在，返回叶子分类ID
// renameMap: 完整路径 → 叶子段重命名（用于冲突时用户选择重命名）
async function ensureCategoryHierarchy(
  userId: string,
  segments: string[],
  existingCache: Map<string, string>,
  newCache: Map<string, string>,
  renameMap: Map<string, string>,
  env: any
): Promise<string> {
  let parentId: string | null = null;
  let currentKey = '';
  const fullPath = segments.join('/');

  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i];
    const isLeaf = i === segments.length - 1;

    if (isLeaf && renameMap.has(fullPath)) {
      seg = renameMap.get(fullPath)!;
    }

    currentKey = currentKey ? `${currentKey}/${seg}` : seg;

    const cached = existingCache.get(currentKey) || newCache.get(currentKey);
    if (cached) {
      parentId = cached;
      continue;
    }

    let row: any;
    if (parentId) {
      row = await env.DB.prepare(
        'SELECT id FROM user_categories WHERE user_id = ? AND name = ? AND parent_id = ?'
      ).bind(userId, seg, parentId).first();
    } else {
      row = await env.DB.prepare(
        'SELECT id FROM user_categories WHERE user_id = ? AND name = ? AND parent_id IS NULL'
      ).bind(userId, seg).first();
    }

    if (row) {
      existingCache.set(currentKey, row.id);
      parentId = row.id;
      continue;
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO user_categories (id, user_id, name, parent_id, color, sort_order, type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, seg, parentId, '#3b82f6', 0, 'bookmark').run();
    newCache.set(currentKey, id);
    parentId = id;
  }

  return parentId!;
}

// 预览导入：仅扫描，不写入
export async function handlePreviewImportUserBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as { html?: string };
  const html = body.html || '';
  if (!html.trim()) return errorResponse('Empty bookmark HTML', 400);

  const items = parseBookmarkHtml(html);
  if (items.length === 0) return errorResponse('No bookmarks found in HTML', 400);

  const scannedPaths = new Set<string>();
  let uncategorizedCount = 0;
  for (const item of items) {
    if (item.categoryPath && item.categoryPath.length > 0) {
      scannedPaths.add(item.categoryPath.join('/'));
    } else {
      uncategorizedCount++;
    }
  }

  const existingCategories: string[] = [];
  const newCategories: string[] = [];

  for (const path of scannedPaths) {
    const segments = path.split('/');
    let parentId: string | null = null;
    let pathExists = true;

    for (const seg of segments) {
      let found: any;
      if (parentId) {
        found = await env.DB.prepare(
          'SELECT id FROM user_categories WHERE user_id = ? AND name = ? AND parent_id = ?'
        ).bind(userId, seg, parentId).first();
      } else {
        found = await env.DB.prepare(
          'SELECT id FROM user_categories WHERE user_id = ? AND name = ? AND parent_id IS NULL'
        ).bind(userId, seg).first();
      }
      if (found) {
        parentId = found.id;
      } else {
        pathExists = false;
        break;
      }
    }

    if (pathExists) {
      existingCategories.push(path);
    } else {
      newCategories.push(path);
    }
  }

  return successResponse({
    total: items.length,
    existing_categories: existingCategories,
    new_categories: newCategories,
    all_categories: Array.from(scannedPaths),
    uncategorized_count: uncategorizedCount,
  });
}

// 导入浏览器书签 HTML 到 user_bookmarks
export async function handleImportUserBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const contentType = request.headers.get('content-type') || '';
  let html = '';
  let renameMap = new Map<string, string>();

  if (contentType.includes('application/json')) {
    const body = await request.json() as { html?: string; rename_map?: Record<string, string> };
    html = body.html || '';
    if (body.rename_map) {
      renameMap = new Map(Object.entries(body.rename_map));
    }
  } else {
    html = await request.text();
  }

  if (!html.trim()) return errorResponse('Empty bookmark HTML', 400);

  const items = parseBookmarkHtml(html);
  if (items.length === 0) return errorResponse('No bookmarks found in HTML', 400);

  const existingCache = new Map<string, string>();
  const newCache = new Map<string, string>();
  let inserted = 0;

  for (const item of items) {
    const segments = item.categoryPath || [];

    let categoryId: string | null = null;
    if (segments.length > 0) {
      categoryId = await ensureCategoryHierarchy(userId, segments, existingCache, newCache, renameMap, env);
    }

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
    message: `Imported ${inserted}/${items.length} bookmarks`,
    existing_categories: Array.from(existingCache.keys()),
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
