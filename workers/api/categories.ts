// Categories API handlers
import { verifyJWT } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';

interface Env { DB: D1Database; }

async function getUserId(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  return payload?.userId || null;
}

export async function handleListCategories(request: Request, env: any): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)
   const url = new URL(request.url)
   const type = url.searchParams.get('type') || 'bookmark'

   const categories = await env.DB.prepare(
     'SELECT * FROM categories WHERE user_id = ? AND type = ? ORDER BY sort_order ASC'
   ).bind(userId, type).all()
   return successResponse(categories.results)
 }

 export async function handleCreateCategory(request: Request, env: any): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)

   const body = await request.json() as { name: string; icon?: string; color?: string; type?: string; sort_order?: number }
   if (!body.name) return errorResponse('Name is required', 400)

   const type = body.type || 'bookmark'
   const result = await env.DB.prepare(
     'INSERT INTO categories (user_id, name, icon, color, sort_order, type) VALUES (?, ?, ?, ?, ?, ?)'
   ).bind(userId, body.name, body.icon || null, body.color || '#3b82f6', body.sort_order || 0, type).run()

   if (!result.success) return errorResponse('Failed to create category', 500)

   const category = await env.DB.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first()
   return successResponse(category, 201)
 }

 export async function handleUpdateCategory(request: Request, env: any, id: string): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)

   const body = await request.json() as any
   const updates: string[] = []; const values: any[] = []

   if (body.name) { updates.push('name = ?'); values.push(body.name) }
   if (body.icon) { updates.push('icon = ?'); values.push(body.icon) }
   if (body.color) { updates.push('color = ?'); values.push(body.color) }
   if (body.sort_order) { updates.push('sort_order = ?'); values.push(body.sort_order) }

   if (updates.length === 0) return errorResponse('No fields to update', 400)
   values.push(id, userId)

   await env.DB.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run()

   const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').bind(id, userId).first()
   return successResponse(category)
 }

 export async function handleDeleteCategory(request: Request, env: any, id: string): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)

   const result = await env.DB.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').bind(id, userId).run()
   if (!result.success) return errorResponse('Failed to delete category', 500)
   return successResponse({ message: 'Category deleted' })
 }
