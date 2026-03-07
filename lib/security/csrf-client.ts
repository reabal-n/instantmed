"use client"

/**
 * Client-side CSRF token management
 */

/**
 * Add CSRF headers to fetch requests
 */
export function addCsrfHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...headers,
    "X-CSRF-Token": "client-request", // Simple marker for client requests
  }
}

/**
 * Fetch wrapper with automatic CSRF protection
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = addCsrfHeaders(options.headers)

  return fetch(url, {
    ...options,
    headers,
  })
}
