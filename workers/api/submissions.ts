// Submissions API handlers
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

// 用户提交链接
export async function handleSubmitLink(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as { url: string; title: string; description?: string; icon_url?: string };
  if (!body.url || !body.title) return errorResponse('URL and title are required', 400);

  const result = await env.DB.prepare(
    'INSERT INTO submissions (user_id, url, title, description, icon_url) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, body.url, body.title, body.description || null, body.icon_url || null).run();

  if (!result.success) return errorResponse('Failed to submit link', 500);

  const submission = await env.DB.prepare('SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first();
  return successResponse(submission, 201);
}

// 管理员获取待审核列表
export async function handleListSubmissions(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const submissions = await env.DB.prepare(
    'SELECT s.*, u.name as user_name, u.email as user_email FROM submissions s LEFT JOIN users u ON s.user_id = u.id WHERE s.status = ? ORDER BY s.created_at DESC'
  ).bind(status).all();
  return successResponse(submissions.results);
}

// 管理员通过审核（转为书签）
export async function handleApproveSubmission(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const id = new URL(request.url).pathname.match(/\/submissions\/([^\/]+)\/approve/)?.[1];
  if (!id) return errorResponse('Missing id', 400);

  const submission = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  if (!submission) return errorResponse('Submission not found', 404);

  // 创建书签
  const bookmarkResult = await env.DB.prepare(
    'INSERT INTO bookmarks (user_id, title, url, description, icon_url, is_public) VALUES (?, ?, ?, ?, ?, 1)'
  ).bind(submission.user_id, submission.title, submission.url, submission.description, submission.icon_url).run();

  if (!bookmarkResult.success) return errorResponse('Failed to create bookmark', 500);

  // 更新提交状态
  await env.DB.prepare(
    'UPDATE submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('approved', id).run();

  return successResponse({ message: 'Submission approved and bookmark created' });
}

// 管理员拒绝审核
export async function handleRejectSubmission(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const id = new URL(request.url).pathname.match(/\/submissions\/([^\/]+)\/reject/)?.[1];
  if (!id) return errorResponse('Missing id', 400);

  const body = await request.json().catch(() => ({})) as { admin_note?: string };

  await env.DB.prepare(
    'UPDATE submissions SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('rejected', body.admin_note || null, id).run();

  return successResponse({ message: 'Submission rejected' });
}
