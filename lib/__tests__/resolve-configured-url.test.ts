import { afterEach, describe, expect, it, vi } from "vitest"

import { isPlaceholderUrl, resolveConfiguredUrl } from "@/lib/constants/resolve-configured-url"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

/**
 * Guards the 2026-07-06 incident: an AI set PRODUCTREVIEW_REVIEW_URL to
 * example.com in Vercel and the `|| default` pattern (truthy placeholder wins)
 * sent every review CTA to a dead link. resolveConfiguredUrl must ignore
 * placeholder/invalid values so the correct default always reaches users.
 */
describe("isPlaceholderUrl", () => {
  it("flags the classic placeholder hosts", () => {
    for (const u of [
      "https://example.com",
      "http://example.com/write-review",
      "https://www.example.org",
      "https://example.net",
      "https://your-domain.com/x",
      "https://changeme.io",
    ]) {
      expect(isPlaceholderUrl(u), u).toBe(true)
    }
  })

  it("flags structurally-invalid URLs and non-http schemes", () => {
    expect(isPlaceholderUrl("not-a-url")).toBe(true)
    expect(isPlaceholderUrl("productreview.com.au/x")).toBe(true) // no scheme
    expect(isPlaceholderUrl("ftp://example.com")).toBe(true)
    expect(isPlaceholderUrl("javascript:alert(1)")).toBe(true)
  })

  it("accepts real destinations (incl. localhost for dev)", () => {
    expect(isPlaceholderUrl("https://www.productreview.com.au/listings/instantmed")).toBe(false)
    expect(isPlaceholderUrl("http://localhost:3060/x")).toBe(false)
    // A real host that merely CONTAINS 'example' as a substring is fine.
    expect(isPlaceholderUrl("https://myexamplecompany.com.au")).toBe(false)
  })
})

describe("resolveConfiguredUrl", () => {
  const FALLBACK = "https://www.productreview.com.au/listings/instantmed/write-review"

  it("uses the fallback for empty / whitespace / undefined", () => {
    expect(resolveConfiguredUrl(undefined, FALLBACK)).toBe(FALLBACK)
    expect(resolveConfiguredUrl("", FALLBACK)).toBe(FALLBACK)
    expect(resolveConfiguredUrl("   ", FALLBACK)).toBe(FALLBACK)
  })

  it("ignores a placeholder env value in favour of the fallback (the incident)", () => {
    expect(resolveConfiguredUrl("https://example.com", FALLBACK)).toBe(FALLBACK)
    expect(resolveConfiguredUrl("example.com", FALLBACK)).toBe(FALLBACK)
  })

  it("uses a real configured value", () => {
    const real = "https://au.trustpilot.com/review/instantmed.com.au"
    expect(resolveConfiguredUrl(real, FALLBACK)).toBe(real)
  })
})

describe("the shipped PRODUCTREVIEW_REVIEW_URL constant", () => {
  it("is a real ProductReview URL, never a placeholder", async () => {
    const { PRODUCTREVIEW_REVIEW_URL } = await import("@/lib/constants")

    expect(PRODUCTREVIEW_REVIEW_URL).toContain("productreview.com.au")
    expect(isPlaceholderUrl(PRODUCTREVIEW_REVIEW_URL)).toBe(false)
  })
})

describe("APP_URL", () => {
  it("ignores placeholder public app/site URLs and falls back to the canonical domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.org")

    const { APP_URL } = await import("@/lib/constants")

    expect(APP_URL).toBe("https://instantmed.com.au")
  })

  it("keeps a real configured app URL and strips the trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.instantmed.com.au/")

    const { APP_URL } = await import("@/lib/constants")

    expect(APP_URL).toBe("https://preview.instantmed.com.au")
  })
})
