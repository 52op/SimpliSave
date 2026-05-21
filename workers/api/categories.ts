// Categories API handlers (public + user)
import { getUserId, getUserRole } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

// 用户私有分类
export async function handleListUserCategories(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const categories = await env.DB.prepare(
    'SELECT * FROM user_categories WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC'
  ).bind(userId).all();
  return successResponse(categories.results.map((item: any) => ({
    ...item,
    type: item.type || 'bookmark',
  })));
}

export async function handleCreateUserCategory(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  if (!body.name) return errorResponse('Name is required', 400);

  const id = crypto.randomUUID();
  const sortOrder = body.sort_order ?? 0;
  const type = body.type === 'memo' ? 'memo' : 'bookmark';
  const parentId = body.parent_id || null;
  const result = await env.DB.prepare(
    'INSERT INTO user_categories (id, user_id, name, icon, color, sort_order, type, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, body.name, body.icon || null, body.color || '#3b82f6', sortOrder, type, parentId).run();

  if (!result.success) return errorResponse('Failed to create user category', 500);

  return successResponse({ id, user_id: userId, name: body.name, icon: body.icon || null, color: body.color || '#3b82f6', sort_order: sortOrder, type, parent_id: parentId, created_at: new Date().toISOString() }, 201);
}

export async function handleUpdateUserCategory(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.icon !== undefined) { updates.push('icon = ?'); values.push(body.icon); }
  if (body.color) { updates.push('color = ?'); values.push(body.color); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }
  if (body.type === 'bookmark' || body.type === 'memo') { updates.push('type = ?'); values.push(body.type); }
  if (body.parent_id !== undefined) { updates.push('parent_id = ?'); values.push(body.parent_id || null); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, userId);

  await env.DB.prepare(`UPDATE user_categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();

  const category = await env.DB.prepare('SELECT * FROM user_categories WHERE id = ? AND user_id = ?').bind(id, userId).first();
  return successResponse(category);
}

export async function handleDeleteUserCategory(request: Request, env: any, id: string): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const result = await env.DB.prepare('DELETE FROM user_categories WHERE id = ? AND user_id = ?').bind(id, userId).run();
  if (!result.success) return errorResponse('Failed to delete user category', 500);
  return successResponse({ message: 'User category deleted' });
}

// 管理员公开分类
export async function handleListPublicCategories(request: Request, env: any): Promise<Response> {
  const categories = await env.DB.prepare(
    'SELECT * FROM public_categories ORDER BY sort_order ASC, created_at DESC'
  ).all();
  return successResponse(categories.results);
}

export async function handleCreatePublicCategory(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  const userId = await getUserId(request, env);
  if (role !== 'admin' || !userId) return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  if (!body.name) return errorResponse('Name is required', 400);

  const result = await env.DB.prepare(
    'INSERT INTO public_categories (name, icon, color, sort_order, created_by) VALUES (?, ?, ?, ?, ?)'
  ).bind(body.name, body.icon || null, body.color || '#3b82f6', body.sort_order || 0, userId).run();

  if (!result.success) return errorResponse('Failed to create public category', 500);

  const category = await env.DB.prepare('SELECT * FROM public_categories ORDER BY created_at DESC LIMIT 1').first();
  return successResponse(category, 201);
}

export async function handleUpdatePublicCategory(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.icon !== undefined) { updates.push('icon = ?'); values.push(body.icon); }
  if (body.color) { updates.push('color = ?'); values.push(body.color); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await env.DB.prepare(`UPDATE public_categories SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const category = await env.DB.prepare('SELECT * FROM public_categories WHERE id = ?').bind(id).first();
  return successResponse(category);
}

export async function handleDeletePublicCategory(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const result = await env.DB.prepare('DELETE FROM public_categories WHERE id = ?').bind(id).run();
  if (!result.success) return errorResponse('Failed to delete public category', 500);
  return successResponse({ message: 'Public category deleted' });
}
