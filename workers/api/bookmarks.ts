// Bookmarks API handlers
import { getUserId } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

interface Env { DB: D1Database; }

export async function handleListBookmarks(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  
  // 支持公共书签查询（无需登录）
  const url = new URL(request.url);
  const isPublic = url.searchParams.get('public') === '1';
  
  if (isPublic) {
    const bookmarks = await env.DB.prepare(
      'SELECT * FROM bookmarks WHERE is_public = 1 AND archived = 0 ORDER BY created_at DESC'
    ).all();
    return successResponse(bookmarks.results);
  }
  
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const bookmarks = await env.DB.prepare(
    'SELECT * FROM bookmarks WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC'
  ).bind(userId).all();
  return successResponse(bookmarks.results);
}

export async function handleCreateBookmark(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const body = await request.json() as {
    title: string; url: string; description?: string; icon_url?: string;
    category_id?: string; tags?: string[];
  };
  
  if (!body.title || !body.url) return errorResponse('Title and URL are required', 400);
  if (!/^https?:\/\//i.test(body.url)) return errorResponse('Invalid URL format', 400);
  
  const result = await env.DB.prepare(
    'INSERT INTO bookmarks (user_id, title, url, description, icon_url, category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, body.title, body.url, body.description || null, body.icon_url || null, body.category_id || null, JSON.stringify(body.tags || [])).run();
  
  if (!result.success) return errorResponse('Failed to create bookmark', 500);
  
  const bookmark = await env.DB.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first();
  return successResponse(bookmark, 201);
}

export async function handleGetBookmark(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const bookmark = await env.DB.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_id = ?').bind(id, userId).first();
  if (!bookmark) return errorResponse('Bookmark not found', 404);
  return successResponse(bookmark);
}

export async function handleUpdateBookmark(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const body = await request.json() as any;
  const updates: string[] = []; const values: any[] = [];
  
  if (body.title) { updates.push('title = ?'); values.push(body.title); }
  if (body.url) { updates.push('url = ?'); values.push(body.url); }
  if (body.description) { updates.push('description = ?'); values.push(body.description); }
  if (body.icon_url) { updates.push('icon_url = ?'); values.push(body.icon_url); }
  if (body.category_id) { updates.push('category_id = ?'); values.push(body.category_id); }
  if (body.tags) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
  if (body.is_favorite !== undefined) { updates.push('is_favorite = ?'); values.push(body.is_favorite); }
  if (body.archived !== undefined) { updates.push('archived = ?'); values.push(body.archived); }
  
  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, userId);
  
  await env.DB.prepare(`UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();
  
  const bookmark = await env.DB.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_id = ?').bind(id, userId).first();
  return successResponse(bookmark);
}

export async function handleDeleteBookmark(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const result = await env.DB.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').bind(id, userId).run();
  if (!result.success) return errorResponse('Failed to delete bookmark', 500);
  return successResponse({ message: 'Bookmark deleted' });
}

export async function handleSearchBookmarks(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const userId = await getUserId(request, env);
  
  if (!q) return successResponse([]);
  
  const bookmarks = await env.DB.prepare(
    `SELECT * FROM bookmarks 
     WHERE (is_public = 1 OR user_id = ?) 
     AND archived = 0 
     AND (title LIKE ? OR url LIKE ? OR description LIKE ?)
     ORDER BY created_at DESC`
  ).bind(userId || '', `%${q}%`, `%${q}%`, `%${q}%`).all();
  
  return successResponse(bookmarks.results);
}
