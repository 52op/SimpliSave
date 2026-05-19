import { successResponse, errorResponse } from '../utils/response';

export async function handleGetPublicUser(request: Request, env: any, id: string): Promise<Response> {
  const user = await env.DB.prepare(
    `SELECT id, name, avatar_url, bio, website, github, twitter, weibo,
            show_bio, show_website, show_github, show_twitter, show_weibo, created_at
     FROM users WHERE id = ?`
  ).bind(id).first();
  if (!user) return errorResponse('User not found', 404);
  return successResponse(user);
}
