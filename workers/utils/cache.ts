// Cloudflare Cache API helpers
import { corsHeaders } from './response';

/**
 * Construct a full URL from a request and a relative path.
 * Cache API requires fully-qualified URLs as keys.
 */
export function fullUrl(request: Request, path: string): string {
  return new URL(path, request.url).href;
}

/** TTL constants (seconds) */
export const TTL = {
  SITE_SETTINGS: 300,      // 5 min
  PUBLIC_CATEGORIES: 300,  // 5 min
  CARD_GROUPS: 300,        // 5 min
  PUBLIC_BOOKMARKS: 120,   // 2 min
  SEARCH_ENGINES: 600,     // 10 min
  HOT_TAGS: 600,           // 10 min
  PUBLIC_MEMO: 300,        // 5 min
  PUBLIC_USER: 600,        // 10 min
} as const;

/** Get the default Cache API instance (Cloudflare edge cache) */
function getDefaultCache(): Cache {
  return caches.default;
}

/**
 * Try to get a cached Response for the given request URL.
 * Returns null if not found.
 */
export async function cacheGet(url: string): Promise<Response | null> {
  const cache = getDefaultCache();
  const cached = await cache.match(url);
  return cached || null;
}

/**
 * Store a Response in the cache with the given TTL.
 * Only caches responses with status 200.
 */
export async function cachePut(url: string, response: Response, ttl: number): Promise<void> {
  if (response.status !== 200) return;

  const cache = getDefaultCache();

  // Clone the response because Response bodies can only be consumed once
  const body = await response.text();

  const cachedResponse = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Cache-Control': `public, max-age=${ttl}`,
      'X-Cache': 'HIT',
      ...corsHeaders(),
    },
  });

  await cache.put(url, cachedResponse);
}

/**
 * Invalidate (delete) a cache entry by URL.
 */
export async function cacheDelete(url: string): Promise<void> {
  const cache = getDefaultCache();
  await cache.delete(url);
}

/**
 * Execute a handler with cache-aside pattern:
 * - Check cache first
 * - If hit, return cached response
 * - If miss, run handler, cache the result, return it
 */
export async function withCache(
  requestUrl: string,
  ttl: number,
  handler: () => Promise<Response>,
): Promise<Response> {
  // Check cache first
  const cached = await cacheGet(requestUrl);
  if (cached) {
    // Re-create response with CORS headers (Cache API strips them on retrieval)
    const body = await cached.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': cached.headers.get('Content-Type') || 'application/json',
        'Cache-Control': cached.headers.get('Cache-Control') || `public, max-age=${ttl}`,
        'X-Cache': 'HIT',
        ...corsHeaders(),
      },
    });
  }

  // Cache miss — run the actual handler
  const response = await handler();

  // Only cache successful responses
  if (response.status === 200) {
    // Clone the response so cachePut can consume the body without affecting the original
    cachePut(requestUrl, response.clone(), ttl).catch(() => {});
  }

  return response;
}
