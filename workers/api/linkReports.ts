import { errorResponse, successResponse } from '../utils/response';
import { getEmailConfig, sendEmail } from '../utils/email';
import { buildLinkReportEmail } from '../utils/emailTemplates';

const RATE_LIMIT_SECONDS = 300;

export async function handleCreateLinkReport(request: Request, env: any): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  if (!request.body) return errorResponse('Body required', 400);

  const body = await request.json().catch(() => null) as any;
  if (!body || !body.bookmark_id || !body.problem_type) {
    return errorResponse('bookmark_id and problem_type are required');
  }
  if (!['dead', 'changed', 'other'].includes(body.problem_type)) {
    return errorResponse('Invalid problem_type');
  }

  const bookmark = await env.DB.prepare(
    'SELECT id, title, url, group_id FROM public_bookmarks WHERE id = ? AND status = ?'
  ).bind(body.bookmark_id, 'active').first<any>();
  if (!bookmark) return errorResponse('Bookmark not found', 404);

  const reporterIp = request.headers.get('CF-Connecting-IP') || 'unknown';

  const recent = await env.DB.prepare(
    'SELECT id FROM link_reports WHERE reporter_ip = ? AND bookmark_id = ? AND created_at > ? LIMIT 1'
  ).bind(reporterIp, body.bookmark_id, Math.floor(Date.now() / 1000) - RATE_LIMIT_SECONDS).first();
  if (recent) {
    return errorResponse('请 5 分钟后再试', 429);
  }

  let isAlive = false;
  let currentTitle = '';
  let statusCode: number | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(bookmark.url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'SimpliSave-LinkChecker/1.0' },
    });
    clearTimeout(timeout);
    statusCode = resp.status;
    isAlive = statusCode >= 200 && statusCode < 400;
    const text = await resp.text().catch(() => '');
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) currentTitle = titleMatch[1].trim();
  } catch {
    isAlive = false;
  }

  await env.DB.prepare(
    `INSERT INTO link_reports (bookmark_id, problem_type, description, reporter_ip, url, title, is_alive, current_title, status_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.bookmark_id,
    body.problem_type,
    (body.description || '').slice(0, 1000),
    reporterIp,
    bookmark.url,
    bookmark.title,
    isAlive ? 1 : 0,
    currentTitle.slice(0, 500),
    statusCode,
  ).run();

  notifyAdmin(env, bookmark, body.problem_type, body.description || '', isAlive, statusCode, currentTitle).catch(console.error);

  return successResponse({
    url: bookmark.url,
    is_alive: isAlive,
    status_code: statusCode,
    current_title: currentTitle,
  });
}

async function notifyAdmin(env: any, bookmark: any, problemType: string, description: string, isAlive: boolean, statusCode: number | null, currentTitle: string) {
  const emailCfg = await getEmailConfig(env.DB);
  if (!emailCfg) return;

  const site = await env.DB.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>();
  const siteName = site?.site_name || 'SimpliSave';

  let groupName = '';
  if (bookmark.group_id) {
    const group = await env.DB.prepare('SELECT title FROM public_card_groups WHERE id = ?').bind(bookmark.group_id).first<{ title: string }>();
    if (group) groupName = group.title;
  }

  const { subject, html } = buildLinkReportEmail({
    bookmarkTitle: bookmark.title,
    bookmarkUrl: bookmark.url,
    groupName,
    problemType,
    description,
    isAlive,
    statusCode,
    currentTitle,
    siteName,
  });
  await sendEmail({ to: emailCfg.from_address, subject, html }, emailCfg);
}
