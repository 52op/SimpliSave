// Bookmark submissions API handlers
import { getUserId, getUserRole, getAuthPayload } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { generateSlug } from '../utils/slug';
import { getEmailConfig, sendEmail } from '../utils/email';
import { buildApprovalEmail, buildRejectionEmail } from '../utils/emailTemplates';

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
  const auth = await getAuthPayload(request, env);
  if (!auth || auth.role !== 'admin') return errorResponse('Admin only', 403);
  const adminId = auth.userId;

  const submission = await env.DB.prepare('SELECT * FROM bookmark_submissions WHERE id = ?').bind(id).first();
  if (!submission) return errorResponse('Submission not found', 404);

  const body = await request.json().catch(() => ({})) as any;
  let targetGroupId = body.target_group_id || null;
  let createdGroupId: string | null = null;

  if (!targetGroupId) {
    let slug = generateSlug(submission.title);
    const existing = await env.DB.prepare('SELECT id FROM public_card_groups WHERE slug = ?').bind(slug).first();
    if (existing) {
      slug = slug + '-' + Math.random().toString(36).substring(2, 8);
    }
    const groupResult = await env.DB.prepare(
      `INSERT INTO public_card_groups (title, description, slug, category_id, status, created_by)
       VALUES (?, ?, ?, ?, 'active', ?)`
    ).bind(submission.title, submission.description, slug, submission.suggested_category_id, adminId).run();

    if (groupResult.success) {
      const newGroup = await env.DB.prepare('SELECT id FROM public_card_groups ORDER BY created_at DESC LIMIT 1').first();
      targetGroupId = newGroup?.id || null;
      createdGroupId = newGroup?.id || null;
    }
  }

  const publicResult = await env.DB.prepare(
    'INSERT INTO public_bookmarks (title, url, description, icon_url, category_id, tags, status, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    submission.title,
    submission.url,
    submission.description,
    submission.icon_url,
    submission.suggested_category_id,
    submission.tags,
    'active',
    targetGroupId
  ).run();

  if (!publicResult.success) return errorResponse('Failed to create public bookmark', 500);

  await env.DB.prepare(
    'UPDATE bookmark_submissions SET status = ?, approved_public_group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('approved', targetGroupId, id).run();

  // 异步发送审核通过通知邮件
  notifyApproval(env, id, targetGroupId).catch(console.error);

  return successResponse({
    message: 'Submission approved',
    group_id: targetGroupId
  });
}

async function notifyApproval(env: any, submissionId: string, groupId: string | null) {
  const submission = await env.DB.prepare(
    'SELECT bs.*, u.name as user_name, u.email as user_email FROM bookmark_submissions bs LEFT JOIN users u ON bs.user_id = u.id WHERE bs.id = ?'
  ).bind(submissionId).first() as any;
  if (!submission?.user_email) return;

  const emailCfg = await getEmailConfig(env.DB);
  if (!emailCfg) return;

  const site = await env.DB.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>();
  const siteName = site?.site_name || 'SimpliSave';

  let publicLink = '';
  if (groupId) {
    const group = await env.DB.prepare('SELECT slug FROM public_card_groups WHERE id = ?').bind(groupId).first<{ slug: string }>();
    if (group?.slug) publicLink = `/nav/${group.slug}`;
  }

  const { subject, html } = buildApprovalEmail({
    name: submission.user_name || submission.user_email,
    title: submission.title,
    url: submission.url,
    publicLink,
    siteName,
  });
  await sendEmail({ to: submission.user_email, subject, html }, emailCfg);
}

// 管理员拒绝审核
export async function handleRejectSubmission(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json().catch(() => ({})) as { admin_note?: string };

  await env.DB.prepare(
    'UPDATE bookmark_submissions SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('rejected', body.admin_note || null, id).run();

  // 异步发送审核拒绝通知邮件
  notifyRejection(env, id, body.admin_note || '').catch(console.error);

  return successResponse({ message: 'Submission rejected' });
}

async function notifyRejection(env: any, submissionId: string, reason: string) {
  const submission = await env.DB.prepare(
    'SELECT bs.*, u.name as user_name, u.email as user_email FROM bookmark_submissions bs LEFT JOIN users u ON bs.user_id = u.id WHERE bs.id = ?'
  ).bind(submissionId).first() as any;
  if (!submission?.user_email) return;

  const emailCfg = await getEmailConfig(env.DB);
  if (!emailCfg) return;

  const site = await env.DB.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>();
  const siteName = site?.site_name || 'SimpliSave';

  const { subject, html } = buildRejectionEmail({
    name: submission.user_name || submission.user_email,
    title: submission.title,
    reason: reason || '不符合收录标准',
    siteName,
  });
  await sendEmail({ to: submission.user_email, subject, html }, emailCfg);
}
