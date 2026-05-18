import { verifyJWT } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';

async function getUserRole(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  if (!payload?.userId) return null;
  const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(payload.userId).first();
  return user?.role || 'user';
}

export async function handleListSearchEngines(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('active_only');
  let sql = 'SELECT * FROM search_engines';
  const params: any[] = [];
  if (activeOnly === '1') {
    sql += ' WHERE is_active = 1';
  }
  sql += ' ORDER BY sort_order ASC, created_at ASC';
  const result = await env.DB.prepare(sql).bind(...params).all();
  return successResponse(result.results);
}

export async function handleCreateSearchEngine(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  if (!body.name || !body.url || !body.param) return errorResponse('name, url, param are required', 400);

  const result = await env.DB.prepare(
    `INSERT INTO search_engines (name, url, param, icon_url, color, sort_order, is_site_search, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.name,
    body.url,
    body.param,
    body.icon_url || null,
    body.color || '#3b82f6',
    body.sort_order || 0,
    body.is_site_search ? 1 : 0,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
  ).run();

  if (!result.success) return errorResponse('Failed to create search engine', 500);

  const engine = await env.DB.prepare('SELECT * FROM search_engines ORDER BY created_at DESC LIMIT 1').first();
  return successResponse(engine, 201);
}

export async function handleUpdateSearchEngine(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.url) { updates.push('url = ?'); values.push(body.url); }
  if (body.param) { updates.push('param = ?'); values.push(body.param); }
  if (body.icon_url !== undefined) { updates.push('icon_url = ?'); values.push(body.icon_url); }
  if (body.color) { updates.push('color = ?'); values.push(body.color); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }
  if (body.is_site_search !== undefined) { updates.push('is_site_search = ?'); values.push(body.is_site_search ? 1 : 0); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await env.DB.prepare(`UPDATE search_engines SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const engine = await env.DB.prepare('SELECT * FROM search_engines WHERE id = ?').bind(id).first();
  return successResponse(engine);
}

export async function handleDeleteSearchEngine(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const result = await env.DB.prepare('DELETE FROM search_engines WHERE id = ?').bind(id).run();
  if (!result.success) return errorResponse('Failed to delete search engine', 500);
  return successResponse({ message: 'Search engine deleted' });
}
