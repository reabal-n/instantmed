import { describe, expect, it } from "vitest"

import { resolveInitialAuthLoadPlan } from "@/lib/supabase/auth-cookie"

const SUPABASE_URL = "https://project-ref.supabase.co"

describe("Supabase auth provider load plan", () => {
  it("settles an anonymous money page without loading the browser SDK", () => {
    expect(resolveInitialAuthLoadPlan("/prescriptions", ["theme"], SUPABASE_URL)).toBe(
      "anonymous",
    )
  })

  it.each([
    "sb-project-ref-auth-token",
    "sb-project-ref-auth-token.0",
    "sb-project-ref-auth-token.1",
  ])("verifies a money page when cookie %s may contain a session", (cookieName) => {
    expect(
      resolveInitialAuthLoadPlan("/medical-certificate", [cookieName], SUPABASE_URL),
    ).toBe("verify")
  })

  it.each(["/patient", "/patient/settings", "/dashboard", "/sign-in"])(
    "always verifies the protected or auth path %s",
    (pathname) => {
      expect(resolveInitialAuthLoadPlan(pathname, [], SUPABASE_URL)).toBe("verify")
    },
  )

  it("fails safe when Supabase configuration cannot identify the cookie", () => {
    expect(resolveInitialAuthLoadPlan("/prescriptions", [], undefined)).toBe("verify")
    expect(resolveInitialAuthLoadPlan("/prescriptions", [], "not a URL")).toBe("verify")
  })

  it("keeps non-immediate public routes interaction-deferred", () => {
    expect(resolveInitialAuthLoadPlan("/blog/example", [], SUPABASE_URL)).toBe("defer")
  })
})
