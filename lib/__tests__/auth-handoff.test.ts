import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  AUTH_HANDOFF_EVENT,
  AUTH_POST_SIGNIN_HREF,
  type AuthHandoffEventDetail,
  buildPostSignInHref,
  buildPostSignInRedirectHref,
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

  it("logs post-sign-in elapsed time on the server handoff", () => {
    const source = readFileSync(join(process.cwd(), "app/auth/post-signin/page.tsx"), "utf8")

    expect(source).toContain("startedAt")
    expect(source).toContain("elapsedMs")
    expect(source).toContain("Post sign-in complete, redirecting")
  })
})
