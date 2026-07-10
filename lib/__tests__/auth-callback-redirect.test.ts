import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { resolvePostAuthDestination } from "@/lib/auth/post-auth-destination"
import { getPostAuthRedirectParam, normalizePostAuthRedirect } from "@/lib/auth/redirects"

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
    expect(signInSource).toContain("buildPostSignInRedirectHref")
    expect(signInSource).toContain("window.location.assign(buildPostSignInRedirectHref(redirectUrl))")
    expect(postSignInSource).toContain("hasAdminAccess(profile)")
    expect(postSignInSource).toContain("hasSupportAccess(profile)")
    // Phase 2 of dashboard remaster + dashboard-audit follow-up (2026-05-12):
    // staff (admin + doctor) login goes straight to the unified `/dashboard`
    // instead of the legacy aliases `/admin` and `/doctor/dashboard` which
    // 307 to the same target. Saves one round-trip per login.
    expect(postSignInSource).toContain("destination = STAFF_DASHBOARD_HREF")
    expect(postSignInSource).toContain("destination = STAFF_OPS_HREF")
    expect(postSignInSource).toContain("hasDoctorAccess(profile)")
    expect(postSignInSource).toContain("isRedirectAllowedForProfile(safeRedirect, profile)")
    expect(postSignInSource).toContain("defaultDestinationForProfile(profile)")
  })

  it("gives expired magic-link users a recoverable sign-in state", () => {
    expect(signInSource).toContain("auth_error")
    expect(signInSource).toContain("link_expired")
    expect(signInSource).toContain("That sign-in link expired")
    expect(signInSource).toContain("Email me a sign-in link")
    expect(signInSource).toContain("sessionStorage.getItem(LAST_MAGIC_LINK_EMAIL_KEY)")
  })

  it("keeps sign-in field errors and password visibility accessible", () => {
    expect(signInSource).toContain('label="Email address"')
    expect(signInSource).toContain('label="Password"')
    expect(signInSource).toContain("fieldErrors.email")
    expect(signInSource).toContain("fieldErrors.password")
    expect(signInSource).toContain("passwordInputRef.current?.focus()")
    expect(signInSource).toContain("aria-pressed={showPassword}")
    expect(signInSource).not.toContain("tabIndex={-1}")
  })

  it("uses calm account-checking copy while the magic-link session settles", () => {
    expect(postSignInLoadingSource).toContain("Finishing secure sign-in")
    expect(postSignInLoadingSource).toContain("Checking your account")
    expect(postSignInSource).toContain("Finishing secure sign-in")
    expect(postSignInSource).toContain("Checking your account")
    expect(postSignInSource).not.toContain("Loading...")
  })

  it("preserves query parameters for protected payment return routes", () => {
    expect(resolvePostAuthDestination("/patient/intakes/success?intake_id=intake-123&session_id=cs_test")).toBe(
      "/auth/post-signin?redirect=%2Fpatient%2Fintakes%2Fsuccess%3Fintake_id%3Dintake-123%26session_id%3Dcs_test",
    )
  })

  it("normalizes trusted absolute same-origin redirects to relative paths", () => {
    expect(
      normalizePostAuthRedirect(
        "https://preview.example.vercel.app/consult/request?service=consult",
        "/patient",
        "https://preview.example.vercel.app",
      ),
    ).toBe("/consult/request?service=consult")
  })

  it("rejects external post-auth redirects", () => {
    expect(normalizePostAuthRedirect("https://evil.example/phish", "/patient")).toBe("/patient")
    expect(resolvePostAuthDestination("https://evil.example/phish")).toBe("/auth/post-signin")
  })

  it("rejects protocol-relative redirects", () => {
    expect(normalizePostAuthRedirect("//evil.example/phish", "/patient")).toBe("/patient")
    expect(normalizePostAuthRedirect("%2F%2Fevil.example%2Fphish", "/patient")).toBe("/patient")
  })

  it("reads redirect, redirect_url, and next parameters consistently", () => {
    expect(getPostAuthRedirectParam(new URLSearchParams("redirect_url=%2Fpatient%2Fsettings"))).toBe("/patient/settings")
    expect(getPostAuthRedirectParam(new URLSearchParams("redirect=%2Fdoctor%2Fdashboard"))).toBe("/doctor/dashboard")
    expect(getPostAuthRedirectParam(new URLSearchParams("next=%2Fadmin%2Fops"))).toBe("/admin/ops")
  })
})
