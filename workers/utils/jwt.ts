// JWT utilities using Web Crypto API
// 使用 env.JWT_SECRET 而非硬编码，以兼容 Cloudflare Pages Functions

const DEFAULT_SECRET = 'your-secret-key-change-in-production';

function base64UrlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function getSecretKey(env: any): Promise<CryptoKey> {
  const secret = env?.JWT_SECRET || DEFAULT_SECRET;
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: any, env?: any, expiresInHours = 24): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInHours * 3600;
  const payloadWithExp = { ...payload, iat: now, exp };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payloadWithExp)));
  const content = `${headerB64}.${payloadB64}`;

  const key = await getSecretKey(env);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(content));
  const signatureB64 = base64UrlEncode(signature);

  return `${content}.${signatureB64}`;
}

export async function verifyJWT(token: string, env?: any): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const content = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await getSecretKey(env);

  // Decode signature for verification
  const signatureStr = base64UrlDecode(signatureB64);
  const signatureBytes = new Uint8Array(signatureStr.length);
  for (let i = 0; i < signatureStr.length; i++) {
    signatureBytes[i] = signatureStr.charCodeAt(i);
  }

  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(content));
  if (!valid) return null;

  const payloadStr = base64UrlDecode(payloadB64);
  const payload = JSON.parse(payloadStr);

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// RS256 验证（用于 SSO 模式，验证 GoAuth 颁发的 JWT）
export async function verifyRS256JWT(token: string, publicKeyPem: string, issuer?: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const pemBody = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');
    const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigStr = base64UrlDecode(signatureB64);
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);

    const encoder = new TextEncoder();
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      sigBytes,
      encoder.encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (issuer && payload.iss !== issuer) return null;
    return payload;
  } catch {
    return null;
  }
}