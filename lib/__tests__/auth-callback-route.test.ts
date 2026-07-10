import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const authMocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: authMocks })),
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}))

import { GET } from "@/app/auth/callback/route"

const RETURN_TO = "/patient/intakes/11111111-1111-1111-1111-111111111111?tab=documents"

function callbackRequest(search: string) {
  return new NextRequest(`https://instantmed.test/auth/callback?${search}`)
}

describe("auth callback recovery redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    authMocks.getUser.mockResolvedValue({ data: { user: null } })
  })

  it("preserves a safe destination when the callback has no code", async () => {
    const request = callbackRequest(`next=${encodeURIComponent(RETURN_TO)}`)

    const response = await GET(request)

    expect(response.headers.get("location")).toBe(
      `https://instantmed.test/sign-in?auth_error=link_expired&redirect=${encodeURIComponent(RETURN_TO)}`,
    )
    expect(authMocks.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it("preserves a safe destination when code exchange fails without a session", async () => {
    authMocks.exchangeCodeForSession.mockResolvedValue({ error: new Error("expired code") })

    const request = callbackRequest(
      `code=expired&next=${encodeURIComponent(RETURN_TO)}`,
    )
    const response = await GET(request)

    expect(response.headers.get("location")).toBe(
      `https://instantmed.test/sign-in?auth_error=link_expired&redirect=${encodeURIComponent(RETURN_TO)}`,
    )
  })

  it("drops an unsafe external destination from recovery redirects", async () => {
    const request = callbackRequest(
      `next=${encodeURIComponent("https://evil.example/phish")}`,
    )

    const response = await GET(request)

    expect(response.headers.get("location")).toBe(
      "https://instantmed.test/sign-in?auth_error=link_expired",
    )
  })
})
