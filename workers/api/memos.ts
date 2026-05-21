// Memos API handlers
import { getUserId } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

interface Env { DB: D1Database; }

export async function handleListMemos(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  const q = url.searchParams.get('q');
  const pinnedOnly = url.searchParams.get('pinned') === '1';
  const archived = url.searchParams.get('archived') === '1';

  let sql = 'SELECT * FROM memos WHERE user_id = ? AND archived = ?';
  const params: any[] = [userId, archived ? 1 : 0];

  if (categoryId) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }
  if (pinnedOnly) {
    sql += ' AND is_pinned = 1';
  }
  if (q) {
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += ' ORDER BY is_pinned DESC, created_at DESC';
  const memos = await env.DB.prepare(sql).bind(...params).all();
  return successResponse(memos.results);
}

export async function handleCreateMemo(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const body = await request.json() as {
    title: string; content?: string; color?: string; category_id?: string; tags?: string[];
    is_public?: number; share_password?: string; cover_image?: string;
  };

  if (!body.title) return errorResponse('Title is required', 400);

  const isPublic = body.is_public ? 1 : 0;
  const sharePassword = body.is_public ? (body.share_password || null) : null;

  const result = await env.DB.prepare(
    'INSERT INTO memos (user_id, title, content, color, cover_image, category_id, tags, is_public, share_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, body.title, body.content || '', body.color || '#ffffff', body.cover_image || null, body.category_id || null, JSON.stringify(body.tags || []), isPublic, sharePassword).run();
  
  if (!result.success) return errorResponse('Failed to create memo', 500);
  
  const memo = await env.DB.prepare('SELECT * FROM memos WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first();
  return successResponse(memo, 201);
}

export async function handleGetMemo(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const memo = await env.DB.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ?').bind(id, userId).first();
  if (!memo) return errorResponse('Memo not found', 404);
  return successResponse(memo);
}

export async function handleUpdateMemo(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const body = await request.json() as any;
  const updates: string[] = []; const values: any[] = [];
  
  if (body.title) { updates.push('title = ?'); values.push(body.title); }
  if (body.content !== undefined) { updates.push('content = ?'); values.push(body.content); }
  if (body.color) { updates.push('color = ?'); values.push(body.color); }
  if (body.cover_image !== undefined) { updates.push('cover_image = ?'); values.push(body.cover_image || null); }
  if (body.category_id !== undefined) { updates.push('category_id = ?'); values.push(body.category_id || null); }
  if (body.tags) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
  if (body.is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(body.is_pinned); }
  if (body.is_public !== undefined) { updates.push('is_public = ?'); values.push(body.is_public ? 1 : 0); }
  if (body.share_password !== undefined) { updates.push('share_password = ?'); values.push(body.share_password || null); }
  if (body.archived !== undefined) { updates.push('archived = ?'); values.push(body.archived); }
  
  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, userId);
  
  await env.DB.prepare(`UPDATE memos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();
  
  const memo = await env.DB.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ?').bind(id, userId).first();
  return successResponse(memo);
}

export async function handleDeleteMemo(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const result = await env.DB.prepare('DELETE FROM memos WHERE id = ? AND user_id = ?').bind(id, userId).run();
  if (!result.success) return errorResponse('Failed to delete memo', 500);
  return successResponse({ message: 'Memo deleted' });
}

export async function handlePinMemo(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);
  
  const memo = await env.DB.prepare('SELECT is_pinned FROM memos WHERE id = ? AND user_id = ?').bind(id, userId).first();
  if (!memo) return errorResponse('Memo not found', 404);
  
  const newPinned = memo.is_pinned ? 0 : 1;
  await env.DB.prepare('UPDATE memos SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(newPinned, id, userId).run();
  return successResponse({ is_pinned: newPinned });
}
