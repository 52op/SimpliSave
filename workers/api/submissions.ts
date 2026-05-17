// Bookmark submissions API handlers
import { verifyJWT } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';

async function getUserId(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  return payload?.userId || null;
}

async function getUserRole(request: Request, env: any): Promise<string | null> {
  const userId = await getUserId(request, env);
  if (!userId) return null;
  const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first();
  return user?.role || 'user';
}

// 用户提交公开分享申请
export async function handleCreateSubmission(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  if (!body.url || !body.title) return errorResponse('URL and title are required', 400);

  const result = await env.DB.prepare(
    'INSERT INTO bookmark_submissions (user_id, user_bookmark_id, title, url, description, icon_url, suggested_category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    userId,
    body.user_bookmark_id || null,
    body.title,
    body.url,
    body.description || null,
    body.icon_url || null,
    body.suggested_category_id || null,
    JSON.stringify(body.tags || [])
  ).run();

  if (!result.success) return errorResponse('Failed to create submission', 500);

  const submission = await env.DB.prepare('SELECT * FROM bookmark_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first();
  return successResponse(submission, 201);
}

// 管理员查看申请列表
export async function handleListSubmissions(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const submissions = await env.DB.prepare(
    `SELECT bs.*, u.name as user_name, u.email as user_email, pc.name as suggested_category_name
     FROM bookmark_submissions bs
     LEFT JOIN users u ON bs.user_id = u.id
     LEFT JOIN public_categories pc ON bs.suggested_category_id = pc.id
     WHERE bs.status = ?
     ORDER BY bs.created_at DESC`
  ).bind(status).all();

  return successResponse(submissions.results);
}

// 管理员通过审核 → 创建公开导航
export async function handleApproveSubmission(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  const adminId = await getUserId(request, env);
  if (role !== 'admin' || !adminId) return errorResponse('Admin only', 403);

  const submission = await env.DB.prepare('SELECT * FROM bookmark_submissions WHERE id = ?').bind(id).first();
  if (!submission) return errorResponse('Submission not found', 404);

  const publicResult = await env.DB.prepare(
    'INSERT INTO public_bookmarks (title, url, description, icon_url, category_id, tags, status, source_submission_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    submission.title,
    submission.url,
    submission.description,
    submission.icon_url,
    submission.suggested_category_id,
    submission.tags,
    'active',
    submission.id,
    adminId
  ).run();

  if (!publicResult.success) return errorResponse('Failed to create public bookmark', 500);

  const publicBookmark = await env.DB.prepare('SELECT id FROM public_bookmarks WHERE source_submission_id = ? ORDER BY created_at DESC LIMIT 1').bind(id).first();

  await env.DB.prepare(
    'UPDATE bookmark_submissions SET status = ?, approved_public_bookmark_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('approved', publicBookmark?.id || null, id).run();

  return successResponse({ message: 'Submission approved', public_bookmark_id: publicBookmark?.id });
}

// 管理员拒绝审核
export async function handleRejectSubmission(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json().catch(() => ({})) as { admin_note?: string };

  await env.DB.prepare(
    'UPDATE bookmark_submissions SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('rejected', body.admin_note || null, id).run();

  return successResponse({ message: 'Submission rejected' });
}
