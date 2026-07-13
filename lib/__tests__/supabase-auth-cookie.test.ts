import { describe, expect, it, vi } from "vitest"

import { getSupabaseAuthCookieName, requestMayHaveSupabaseSession } from "@/lib/supabase/auth-cookie"

describe("Supabase auth cookie routing policy", () => {
  it("stays aligned with the installed Supabase client's default storage key", async () => {
    const { createClient } = await vi.importActual<typeof import("@supabase/supabase-js")>(
      "@supabase/supabase-js",
    )
    const url = "https://project-ref.supabase.co"
    const supabase = createClient(url, "anon-key", {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
    const storageKey = (supabase.auth as unknown as { storageKey: string }).storageKey

    expect(getSupabaseAuthCookieName(url)).toBe(storageKey)
  })

  it("recognizes the base cookie and chunked cookie names only", () => {
    const url = "https://project-ref.supabase.co"

    expect(requestMayHaveSupabaseSession(["sb-project-ref-auth-token"], url)).toBe(true)
    expect(requestMayHaveSupabaseSession(["sb-project-ref-auth-token.0"], url)).toBe(true)
    expect(requestMayHaveSupabaseSession(["theme"], url)).toBe(false)
  })

  it.each([undefined, "", "not-a-url"])(
    "fails safe when the Supabase URL is unavailable: %s",
    (url) => {
      expect(requestMayHaveSupabaseSession([], url)).toBe(true)
    },
  )
})
