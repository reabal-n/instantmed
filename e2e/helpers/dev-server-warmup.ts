const E2E_BROWSER_BOOT_PATHS = [
  "/api/availability",
  "/api/last-reviewed",
] as const

interface WarmupResponse {
  ok: boolean
  status: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

export type WarmupFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<WarmupResponse>

/**
 * Compile routes fetched during the first public-page hydration before a
 * Playwright browser connects. A cold Next dev route compile emits a hot
 * update; if that happens mid-hydration, Fast Refresh can request a partial
 * RSC tree before the persistent root providers are available to it.
 */
export async function warmE2EBrowserBootRoutes(
  baseUrl: string,
  fetcher: WarmupFetch = fetch,
) {
  for (const path of E2E_BROWSER_BOOT_PATHS) {
    const response = await fetcher(new URL(path, baseUrl))
    if (!response.ok) {
      throw new Error(`E2E dev-server warmup failed for ${path} (${response.status})`)
    }

    // Consume the response so route compilation and streaming are complete
    // before the first browser context starts hydrating the application.
    await response.arrayBuffer()
  }
}
