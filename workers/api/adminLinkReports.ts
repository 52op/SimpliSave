import { getUserId, getUserRole } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

export async function handleListLinkReports(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20')));
  const offset = (page - 1) * pageSize;

  const totalRow = await env.DB.prepare('SELECT COUNT(*) as total FROM link_reports').first<{ total: number }>();
  const total = totalRow?.total || 0;

  const items = await env.DB.prepare(
    'SELECT * FROM link_reports ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(pageSize, offset).all<any>();

  return successResponse({ items: items.results || [], total, page, page_size: pageSize });
}
