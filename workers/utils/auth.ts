import { verifyJWT, verifyRS256JWT } from './jwt';

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

export async function getUserId(request: Request, env: any): Promise<string | null> {
  const payload = await extractAndVerify(request, env);
  if (!payload) return null;
  // GoAuth JWT 用 user_id（number），转为 string
  return payload.userId ? String(payload.userId) : payload.user_id ? String(payload.user_id) : null;
}

export async function getUserRole(request: Request, env: any): Promise<string | null> {
  const payload = await extractAndVerify(request, env);
  if (!payload) return null;
  const uid = payload.userId ?? payload.user_id;
  if (!uid) return null;
  return payload.role || 'user';
}

export async function getAuthPayload(request: Request, env: any): Promise<{ userId: string; role: string } | null> {
  const payload = await extractAndVerify(request, env);
  if (!payload) return null;
  // 兼容 GoAuth（user_id）和旧 JWT（userId）
  const rawId = payload.userId ?? payload.user_id;
  if (!rawId) return null;
  return { userId: String(rawId), role: payload.role || 'user' };
}
