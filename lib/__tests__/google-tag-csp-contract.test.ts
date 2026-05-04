import { describe, expect, it } from "vitest"

type Header = {
  key: string
  value: string
}

type HeaderRoute = {
  source: string
  headers: Header[]
}

type NextConfigWithHeaders = {
  headers: () => Promise<HeaderRoute[]>
}

async function getProductionHeaders() {
  const previousNodeEnv = process.env.NODE_ENV
  // @ts-expect-error NODE_ENV is typed as read-only, but the config reads it at call time.
  process.env.NODE_ENV = "production"

  try {
    const { default: nextConfig } = (await import("../../next.config.mjs")) as {
      default: NextConfigWithHeaders
    }
    return nextConfig.headers()
  } finally {
    // @ts-expect-error NODE_ENV is typed as read-only, but the config reads it at call time.
    process.env.NODE_ENV = previousNodeEnv
  }
}

function getHeaderValue(headers: HeaderRoute[], key: string) {
  return headers[0]?.headers.find((header) => header.key === key)?.value ?? ""
}

describe("Google tag CSP contract", () => {
  it("allows the Google Ads and GA4 origins required by Tag Assistant", async () => {
    const headers = await getProductionHeaders()
    const enforcedCsp = getHeaderValue(headers, "Content-Security-Policy")
    const reportOnlyCsp = getHeaderValue(headers, "Content-Security-Policy-Report-Only")

    for (const csp of [enforcedCsp, reportOnlyCsp]) {
      expect(csp).toContain("script-src")
      expect(csp).toContain("https://www.googletagmanager.com")
      expect(csp).toContain("https://*.googletagmanager.com")
      expect(csp).toContain("https://www.googleadservices.com")
      expect(csp).toContain("https://www.google.com")
      expect(csp).toContain("https://pagead2.googlesyndication.com")
      expect(csp).toContain("https://googleads.g.doubleclick.net")

      expect(csp).toContain("img-src")
      expect(csp).toContain("https://*.google-analytics.com")
      expect(csp).toContain("https://*.googletagmanager.com")
      expect(csp).toContain("https://www.googleadservices.com")
      expect(csp).toContain("https://google.com")
      expect(csp).toContain("https://www.google.com.au")

      expect(csp).toContain("connect-src")
      expect(csp).toContain("https://*.google-analytics.com")
      expect(csp).toContain("https://*.analytics.google.com")
      expect(csp).toContain("https://*.googletagmanager.com")
      expect(csp).toContain("https://www.googleadservices.com")
      expect(csp).toContain("https://google.com")
      expect(csp).toContain("https://www.google.com.au")

      expect(csp).toContain("frame-src")
      expect(csp).toContain("https://www.googletagmanager.com")
    }
  })
})
