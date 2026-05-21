// Auth API handlers
import { signJWT, verifyJWT, hashPassword, verifyPassword } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export async function handleRegister(request: Request, env: any): Promise<Response> {
  const body = await request.json() as { email: string; username: string; password: string };
  const { email, username, password } = body;
  
  if (!email || !username || !password) {
    return errorResponse('Email, username and password are required', 400);
  }
  if (password.length < 6) {
    return errorResponse('Password must be at least 6 characters', 400);
  }
  
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return errorResponse('Email already registered', 409);
  }
  
  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
  ).bind(email, username, passwordHash).run();
  
  if (!result.success) {
    return errorResponse('Failed to create user', 500);
  }
  
  const user = await env.DB.prepare('SELECT id, email, name, created_at FROM users WHERE email = ?').bind(email).first();
  const token = await signJWT({ userId: user.id, email: user.email, role: 'user' }, env);
  
  return successResponse({ user, token }, 201);
}

export async function handleLogin(request: Request, env: any): Promise<Response> {
  const body = await request.json() as { email: string; password: string };
  const { email, password } = body;
  
  if (!email || !password) {
    return errorResponse('Email and password are required', 400);
  }
  
  const user = await env.DB.prepare(
    'SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (!user) {
    return errorResponse('Invalid email or password', 401);
  }
  
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return errorResponse('Invalid email or password', 401);
  }
  
  const token = await signJWT({ userId: user.id, email: user.email, role: user.role || 'user' }, env);
  return successResponse({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, created_at: user.created_at },
    token,
  });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  return successResponse({ message: 'Logged out successfully' });
}

export async function handleGetMe(request: Request, env: any): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Unauthorized', 401);
  }
  
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, env);
  if (!payload) {
    return errorResponse('Invalid or expired token', 401);
  }
  
  const user = await env.DB.prepare(
    'SELECT id, email, name, avatar_url, role, created_at, updated_at FROM users WHERE id = ?'
  ).bind(payload.userId).first();
  
  if (!user) return errorResponse('User not found', 404);
  return successResponse(user);
}

export async function handleUpdateProfile(request: Request, env: any): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Unauthorized', 401);
  }
  
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, env);
  if (!payload) return errorResponse('Invalid token', 401);
  
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
  values.push(payload.userId);

  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const user = await env.DB.prepare(
    'SELECT id, email, name, avatar_url, bio, website, github, twitter, weibo, show_bio, show_website, show_github, show_twitter, show_weibo, role, created_at, updated_at FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  return successResponse(user);
}
