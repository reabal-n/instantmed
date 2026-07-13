import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ATTRIBUTION_COOKIE_KEY } from "@/lib/analytics/middleware-attribution"

const mocks = vi.hoisted(() => ({
  updateSupabaseSession: vi.fn(),
}))

vi.mock("@/lib/supabase/middleware", () => ({
  updateSupabaseSession: mocks.updateSupabaseSession,
}))

function request(pathname: string, cookie?: string): NextRequest {
  return new NextRequest(`https://instantmed.test${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

describe("middleware Supabase auth policy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("VERCEL_ENV", "development")
    vi.stubEnv("PLAYWRIGHT", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co")
    mocks.updateSupabaseSession.mockResolvedValue({
      response: NextResponse.next(),
      user: null,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("skips remote auth for an anonymous public request without dropping attribution", async () => {
    const { default: middleware } = await import("@/middleware")

    const response = await middleware(request("/blog?utm_source=policy-test"))

    expect(mocks.updateSupabaseSession).not.toHaveBeenCalled()
    expect(response.cookies.get(ATTRIBUTION_COOKIE_KEY)?.value).toContain("policy-test")
  })

  it("does not treat unrelated cookies as a possible Supabase session", async () => {
    const { default: middleware } = await import("@/middleware")

    await middleware(request("/pricing", "theme=dark"))

    expect(mocks.updateSupabaseSession).not.toHaveBeenCalled()
  })

  it.each([
    "sb-project-ref-auth-token=opaque",
    "sb-project-ref-auth-token.0=chunk-zero",
  ])("verifies a public request carrying Supabase auth cookie %s", async (cookie) => {
    const { default: middleware } = await import("@/middleware")

    await middleware(request("/blog", cookie))

    expect(mocks.updateSupabaseSession).toHaveBeenCalledOnce()
  })

  it("always verifies protected pages even when no auth cookie is present", async () => {
    const { default: middleware } = await import("@/middleware")

    const response = await middleware(request("/dashboard?tab=queue"))

    expect(mocks.updateSupabaseSession).toHaveBeenCalledOnce()
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("/sign-in?redirect=%2Fdashboard%3Ftab%3Dqueue")
  })

  it("always verifies protected APIs and returns 401 without a user", async () => {
    const { default: middleware } = await import("@/middleware")

    const response = await middleware(request("/api/admin/system-health"))

    expect(mocks.updateSupabaseSession).toHaveBeenCalledOnce()
    expect(response.status).toBe(401)
  })

  it.each(["", "not-a-url"])(
    "fails safe when the Supabase URL cannot identify the auth cookie: %s",
    async (supabaseUrl) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl)
      const { default: middleware } = await import("@/middleware")

      await middleware(request("/blog"))

      expect(mocks.updateSupabaseSession).toHaveBeenCalledOnce()
    },
  )

  it("does not allow an E2E cookie to bypass auth on Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("PLAYWRIGHT", "1")
    const { default: middleware } = await import("@/middleware")

    const response = await middleware(request("/dashboard", "__e2e_auth_user_id=test-user"))

    expect(mocks.updateSupabaseSession).toHaveBeenCalledOnce()
    expect(response.status).toBe(302)
  })

  it("preserves the E2E bypass for local and CI browser tests", async () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PLAYWRIGHT", "1")
    const { default: middleware } = await import("@/middleware")

    const response = await middleware(request("/dashboard", "__e2e_auth_user_id=test-user"))

    expect(mocks.updateSupabaseSession).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })
})
