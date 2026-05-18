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

export async function handleGetSiteSettings(request: Request, env: any): Promise<Response> {
  const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = ?').bind('global').first();

  if (!settings) {
    return successResponse({
      site_name: 'SimpliSave',
      description: '',
      keywords: '',
      logo_url: null,
      favicon_url: null,
      footer_html: 'Powered by SimpliSave',
      ga_id: null,
      beian: null,
      custom_head_html: null,
    });
  }
  return successResponse(settings);
}

export async function handleUpdateSiteSettings(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  const fields = [
    'site_name', 'description', 'keywords', 'logo_url',
    'favicon_url', 'footer_html', 'ga_id', 'beian', 'custom_head_html',
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push('global');

  await env.DB.prepare(
    `INSERT INTO site_settings (id, ${updates.map(u => u.split(' = ')[0]).join(', ')})
     VALUES (?, ${updates.map(() => '?').join(', ')})
     ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`
  ).bind(...values).run();

  const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = ?').bind('global').first();
  return successResponse(settings);
}
