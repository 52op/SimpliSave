// Auth API handlers
import { signJWT, hashPassword, verifyPassword } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { consumeCode } from '../utils/verifyCode';
import { getEmailConfig, sendEmail } from '../utils/email';
import { buildWelcomeEmail } from '../utils/emailTemplates';
import { getAuthPayload } from '../utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const USER_SELECT = 'SELECT id, email, name, avatar_url, bio, website, github, twitter, weibo, show_bio, show_website, show_github, show_twitter, show_weibo, role, created_at, updated_at FROM users WHERE id = ?'

export async function handleRegister(request: Request, env: any): Promise<Response> {
  const body = await request.json() as { email: string; username: string; password: string; code: string };
  const { email, username, password, code } = body;

  if (!email || !username || !password || !code) {
    return errorResponse('邮箱、用户名、密码和验证码均为必填项', 400);
  }
  if (password.length < 6) {
    return errorResponse('密码至少 6 位', 400);
  }

  // 校验验证码
  const codeResult = await consumeCode(env.DB, email, code, 'register');
  if (!codeResult.ok) return errorResponse(codeResult.error!, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return errorResponse('该邮箱已被注册', 409);
  }

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
  ).bind(email, username, passwordHash).run();

  if (!result.success) {
    return errorResponse('注册失败，请重试', 500);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, name, avatar_url, bio, website, github, twitter, weibo, show_bio, show_website, show_github, show_twitter, show_weibo, role, created_at FROM users WHERE email = ?'
  ).bind(email).first() as any;
  const token = await signJWT({ userId: user.id, email: user.email, role: 'user' }, env);

  // 异步发欢迎邮件（不阻塞响应）
  sendWelcomeEmail(env, user.name, email).catch(console.error);

  return successResponse({ user, token }, 201);
}

async function sendWelcomeEmail(env: any, name: string, email: string) {
  const emailCfg = await getEmailConfig(env.DB);
  if (!emailCfg) return;
  const site = await env.DB.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>();
  const siteName = site?.site_name || 'SimpliSave';
  const { subject, html } = buildWelcomeEmail({ name, siteName, siteUrl: 'https://example.com' });
  await sendEmail({ to: email, subject, html }, emailCfg);
}

export async function handleLogin(request: Request, env: any): Promise<Response> {
  const body = await request.json() as { email: string; password: string };
  const { email, password } = body;

  if (!email || !password) {
    return errorResponse('邮箱和密码为必填项', 400);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, name, avatar_url, bio, website, github, twitter, weibo, show_bio, show_website, show_github, show_twitter, show_weibo, role, password_hash, created_at FROM users WHERE email = ?'
  ).bind(email).first() as any;

  if (!user) {
    return errorResponse('邮箱或密码错误', 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return errorResponse('邮箱或密码错误', 401);
  }

  const token = await signJWT({ userId: user.id, email: user.email, role: user.role || 'user' }, env);
  return successResponse({
    user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, bio: user.bio, website: user.website, github: user.github, twitter: user.twitter, weibo: user.weibo, show_bio: user.show_bio, show_website: user.show_website, show_github: user.show_github, show_twitter: user.show_twitter, show_weibo: user.show_weibo, role: user.role, created_at: user.created_at },
    token,
  });
}

/** POST /api/auth/login-code — 验证码登录 */
export async function handleLoginWithCode(request: Request, env: any): Promise<Response> {
  const body = await request.json() as { email: string; code: string };
  const { email, code } = body;
  if (!email || !code) return errorResponse('邮箱和验证码为必填项', 400);

  const codeResult = await consumeCode(env.DB, email, code, 'login');
  if (!codeResult.ok) return errorResponse(codeResult.error!, 400);

  const user = await env.DB.prepare(
    'SELECT id, email, name, avatar_url, bio, website, github, twitter, weibo, show_bio, show_website, show_github, show_twitter, show_weibo, role, created_at FROM users WHERE email = ?'
  ).bind(email).first() as any;
  if (!user) return errorResponse('用户不存在', 404);

  const token = await signJWT({ userId: user.id, email: user.email, role: user.role || 'user' }, env);
  return successResponse({ user, token });
}

/** POST /api/auth/password/change — 修改密码 */
export async function handleChangePassword(request: Request, env: any): Promise<Response> {
  const payload = await getAuthPayload(request, env);
  if (!payload) return errorResponse('未登录', 401);

  const body = await request.json() as { old_password: string; new_password: string; confirm_password: string };
  const { old_password, new_password, confirm_password } = body;

  if (!old_password || !new_password || !confirm_password) return errorResponse('所有密码字段均为必填', 400);
  if (new_password !== confirm_password) return errorResponse('两次密码不一致', 400);
  if (new_password.length < 6) return errorResponse('新密码至少 6 位', 400);

  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(payload.userId).first<{ password_hash: string }>();
  if (!user) return errorResponse('用户不存在', 404);

  const valid = await verifyPassword(old_password, user.password_hash);
  if (!valid) return errorResponse('当前密码错误', 400);

  const newHash = await hashPassword(new_password);
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(newHash, payload.userId).run();

  return successResponse({ message: '密码已更新' });
}

