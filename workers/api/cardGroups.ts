import { getUserRole } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { generateSlug } from '../utils/slug';

export async function handleListCardGroups(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  const status = url.searchParams.get('status') || 'active';

  let sql = `SELECT pcg.*, pc.name as category_name, pc.color as category_color
             FROM public_card_groups pcg
             LEFT JOIN public_categories pc ON pcg.category_id = pc.id
             WHERE pcg.status = ?`;
  const params: any[] = [status];

  if (categoryId) {
    sql += ' AND pcg.category_id = ?';
    params.push(categoryId);
  }

  sql += ' ORDER BY pcg.sort_order ASC, pcg.created_at DESC';

  const result = await env.DB.prepare(sql).bind(...params).all();
  return successResponse(result.results);
}

export async function handleGetCardGroupBySlug(request: Request, env: any, slug: string): Promise<Response> {
  const group = await env.DB.prepare(
    `SELECT pcg.*, pc.name as category_name, pc.color as category_color
     FROM public_card_groups pcg
     LEFT JOIN public_categories pc ON pcg.category_id = pc.id
     WHERE pcg.slug = ?`
  ).bind(slug).first();

  if (!group) return errorResponse('Card group not found', 404);

  const bookmarks = await env.DB.prepare(
    `SELECT * FROM public_bookmarks WHERE group_id = ? ORDER BY sort_order ASC`
  ).bind(group.id).all();

  return successResponse({ ...group, bookmarks: bookmarks.results });
}

export async function handleCreateCardGroup(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  if (!body.title) return errorResponse('Title is required', 400);

  let slug = generateSlug(body.title);

  const existing = await env.DB.prepare('SELECT id FROM public_card_groups WHERE slug = ?').bind(slug).first();
  if (existing) {
    slug = slug + '-' + Math.random().toString(36).substring(2, 8);
  }

  const result = await env.DB.prepare(
    `INSERT INTO public_card_groups (title, description, slug, category_id, cover_url, status, sort_order, is_featured, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    body.description || null,
    slug,
    body.category_id || null,
    body.cover_url || null,
    body.status || 'active',
    body.sort_order || 0,
    body.is_featured ? 1 : 0,
    null
  ).run();

  if (!result.success) return errorResponse('Failed to create card group', 500);

  const group = await env.DB.prepare('SELECT * FROM public_card_groups ORDER BY created_at DESC LIMIT 1').first();
  return successResponse(group, 201);
}

export async function handleUpdateCardGroup(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.title) {
    updates.push('title = ?');
    values.push(body.title);
    let slug = generateSlug(body.title);
    const existing = await env.DB.prepare('SELECT id FROM public_card_groups WHERE slug = ? AND id != ?').bind(slug, id).first();
    if (existing) {
      slug = slug + '-' + Math.random().toString(36).substring(2, 8);
    }
    updates.push('slug = ?');
    values.push(slug);
  }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.category_id !== undefined) { updates.push('category_id = ?'); values.push(body.category_id); }
  if (body.icon_url !== undefined) { updates.push('icon_url = ?'); values.push(body.icon_url); }
  if (body.cover_url !== undefined) { updates.push('icon_url = ?'); values.push(body.cover_url); }
  if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }
  if (body.is_featured !== undefined) { updates.push('is_featured = ?'); values.push(body.is_featured ? 1 : 0); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await env.DB.prepare(`UPDATE public_card_groups SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const group = await env.DB.prepare('SELECT * FROM public_card_groups WHERE id = ?').bind(id).first();
  return successResponse(group);
}

export async function handleDeleteCardGroup(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const result = await env.DB.prepare('DELETE FROM public_card_groups WHERE id = ?').bind(id).run();
  if (!result.success) return errorResponse('Failed to delete card group', 500);
  return successResponse({ message: 'Card group deleted' });
}

export async function handleVisitCardGroup(request: Request, env: any, id: string): Promise<Response> {
  await env.DB.prepare('UPDATE public_card_groups SET visit_count = COALESCE(visit_count, 0) + 1 WHERE id = ?').bind(id).run();
  return successResponse({ message: 'Visit recorded' });
}
