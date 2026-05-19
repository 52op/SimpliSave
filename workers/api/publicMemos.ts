import { successResponse, errorResponse } from '../utils/response';

export async function handleListPublicMemosByUser(request: Request, env: any, userId: string): Promise<Response> {
  const memos = await env.DB.prepare(
    `SELECT id, title, content, color, tags, created_at, updated_at
     FROM memos WHERE user_id = ? AND is_public = 1 AND archived = 0
     ORDER BY created_at DESC LIMIT 50`
  ).bind(userId).all();
  return successResponse(memos.results);
}

export async function handleGetPublicMemo(request: Request, env: any, id: string): Promise<Response> {
  const memo = await env.DB.prepare(
    'SELECT id, user_id, title, content, color, cover_image, category_id, tags, is_public, archived, created_at, updated_at FROM memos WHERE id = ? AND is_public = 1 AND archived = 0'
  ).bind(id).first();
  if (!memo) return errorResponse('Memo not found or not public', 404);
  return successResponse(memo);
}

export async function handleVerifyPublicMemoPassword(request: Request, env: any, id: string): Promise<Response> {
  const { password } = await request.json() as { password: string };
  if (!password) return errorResponse('Password is required', 400);

  const memo = await env.DB.prepare('SELECT share_password FROM memos WHERE id = ? AND is_public = 1').bind(id).first();
  if (!memo) return errorResponse('Memo not found', 404);

  if (!memo.share_password) return successResponse({ verified: true });
  if (password !== memo.share_password) return errorResponse('Incorrect password', 403);
  return successResponse({ verified: true });
}
