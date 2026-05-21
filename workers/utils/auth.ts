import { verifyJWT } from './jwt';

export async function getUserId(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  return payload?.userId || null;
}

export async function getUserRole(request: Request, env: any): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  if (!payload?.userId) return null;
  return payload.role || null;
}

export async function getAuthPayload(request: Request, env: any): Promise<{ userId: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(authHeader.slice(7), env);
  if (!payload?.userId) return null;
  return { userId: payload.userId, role: payload.role || 'user' };
}
