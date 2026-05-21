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
  // 查询该用户提交被通过后创建的公开卡片组，及其下的链接
  const groups = await env.DB.prepare(
    `SELECT pcg.*, pc.name as category_name
     FROM bookmark_submissions bs
     JOIN public_card_groups pcg ON bs.approved_public_group_id = pcg.id
     LEFT JOIN public_categories pc ON pcg.category_id = pc.id
     WHERE bs.user_id = ? AND bs.status = 'approved' AND pcg.status = 'active'
     GROUP BY pcg.id
     ORDER BY bs.created_at DESC`
  ).bind(id).all();

  const result = [];
  for (const group of (groups.results as any[])) {
    const bookmarks = await env.DB.prepare(
      `SELECT * FROM public_bookmarks WHERE group_id = ? AND status = 'active' ORDER BY sort_order ASC`
    ).bind(group.id).all();
    result.push({ ...group, bookmarks: bookmarks.results });
  }

  return successResponse(result);
}
