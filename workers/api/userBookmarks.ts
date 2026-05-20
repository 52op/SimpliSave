// User bookmarks API handlers
import { verifyJWT } from '../utils/jwt';
import { successResponse, errorResponse, corsHeaders } from '../utils/response';

async function getUserId(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  return payload?.userId || null;
}

// 私人收藏夹列表
export async function handleListUserBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  const q = url.searchParams.get('q');
  const favorites = url.searchParams.get('favorites') === '1';
  const archived = url.searchParams.get('archived') === '1';

  let sql = 'SELECT * FROM user_bookmarks WHERE user_id = ? AND archived = ?';
  const params: any[] = [userId, archived ? 1 : 0];

  if (categoryId) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }
  if (favorites) {
    sql += ' AND is_favorite = 1';
  }
  if (q) {
    sql += ' AND (title LIKE ? OR url LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  sql += ' ORDER BY is_favorite DESC, created_at DESC';
  const result = await env.DB.prepare(sql).bind(...params).all();
  return successResponse(result.results);
}

// 创建私人收藏
export async function handleCreateUserBookmark(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  if (!body.title || !body.url) return errorResponse('Title and URL are required', 400);
  if (!/^https?:\/\//i.test(body.url)) return errorResponse('Invalid URL format', 400);

  const result = await env.DB.prepare(
    'INSERT INTO user_bookmarks (user_id, title, url, description, icon_url, category_id, tags, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    userId,
    body.title,
    body.url,
    body.description || null,
    body.icon_url || null,
    body.category_id || null,
    JSON.stringify(body.tags || []),
    body.is_favorite || 0
  ).run();

  if (!result.success) return errorResponse('Failed to create user bookmark', 500);

  const bookmark = await env.DB.prepare('SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first();
  return successResponse(bookmark, 201);
}

// 获取单个私人收藏
export async function handleGetUserBookmark(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const bookmark = await env.DB.prepare('SELECT * FROM user_bookmarks WHERE id = ? AND user_id = ?').bind(id, userId).first();
  if (!bookmark) return errorResponse('User bookmark not found', 404);
  return successResponse(bookmark);
}

// 更新私人收藏
export async function handleUpdateUserBookmark(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.title) { updates.push('title = ?'); values.push(body.title); }
  if (body.url) { updates.push('url = ?'); values.push(body.url); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.icon_url !== undefined) { updates.push('icon_url = ?'); values.push(body.icon_url); }
  if (body.category_id !== undefined) { updates.push('category_id = ?'); values.push(body.category_id); }
  if (body.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
  if (body.is_favorite !== undefined) { updates.push('is_favorite = ?'); values.push(body.is_favorite); }
  if (body.archived !== undefined) { updates.push('archived = ?'); values.push(body.archived); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, userId);

  await env.DB.prepare(`UPDATE user_bookmarks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();

  const bookmark = await env.DB.prepare('SELECT * FROM user_bookmarks WHERE id = ? AND user_id = ?').bind(id, userId).first();
  return successResponse(bookmark);
}

// 删除私人收藏
export async function handleDeleteUserBookmark(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const result = await env.DB.prepare('DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?').bind(id, userId).run();
  if (!result.success) return errorResponse('Failed to delete user bookmark', 500);
  return successResponse({ message: 'User bookmark deleted' });
}

// 批量移动书签到指定分类
export async function handleBatchMoveUserBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as { ids: string[]; target_category_id: string | null };
  if (!body.ids || body.ids.length === 0) return errorResponse('No bookmark IDs provided', 400);

  const stmt = env.DB.prepare('UPDATE user_bookmarks SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
  let moved = 0;
  for (const id of body.ids) {
    const r = await stmt.bind(body.target_category_id, id, userId).run();
    if (r.success) moved++;
  }
  return successResponse({ moved, total: body.ids.length });
}

// 导出私人收藏为 JSON
export async function handleExportUserBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const bookmarks = await env.DB.prepare('SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
  const categories = await env.DB.prepare('SELECT * FROM user_categories WHERE user_id = ? ORDER BY sort_order ASC').bind(userId).all();

  return new Response(JSON.stringify({
    bookmarks: bookmarks.results,
    categories: categories.results,
    exported_at: new Date().toISOString(),
    format: 'simplisave-bookmarks-v1'
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="simplisave-bookmarks-${Date.now()}.json"`,
      ...corsHeaders(),
    }
  });
}
