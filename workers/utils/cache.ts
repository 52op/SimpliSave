// Cloudflare Cache API helpers
// Cache key prefix for SimpliSave public data
const CACHE_PREFIX = 'simplisave:';

/** Build a cache key from a request URL */
export function cacheKey(url: string): string {
  // Strip the origin to make keys portable across edge locations
  return CACHE_PREFIX + url;
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
  const key = cacheKey(url);
  const cached = await cache.match(key);
  return cached || null;
}

/**
 * Store a Response in the cache with the given TTL.
 * Only caches responses with status 200.
 */
export async function cachePut(url: string, response: Response, ttl: number): Promise<void> {
  if (response.status !== 200) return;

  const cache = getDefaultCache();
  const key = cacheKey(url);

  // Clone the response because Response bodies can only be consumed once
  const body = await response.text();

  const cachedResponse = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Cache-Control': `public, max-age=${ttl}`,
      'X-Cache': 'HIT',
    },
  });

  await cache.put(key, cachedResponse);
}

/**
 * Invalidate (delete) a cache entry by URL.
 */
export async function cacheDelete(url: string): Promise<void> {
  const cache = getDefaultCache();
  const key = cacheKey(url);
  await cache.delete(key);
}

/**
 * Invalidate multiple cache entries by URL patterns.
 * Each pattern is a string that should be a prefix match for cache keys.
 */
export async function cacheDeleteByPrefix(urlPatterns: string[]): Promise<void> {
  const cache = getDefaultCache();
  for (const pattern of urlPatterns) {
    // We need to delete all possible URLs that start with this pattern.
    // Since Cache API doesn't support prefix deletion, we delete known keys.
    const key = cacheKey(pattern);
    await cache.delete(key);
  }
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
    // Add a header so the client knows it was cached
    const resp = new Response(cached.body, cached);
    resp.headers.set('X-Cache', 'HIT');
    return resp;
  }

  // Cache miss — run the actual handler
  const response = await handler();

  // Only cache successful responses
  if (response.status === 200) {
    // We need to clone the response since we return it to the client
    const clone = response.clone();
    // Don't await — fire and forget to avoid blocking the response
    cachePut(requestUrl, response, ttl).catch(() => {});
  }

  return response;
}
