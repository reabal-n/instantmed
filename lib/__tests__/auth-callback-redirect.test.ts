import { describe, expect, it } from "vitest"

import { resolvePostAuthDestination } from "@/lib/auth/post-auth-destination"
import { getPostAuthRedirectParam, normalizePostAuthRedirect } from "@/lib/auth/redirects"

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
