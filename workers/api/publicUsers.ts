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

export async function handleListPublicBookmarksByUser(request: Request, env: any, id: string): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT pb.id, pb.title, pb.url, pb.description, pb.icon_url, pb.tags,
            pcg.id as group_id, pcg.title as group_title, pcg.slug as group_slug, pcg.icon_url as group_icon_url,
            bs.created_at as submitted_at
     FROM bookmark_submissions bs
     JOIN public_card_groups pcg ON bs.approved_public_group_id = pcg.id
     JOIN public_bookmarks pb ON pb.url = bs.url AND pb.group_id = pcg.id
     WHERE bs.user_id = ? AND bs.status = 'approved' AND pcg.status = 'active' AND pb.status = 'active'
     ORDER BY bs.created_at DESC
     LIMIT 100`
  ).bind(id).all();

  return successResponse(rows.results);
}
