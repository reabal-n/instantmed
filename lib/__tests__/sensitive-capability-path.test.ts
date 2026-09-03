import { afterEach, describe, expect, it, vi } from "vitest"

import {
  isExternalAnalyticsExcludedPathname,
  isSensitiveCapabilityPath,
  redactExternalAnalyticsPathname,
} from "@/lib/browser/sensitive-capability-path"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("external analytics pathname boundary", () => {
  it("excludes and redacts a percent-encoded capability separator", () => {
    const pathname = "/resume%2Fsigned-checkout-secret"

    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(true)
    expect(redactExternalAnalyticsPathname(pathname)).toBe("/resume/[REDACTED]")
  })

  it.each([
    "/resume%2Fsigned-checkout-secret",
    "/track%252Fsigned-request-secret",
    "/resume%E0%A4%A",
  ])("blocks client telemetry startup on unsafe pathname %s", (pathname) => {
    vi.stubGlobal("window", { location: { pathname } })

    expect(isSensitiveCapabilityPath()).toBe(true)
  })

  it("reaches a fixed point at the bounded decode limit without excluding a public route", () => {
    const pathname = "/medical-certificate%2525252Fdetails"

    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(false)
    expect(redactExternalAnalyticsPathname(pathname)).toBe("/medical-certificate/details")
  })

  it.each([
    ["/track%252Fsigned-request-secret", "/track/[REDACTED]"],
    ["%2Fresume%2Fsigned-checkout-secret", "/resume/[REDACTED]"],
    ["/track%2525252Fsigned-request-secret", "/track/[REDACTED]"],
    [
      "/patient%2Fintakes%2F11111111-1111-4111-8111-111111111111",
      "/patient/[REDACTED]",
    ],
  ])("excludes and redacts encoded private path %s", (pathname, redacted) => {
    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(true)
    expect(redactExternalAnalyticsPathname(pathname)).toBe(redacted)
  })

  it.each([
    "/medical-certificate%",
    "/medical-certificate%ZZ",
    "/resume%E0%A4%A",
  ])("fails closed for malformed encoding in %s", (pathname) => {
    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(true)
    expect(redactExternalAnalyticsPathname(pathname)).toBe("/[REDACTED]")
  })

  it.each([
    "/public/%252e%252e/resume/signed-secret",
    "/resume%3Fsigned-secret",
    "/resume%23signed-secret",
    "/resume%5Csigned-secret",
    "/resume%00signed-secret",
    "/%2Fresume%2Fsigned-secret",
    "/public/../resume/signed-secret",
    "/public/./resume/signed-secret",
    "/resume\\signed-secret",
    "//resume/signed-secret",
  ])("fails closed for structurally ambiguous pathname %s", (pathname) => {
    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(true)
    expect(redactExternalAnalyticsPathname(pathname)).toBe("/[REDACTED]")
  })

  it("fails closed when decoding does not reach a fixed point within the bound", () => {
    const pathname = "/medical-certificate%252525252Fdetails"

    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(true)
    expect(redactExternalAnalyticsPathname(pathname)).toBe("/[REDACTED]")
  })

  it.each([
    "/",
    "/medical-certificate",
    "/resume-help",
    "/tracking",
  ])("preserves existing public route behavior for %s", (pathname) => {
    expect(isExternalAnalyticsExcludedPathname(pathname)).toBe(false)
    expect(redactExternalAnalyticsPathname(pathname)).toBe(pathname)
  })

  it("preserves existing literal private and capability route behavior", () => {
    expect(isExternalAnalyticsExcludedPathname("/patient/settings")).toBe(true)
    expect(redactExternalAnalyticsPathname("/patient/settings")).toBe("/patient/settings")
    expect(isExternalAnalyticsExcludedPathname("/track/signed-request-secret")).toBe(true)
    expect(redactExternalAnalyticsPathname("/track/signed-request-secret"))
      .toBe("/track/[REDACTED]")
  })
})
