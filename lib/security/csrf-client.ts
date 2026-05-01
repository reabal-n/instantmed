"use client"

/**
 * Client-side CSRF token management
 */

let csrfTokenPromise: Promise<string> | null = null

async function getClientCsrfToken(): Promise<string> {
  if (csrfTokenPromise) {
    return csrfTokenPromise
  }

  csrfTokenPromise = fetch("/api/csrf", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token")
      }
      const payload = await response.json() as { token?: unknown }
      if (typeof payload.token !== "string" || payload.token.length === 0) {
        throw new Error("Invalid CSRF token response")
      }
      return payload.token
    })
    .catch((error) => {
      csrfTokenPromise = null
      throw error
    })

  return csrfTokenPromise
}

/**
 * Add CSRF headers to fetch requests
 */
export function addCsrfHeaders(headers: HeadersInit = {}, token: string): HeadersInit {
  return {
    ...headers,
    "X-CSRF-Token": token,
  }
}

/**
 * Fetch wrapper with automatic CSRF protection
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getClientCsrfToken()
  const headers = addCsrfHeaders(options.headers, token)

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? "same-origin",
  })

  if (response.status !== 403) {
    return response
  }

  csrfTokenPromise = null
  const refreshedToken = await getClientCsrfToken()
  return fetch(url, {
    ...options,
    headers: addCsrfHeaders(options.headers, refreshedToken),
    credentials: options.credentials ?? "same-origin",
  })
}
