import { verifyJWT, verifyRS256JWT, hashPassword } from './jwt';
import { corsHeaders } from './response';

// Lightweight in-request user validation cache (TTL 5 min via Cache API)
const USER_CACHE_TTL = 300;

// 从 Cookie 头中提取指定 cookie 值
function getCookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// 统一提取 token：Bearer header 优先，SSO 模式下也接受 cookie
async function extractAndVerify(request: Request, env: any): Promise<any | null> {
  if (env?.AUTH_MODE === 'sso') {
    const publicKey = env?.SSO_PUBLIC_KEY as string | undefined;
    if (!publicKey) return null;

    // Bearer token 优先（前端 SSO callback 写入 localStorage 后仍用 Bearer）
    const auth = request.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) {
      return verifyRS256JWT(auth.slice(7), publicKey, env?.SSO_ISSUER);
    }
    // 备用：直接读 cookie（适用于 API 与前端同域的情况）
    const cookieName = (env?.SSO_COOKIE as string | undefined) || '_goauth_token';
    const cookieToken = getCookieValue(request, cookieName);
    if (cookieToken) {
      return verifyRS256JWT(cookieToken, publicKey, env?.SSO_ISSUER);
    }
    return null;
  }

  // standalone 模式：原有 HS256 逻辑
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7), env);
}

const USER_SELECT_BY_EMAIL = 'SELECT id, email, name, avatar_url, bio, website, github, twitter, weibo, show_bio, show_website, show_github, show_twitter, show_weibo, role, created_at, updated_at FROM users WHERE email = ?'

// SSO 模式：按 email 查找用户，不存在时自动创建影子账户
async function findOrCreateSSOUser(env: any, email: string, username?: string, role?: string): Promise<any> {
  let user = await env.DB.prepare(USER_SELECT_BY_EMAIL).bind(email).first();
  if (user) return user;

  const name = username || email.split('@')[0];
  const userRole = role === 'admin' ? 'admin' : 'user';
  const randomPwd = await hashPassword(crypto.randomUUID());
  await env.DB.prepare(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).bind(email, name, randomPwd, userRole).run();

  return env.DB.prepare(USER_SELECT_BY_EMAIL).bind(email).first();
}

export async function getUserId(request: Request, env: any): Promise<string | null> {
  const payload = await extractAndVerify(request, env);
  if (!payload) return null;

  const rawId = payload.userId ?? payload.user_id;
  if (!rawId) return null;
  const userId = String(rawId);

  // Cache API requires fully-qualified URLs as keys
  const cacheKey = new URL(`/__auth/${userId}`, request.url).href;
  const cached = await caches.default.match(cacheKey);
  if (cached) return userId;

  // Cache miss — query D1 to verify user exists
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (user) {
    // Cache the valid user for 5 min (fire and forget)
    const resp = new Response(userId, { status: 200, headers: { 'Cache-Control': `max-age=${USER_CACHE_TTL}` } });
    caches.default.put(cacheKey, resp).catch(() => {});
    return userId;
  }

  // SSO 模式：D1 没有该用户，按 email 自动创建影子账户
  if (env.AUTH_MODE === 'sso' && payload.email) {
    const created = await findOrCreateSSOUser(env, payload.email, payload.username, payload.role);
    if (created) {
      // Cache newly created user
      const key = new URL(`/__auth/${created.id}`, request.url).href;
      const resp = new Response(String(created.id), { status: 200, headers: { 'Cache-Control': `max-age=${USER_CACHE_TTL}` } });
      caches.default.put(key, resp).catch(() => {});
      return String(created.id);
    }
  }

  return null;
}

export async function getUserRole(request: Request, env: any): Promise<string | null> {
  const payload = await extractAndVerify(request, env);
  if (!payload) return null;
  const uid = payload.userId ?? payload.user_id;
  if (!uid) return null;
  return payload.role || 'user';
}

export async function getAuthPayload(request: Request, env: any): Promise<{ userId: string; role: string; email?: string; username?: string } | null> {
  const payload = await extractAndVerify(request, env);
  if (!payload) return null;
  // 兼容 GoAuth（user_id）和旧 JWT（userId）
  const rawId = payload.userId ?? payload.user_id;
  if (!rawId) return null;
  return {
    userId: String(rawId),
    role: payload.role || 'user',
    email: payload.email || undefined,
    username: payload.username || undefined,
  };
}
