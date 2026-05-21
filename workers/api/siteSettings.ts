import { getUserId, getUserRole } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

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

  const colNames = updates.map(u => u.split(' = ')[0]);
  const colPlaceholders = updates.map(() => '?').join(', ');

  values.unshift('global');

  await env.DB.prepare(
    `INSERT INTO site_settings (id, ${colNames.join(', ')})
     VALUES (?, ${colPlaceholders})
     ON CONFLICT(id) DO UPDATE SET ${colNames.map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = CURRENT_TIMESTAMP`
  ).bind(...values).run();

  const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = ?').bind('global').first();
  return successResponse(settings);
}
