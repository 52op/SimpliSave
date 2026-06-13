import { successResponse } from '../utils/response';

export async function handleGetHomeData(request: Request, env: any): Promise<Response> {
  const [groups, cats, engs] = await Promise.all([
    env.DB.prepare(
      `SELECT pcg.*, pc.name as category_name, pc.color as category_color
       FROM public_card_groups pcg
       LEFT JOIN public_categories pc ON pcg.category_id = pc.id
       WHERE pcg.status = ?
       ORDER BY pcg.sort_order ASC, pcg.created_at DESC`
    ).bind('active').all(),
    env.DB.prepare('SELECT * FROM public_categories ORDER BY sort_order ASC, created_at DESC').all(),
    env.DB.prepare('SELECT * FROM search_engines WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC').all(),
  ]);

  return successResponse({
    card_groups: groups.results,
    categories: cats.results,
    search_engines: engs.results,
  });
}
