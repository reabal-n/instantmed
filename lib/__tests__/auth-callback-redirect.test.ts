import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { resolvePostAuthDestination } from "@/lib/auth/post-auth-destination"

const authCallbackSource = readFileSync(join(process.cwd(), "app/auth/callback/route.ts"), "utf8")
const postSignInLoadingSource = readFileSync(join(process.cwd(), "app/auth/post-signin/loading.tsx"), "utf8")
const postSignInSource = readFileSync(join(process.cwd(), "app/auth/post-signin/page.tsx"), "utf8")
const signInSource = readFileSync(join(process.cwd(), "app/sign-in/[[...sign-in]]/page.tsx"), "utf8")

describe("resolvePostAuthDestination", () => {
  it("does not wrap an existing post-signin redirect inside another post-signin redirect", () => {
    expect(resolvePostAuthDestination("/auth/post-signin?intake_id=intake-123")).toBe(
      "/auth/post-signin?intake_id=intake-123",
    )
  })

  it("routes normal destinations through post-signin profile linking", () => {
    expect(resolvePostAuthDestination("/patient")).toBe(
      "/auth/post-signin?redirect=%2Fpatient",
    )
  })

  it("falls back to post-signin when there is no destination", () => {
    expect(resolvePostAuthDestination(null)).toBe("/auth/post-signin")
  })

  it("does not send failed magic-link exchanges to a dead auth error route", () => {
    expect(authCallbackSource).toContain("Code exchange failed but session exists")
    expect(authCallbackSource).toContain("sign-in?auth_error=link_expired")
    expect(authCallbackSource).not.toContain("/auth/error?message")
  })

  it("keeps sign-in redirects role-aware after session creation", () => {
    expect(signInSource).toContain("buildPostSignInHref")
    expect(signInSource).toContain("window.location.assign(buildPostSignInHref(redirectUrl))")
    expect(postSignInSource).toContain("hasAdminAccess(profile)")
    expect(postSignInSource).toContain('destination = "/admin"')
  })

  it("gives expired magic-link users a recoverable sign-in state", () => {
    expect(signInSource).toContain("auth_error")
    expect(signInSource).toContain("link_expired")
    expect(signInSource).toContain("That sign-in link expired")
    expect(signInSource).toContain("Email me a sign-in link")
    expect(signInSource).toContain("sessionStorage.getItem(LAST_MAGIC_LINK_EMAIL_KEY)")
  })

  it("uses calm account-checking copy while the magic-link session settles", () => {
    expect(postSignInLoadingSource).toContain("Finishing secure sign-in")
    expect(postSignInLoadingSource).toContain("Checking your account")
    expect(postSignInSource).toContain("Finishing secure sign-in")
    expect(postSignInSource).toContain("Checking your account")
    expect(postSignInSource).not.toContain("Loading...")
  })
})
