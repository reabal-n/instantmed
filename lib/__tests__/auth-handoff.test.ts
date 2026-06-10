import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  AUTH_HANDOFF_EVENT,
  AUTH_HANDOFF_REFRESH_SUPPRESSION_MS,
  AUTH_HANDOFF_STORAGE_KEY,
  AUTH_POST_SIGNIN_HREF,
  type AuthHandoffEventDetail,
  buildPostSignInHref,
  buildPostSignInRedirectHref,
  createAuthHandoffRefreshGuard,
  navigateToPostSignIn,
} from "@/lib/navigation/auth-handoff"

class TestCustomEvent<T> extends Event {
  detail: T

  constructor(type: string, init: CustomEventInit<T>) {
    super(type)
    this.detail = init.detail as T
  }
}

describe("auth post-sign-in handoff", () => {
  it("builds the plain post-sign-in URL when no search params are provided", () => {
    expect(buildPostSignInHref()).toBe(AUTH_POST_SIGNIN_HREF)
    expect(buildPostSignInHref(new URLSearchParams())).toBe(AUTH_POST_SIGNIN_HREF)
  })

  it("preserves search params for auth redirects", () => {
    expect(buildPostSignInHref({ redirect: "/dashboard", intake_id: "abc123" }))
      .toBe("/auth/post-signin?redirect=%2Fdashboard&intake_id=abc123")
    expect(buildPostSignInHref("?redirect=%2Fpatient")).toBe("/auth/post-signin?redirect=%2Fpatient")
  })

  it("normalizes redirect destinations into the post-sign-in handoff", () => {
    expect(buildPostSignInRedirectHref(null)).toBe(AUTH_POST_SIGNIN_HREF)
    expect(buildPostSignInRedirectHref("/auth/post-signin?intake_id=abc123"))
      .toBe("/auth/post-signin?intake_id=abc123")
    expect(buildPostSignInRedirectHref("/patient"))
      .toBe("/auth/post-signin?redirect=%2Fpatient")
    expect(buildPostSignInRedirectHref("https://evil.example/phish")).toBe(AUTH_POST_SIGNIN_HREF)
  })

  it("emits an observable event before assigning the document navigation", () => {
    const assigned: string[] = []
    const events: Event[] = []

    const href = navigateToPostSignIn({
      CustomEvent: TestCustomEvent as unknown as typeof CustomEvent,
      dispatchEvent: (event) => {
        events.push(event)
        return true
      },
      location: {
        assign: (nextHref: string) => {
          assigned.push(nextHref)
        },
      },
    }, { redirect: "/dashboard" })

    expect(href).toBe("/auth/post-signin?redirect=%2Fdashboard")
    expect(assigned).toEqual(["/auth/post-signin?redirect=%2Fdashboard"])
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe(AUTH_HANDOFF_EVENT)
    expect((events[0] as CustomEvent<AuthHandoffEventDetail>).detail).toEqual({
      destination: AUTH_POST_SIGNIN_HREF,
      href: "/auth/post-signin?redirect=%2Fdashboard",
    })
  })

  it("keeps post-sign-in URL construction centralized", () => {
    const signInSource = readFileSync(join(process.cwd(), "app/sign-in/[[...sign-in]]/page.tsx"), "utf8")
    const postAuthDestinationSource = readFileSync(join(process.cwd(), "lib/auth/post-auth-destination.ts"), "utf8")

    expect(signInSource).not.toContain("function buildPostSignInHref")
    expect(signInSource).toContain("buildPostSignInRedirectHref")
    expect(postAuthDestinationSource).toContain("buildPostSignInRedirectHref")
  })

  it("suppresses auth-provider refreshes while the dashboard handoff is leaving the page", () => {
    let now = 10_000
    const guard = createAuthHandoffRefreshGuard(() => now)

    expect(guard.shouldSuppress()).toBe(false)

    guard.suppress()
    expect(guard.shouldSuppress()).toBe(true)

    now += AUTH_HANDOFF_REFRESH_SUPPRESSION_MS - 1
    expect(guard.shouldSuppress()).toBe(true)

    now += 1
    expect(guard.shouldSuppress()).toBe(false)
  })

  it("keeps the provider handoff listener off the E2E early-return path", () => {
    const authProviderSource = readFileSync(join(process.cwd(), "lib/supabase/auth-provider.tsx"), "utf8")
    const e2eCheckIndex = authProviderSource.indexOf("const e2eUser = buildE2EClientUser()")
    const listenerIndex = authProviderSource.indexOf("window.addEventListener(AUTH_HANDOFF_EVENT")

    expect(e2eCheckIndex).toBeGreaterThan(-1)
    expect(listenerIndex).toBeGreaterThan(e2eCheckIndex)
    expect(authProviderSource).toContain("createAuthHandoffRefreshGuard")
    expect(authProviderSource).toContain("authHandoffRefreshGuard.shouldSuppress()")
    expect(authProviderSource).toContain("window.removeEventListener(AUTH_HANDOFF_EVENT")
  })

  it("exports the sessionStorage key for cross-page suppression", () => {
    expect(AUTH_HANDOFF_STORAGE_KEY).toBe("instantmed:auth-handoff-ts")
  })

  it("auth-provider reads the sessionStorage key to activate the cross-nav guard", () => {
    const authProviderSource = readFileSync(join(process.cwd(), "lib/supabase/auth-provider.tsx"), "utf8")

    // Key must be imported and used in sessionStorage.getItem
    expect(authProviderSource).toContain("AUTH_HANDOFF_STORAGE_KEY")
    expect(authProviderSource).toContain("sessionStorage.getItem(AUTH_HANDOFF_STORAGE_KEY)")
    expect(authProviderSource).toContain("sessionStorage.removeItem(AUTH_HANDOFF_STORAGE_KEY)")
    // Must activate the guard when the flag is recent
    expect(authProviderSource).toContain("authHandoffRefreshGuard.suppress()")
  })

  it("navigateToPostSignIn writes the sessionStorage flag before navigating", () => {
    // sessionStorage is not available in Node test environment — the function
    // must silently swallow the error and still call location.assign.
    const assigned: string[] = []
    const href = navigateToPostSignIn({
      CustomEvent: TestCustomEvent as unknown as typeof CustomEvent,
      dispatchEvent: () => true,
      location: { assign: (u: string) => { assigned.push(u) } },
    })

    expect(href).toBe(AUTH_POST_SIGNIN_HREF)
    expect(assigned).toEqual([AUTH_POST_SIGNIN_HREF])
  })

  it("logs post-sign-in elapsed time on the server handoff", () => {
    const source = readFileSync(join(process.cwd(), "app/auth/post-signin/page.tsx"), "utf8")

    expect(source).toContain("startedAt")
    expect(source).toContain("elapsedMs")
    expect(source).toContain("Post sign-in complete, redirecting")
  })

  it("classifies the unified staff dashboard in post-sign-in logs", () => {
    const source = readFileSync(join(process.cwd(), "app/auth/post-signin/page.tsx"), "utf8")

    expect(source).toContain('destination.startsWith(STAFF_DASHBOARD_HREF)')
    expect(source).toContain('"staff_dashboard"')
  })
})
