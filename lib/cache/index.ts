import { unstable_cache } from "next/cache"

/**
 * Cache duration presets (in seconds)
 */
export const CACHE_DURATIONS = {
  /** No caching */
  none: 0,
  /** Short cache for frequently changing data (1 minute) */
  short: 60,
  /** Medium cache for moderately changing data (5 minutes) */
  medium: 60 * 5,
  /** Long cache for rarely changing data (1 hour) */
  long: 60 * 60,
  /** Extended cache for static content (24 hours) */
  extended: 60 * 60 * 24,
  /** Permanent cache for truly static data (1 week) */
  permanent: 60 * 60 * 24 * 7,
} as const

/**
 * Cache tags for granular invalidation
 */
export const CACHE_TAGS = {
  // User-related
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user-profile:${userId}`,
  
  // Request-related
  request: (requestId: string) => `request:${requestId}`,
  requests: "requests",
  userRequests: (userId: string) => `user-requests:${userId}`,
  
  // Content-related
  medications: "medications",
  medication: (id: string) => `medication:${id}`,
  conditions: "conditions",
  condition: (slug: string) => `condition:${slug}`,
  
  // Blog/CMS
  blogPosts: "blog-posts",
  blogPost: (slug: string) => `blog-post:${slug}`,
  
  // Pricing/Products
  pricing: "pricing",
  products: "products",
  
  // Settings
  featureFlags: "feature-flags",
  siteSettings: "site-settings",
} as const

/**
 * Create a cached function with proper typing and tags
 */
export function createCachedFn<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    tags: string[]
    revalidate?: number
    keyPrefix?: string
  }
) {
  const { tags, revalidate = CACHE_DURATIONS.medium, keyPrefix = "cache" } = options

  return unstable_cache(
    fn,
    [`${keyPrefix}-${tags.join("-")}`],
    {
      tags,
      revalidate,
    }
  )
}

/**
 * Cache headers for API responses
 */
export function getCacheHeaders(duration: keyof typeof CACHE_DURATIONS): Record<string, string> {
  const seconds = CACHE_DURATIONS[duration]
  
  if (seconds === 0) {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    }
  }

  return {
    "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
  }
}

/**
 * Revalidation helper for API routes
 */
export function createCachedResponse<T>(
  data: T,
  duration: keyof typeof CACHE_DURATIONS = "medium"
) {
  return Response.json(data, {
    headers: getCacheHeaders(duration),
  })
}

/**
 * CDN Cache-Control headers for different resource types
 */
export const CDN_CACHE_HEADERS = {
  /** Static assets (images, fonts, etc.) */
  static: "public, max-age=31536000, immutable",
  
  /** HTML pages with revalidation */
  page: "public, s-maxage=60, stale-while-revalidate=300",
  
  /** API responses with short cache */
  api: "public, s-maxage=10, stale-while-revalidate=60",
  
  /** Private data (requires auth) */
  private: "private, no-cache, no-store, must-revalidate",
  
  /** Dynamic but cacheable */
  dynamic: "public, s-maxage=0, stale-while-revalidate=86400",
} as const

/**
 * Helper to set appropriate cache headers based on authentication state
 */
export function getAuthAwareCacheHeaders(isAuthenticated: boolean) {
  return isAuthenticated 
    ? { "Cache-Control": CDN_CACHE_HEADERS.private }
    : { "Cache-Control": CDN_CACHE_HEADERS.page }
}

/**
 * SWR configuration defaults for client-side caching
 */
export const SWR_CONFIG = {
  /** Revalidate on focus */
  revalidateOnFocus: false,
  /** Revalidate on reconnect */
  revalidateOnReconnect: true,
  /** Retry failed requests */
  shouldRetryOnError: true,
  /** Error retry count */
  errorRetryCount: 3,
  /** Dedupe interval in ms */
  dedupingInterval: 2000,
} as const

/**
 * Stale-while-revalidate fetch wrapper
 */
export async function fetchWithCache<T>(
  url: string,
  options: RequestInit & { 
    revalidate?: number
    tags?: string[]
  } = {}
): Promise<T> {
  const { revalidate = CACHE_DURATIONS.medium, tags = [], ...fetchOptions } = options

  const response = await fetch(url, {
    ...fetchOptions,
    next: {
      revalidate,
      tags,
    },
  })

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
