// Tags API handlers
import { getUserId } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

interface Env { DB: D1Database; }

export async function handleListTags(request: Request, env: any): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)
   const url = new URL(request.url)
   const type = url.searchParams.get('type') || 'bookmark'

   const tags = await env.DB.prepare(
     'SELECT * FROM tags WHERE user_id = ? AND type = ? ORDER BY name ASC'
   ).bind(userId, type).all()
   return successResponse(tags.results)
 }

 export async function handleCreateTag(request: Request, env: any): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)

   const body = await request.json() as { name: string; color?: string; type?: string }
   if (!body.name) return errorResponse('Name is required', 400)

   const type = body.type || 'bookmark'
   const color = body.color || '#6b7280'

   try {
     const result = await env.DB.prepare(
       'INSERT INTO tags (user_id, name, type, color) VALUES (?, ?, ?, ?)'
     ).bind(userId, body.name, type, color).run()

     if (!result.success) return errorResponse('Failed to create tag', 500)

     const tag = await env.DB.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first()
     return successResponse(tag, 201)
   } catch (e) {
     return errorResponse('Tag already exists', 409)
   }
 }

 export async function handleDeleteTag(request: Request, env: any, id: string): Promise<Response> {
   const userId = await getUserId(request, env)
   if (!userId) return errorResponse('Unauthorized', 401)

   const result = await env.DB.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').bind(id, userId).run()
   if (!result.success) return errorResponse('Failed to delete tag', 500)
   return successResponse({ message: 'Tag deleted' })
 }
