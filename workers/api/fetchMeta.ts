import { successResponse, errorResponse } from '../utils/response';

function isPrivateHostname(hostname: string) {
  const lowered = hostname.toLowerCase()
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(lowered)) return true
  if (lowered.endsWith('.local') || lowered.endsWith('.internal')) return true
  if (/^10\./.test(lowered) || /^192\.168\./.test(lowered)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lowered)) return true
  return false
}

export async function handleFetchMeta(request: Request, env: any): Promise<Response> {
  const rawUrl = new URL(request.url).searchParams.get('url')
  if (!rawUrl) return errorResponse('Missing url parameter', 400)

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return errorResponse('Invalid URL', 400)
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return errorResponse('Only http/https URLs are allowed', 400)
  }

  if (isPrivateHostname(targetUrl.hostname)) {
    return errorResponse('Private or local network URLs are not allowed', 400)
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SimpliSave/1.0; +https://simplisave.pages.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return errorResponse(`Failed to fetch: ${response.status}`, 400)

    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    const title = ogTitleMatch?.[1] || titleMatch?.[1] || ''

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    const descMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    const description = ogDescMatch?.[1] || metaDescMatch?.[1] || descMatch2?.[1] || ''

    const origin = targetUrl.origin
    const iconRelMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
    const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)

    let icon = `${origin}/favicon.ico`
    const iconCandidate = iconRelMatch?.[1] || appleIconMatch?.[1] || ''
    if (iconCandidate) {
      try {
        icon = new URL(iconCandidate, origin).toString()
      } catch {
        icon = `${origin}/favicon.ico`
      }
    }

    return successResponse({
      title: title.trim().substring(0, 200),
      description: description.trim().substring(0, 500),
      icon,
      url: targetUrl.toString(),
    })
  } catch (err: any) {
    return errorResponse('Failed to fetch: ' + (err.message || 'Unknown error'), 500)
  }
}
