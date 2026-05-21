// Public bookmarks API handlers
import { getUserId, getUserRole, getAuthPayload } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

// 公开导航列表（首页使用，无需登录）
export async function handleListPublicBookmarks(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  const groupId = url.searchParams.get('group_id');
  const q = url.searchParams.get('q');

  let sql = `SELECT pb.*, pc.name as category_name, pc.color as category_color, pcg.title as group_title
             FROM public_bookmarks pb
             LEFT JOIN public_categories pc ON pb.category_id = pc.id
             LEFT JOIN public_card_groups pcg ON pb.group_id = pcg.id
             WHERE pb.status = 'active'`;
  const params: any[] = [];

  if (categoryId) {
    sql += ' AND pb.category_id = ?';
    params.push(categoryId);
  }
  if (groupId) {
    sql += ' AND pb.group_id = ?';
    params.push(groupId);
  }
  if (q) {
    sql += ' AND (pb.title LIKE ? OR pb.url LIKE ? OR pb.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  sql += ' ORDER BY pb.sort_order ASC, pb.created_at DESC';

  const result = await env.DB.prepare(sql).bind(...params).all();
  return successResponse(result.results);
}

// 管理员：创建公开导航
export async function handleCreatePublicBookmark(request: Request, env: any): Promise<Response> {
  const auth = await getAuthPayload(request, env);
  if (!auth || auth.role !== 'admin') return errorResponse('Admin only', 403);
  const userId = auth.userId;

  const body = await request.json() as any;
  if (!body.title || !body.url) return errorResponse('Title and URL are required', 400);
  if (!/^https?:\/\//i.test(body.url)) return errorResponse('Invalid URL format', 400);

  const result = await env.DB.prepare(
    'INSERT INTO public_bookmarks (title, url, description, icon_url, category_id, tags, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    body.title,
    body.url,
    body.description || null,
    body.icon_url || null,
    body.category_id || null,
    JSON.stringify(body.tags || []),
    body.sort_order || 0,
    userId
  ).run();

  if (!result.success) return errorResponse('Failed to create public bookmark', 500);

  const bookmark = await env.DB.prepare('SELECT * FROM public_bookmarks ORDER BY created_at DESC LIMIT 1').first();
  return successResponse(bookmark, 201);
}

// 管理员：获取单个公开导航
export async function handleGetPublicBookmark(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const bookmark = await env.DB.prepare('SELECT * FROM public_bookmarks WHERE id = ?').bind(id).first();
  if (!bookmark) return errorResponse('Public bookmark not found', 404);
  return successResponse(bookmark);
}

// 管理员：更新公开导航
export async function handleUpdatePublicBookmark(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.title) { updates.push('title = ?'); values.push(body.title); }
  if (body.url) { updates.push('url = ?'); values.push(body.url); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.icon_url !== undefined) { updates.push('icon_url = ?'); values.push(body.icon_url); }
  if (body.category_id !== undefined) { updates.push('category_id = ?'); values.push(body.category_id); }
  if (body.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }
  if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await env.DB.prepare(`UPDATE public_bookmarks SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const bookmark = await env.DB.prepare('SELECT * FROM public_bookmarks WHERE id = ?').bind(id).first();
  return successResponse(bookmark);
}

// 管理员：删除公开导航
export async function handleDeletePublicBookmark(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const result = await env.DB.prepare('DELETE FROM public_bookmarks WHERE id = ?').bind(id).run();
  if (!result.success) return errorResponse('Failed to delete public bookmark', 500);
  return successResponse({ message: 'Public bookmark deleted' });
}
