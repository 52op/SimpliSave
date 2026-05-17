// 抓取网页 meta 信息 API
import { successResponse, errorResponse } from '../utils/response';

export async function handleFetchMeta(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) return errorResponse('Missing url parameter', 400);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SimpliSave/1.0; +https://simplisave.pages.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return errorResponse(`Failed to fetch: ${response.status}`, 400);

    const html = await response.text();

    // 解析 title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const title = ogTitleMatch?.[1] || titleMatch?.[1] || '';

    // 解析 description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const descMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = ogDescMatch?.[1] || metaDescMatch?.[1] || descMatch2?.[1] || '';

    // 解析 icon
    const parsedUrl = new URL(url);
    const origin = parsedUrl.origin;

    // 尝试多种 icon 来源
    const iconRelMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    let icon = '';
    if (iconRelMatch?.[1]) {
      icon = iconRelMatch[1].startsWith('http') ? iconRelMatch[1] : origin + (iconRelMatch[1].startsWith('/') ? '' : '/') + iconRelMatch[1];
    } else if (appleIconMatch?.[1]) {
      icon = appleIconMatch[1].startsWith('http') ? appleIconMatch[1] : origin + (appleIconMatch[1].startsWith('/') ? '' : '/') + appleIconMatch[1];
    } else {
      // 默认 favicon.ico
      icon = origin + '/favicon.ico';
    }

    return successResponse({
      title: title.trim().substring(0, 200),
      description: description.trim().substring(0, 500),
      icon,
      url,
    });
  } catch (err: any) {
    return errorResponse('Failed to fetch: ' + (err.message || 'Unknown error'), 500);
  }
}