/** POST /api/auth/email/request-change — 申请修改邮箱（发验证码到新邮箱） */
export async function handleRequestEmailChange(request: Request, env: any): Promise<Response> {
  const payload = await getAuthPayload(request, env);
  if (!payload) return errorResponse('未登录', 401);

  const body = await request.json() as { new_email: string };
  const { new_email } = body;
  if (!new_email) return errorResponse('请填写新邮箱', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) return errorResponse('邮箱格式不正确', 400);

  // 检查新邮箱是否已被占用
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(new_email).first();
  if (exists) return errorResponse('该邮箱已被其他账号使用', 409);

  // 引入工具函数（动态 import 避免循环依赖）
  const { checkSendCooldown, createCode } = await import('../utils/verifyCode');
  const cooldown = await checkSendCooldown(env.DB, new_email, 'change_email');
  if (!cooldown.ok) return errorResponse(cooldown.error!, 429);

  const code = await createCode(env.DB, new_email, 'change_email');

  const emailCfg = await getEmailConfig(env.DB);
  if (!emailCfg) return errorResponse('邮件服务未配置', 503);

  const { buildCodeEmail } = await import('../utils/emailTemplates');
  const site = await env.DB.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>();
  const siteName = site?.site_name || 'SimpliSave';
  const { subject, html } = buildCodeEmail({ code, purpose: 'change_email', siteName });

  try {
    await sendEmail({ to: new_email, subject, html }, emailCfg);
  } catch (e: any) {
    return errorResponse('邮件发送失败', 500);
  }

  return successResponse({ message: '验证码已发送至新邮箱', expires_in: 600 });
}

/** POST /api/auth/email/confirm-change — 确认修改邮箱 */
export async function handleConfirmEmailChange(request: Request, env: any): Promise<Response> {
  const payload = await getAuthPayload(request, env);
  if (!payload) return errorResponse('未登录', 401);

  const body = await request.json() as { new_email: string; code: string };
  const { new_email, code } = body;
  if (!new_email || !code) return errorResponse('新邮箱和验证码为必填项', 400);

  // 再次检查新邮箱未被占用
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(new_email, payload.userId).first();
  if (exists) return errorResponse('该邮箱已被其他账号使用', 409);

  const { consumeCode } = await import('../utils/verifyCode');
  const codeResult = await consumeCode(env.DB, new_email, code, 'change_email');
  if (!codeResult.ok) return errorResponse(codeResult.error!, 400);

  await env.DB.prepare('UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(new_email, payload.userId).run();

  return successResponse({ message: '邮箱已更新', new_email });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  return successResponse({ message: 'Logged out successfully' });
}

export async function handleGetMe(request: Request, env: any): Promise<Response> {
  const auth = await getAuthPayload(request, env);
  if (!auth) return errorResponse('Invalid or expired token', 401);

  const user = await env.DB.prepare(USER_SELECT).bind(auth.userId).first();
  if (!user) return errorResponse('User not found', 404);
  return successResponse(user);
}

export async function handleUpdateProfile(request: Request, env: any): Promise<Response> {
  const auth = await getAuthPayload(request, env);
  if (!auth) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(body.avatar_url); }
  if (body.bio !== undefined) { updates.push('bio = ?'); values.push(body.bio); }
  if (body.website !== undefined) { updates.push('website = ?'); values.push(body.website); }
  if (body.github !== undefined) { updates.push('github = ?'); values.push(body.github); }
  if (body.twitter !== undefined) { updates.push('twitter = ?'); values.push(body.twitter); }
  if (body.weibo !== undefined) { updates.push('weibo = ?'); values.push(body.weibo); }
  if (body.show_bio !== undefined) { updates.push('show_bio = ?'); values.push(body.show_bio); }
  if (body.show_website !== undefined) { updates.push('show_website = ?'); values.push(body.show_website); }
  if (body.show_github !== undefined) { updates.push('show_github = ?'); values.push(body.show_github); }
  if (body.show_twitter !== undefined) { updates.push('show_twitter = ?'); values.push(body.show_twitter); }
  if (body.show_weibo !== undefined) { updates.push('show_weibo = ?'); values.push(body.show_weibo); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(auth.userId);

  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const user = await env.DB.prepare(USER_SELECT).bind(auth.userId).first();
  return successResponse(user);
}

