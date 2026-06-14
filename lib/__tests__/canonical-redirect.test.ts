import { describe, expect, it } from "vitest"

import { getCanonicalRedirect } from "@/lib/navigation/canonical-redirect"

// The middleware serves both /path and /path/ as HTTP 200 (Next's auto
// trailing-slash redirect is bypassed because middleware returns early), and
// the www->non-www 301 preserved the trailing slash — splitting authority
// across up to 4 URL variants. getCanonicalRedirect collapses host + trailing
// slash into a single 301 target. These tests pin the loop-safety and the
// /api exclusion (a wrong rule here = redirect loop or broken webhooks).
describe("getCanonicalRedirect", () => {
  it("strips a trailing slash on a normal path", () => {
    expect(getCanonicalRedirect("instantmed.com.au", "/medical-certificate/")).toEqual({
      pathname: "/medical-certificate",
    })
  })

  it("rewrites www -> non-www, preserving the (clean) path", () => {
    expect(getCanonicalRedirect("www.instantmed.com.au", "/medical-certificate")).toEqual({
      hostname: "instantmed.com.au",
    })
  })

  it("collapses www + trailing slash into ONE hop", () => {
    expect(getCanonicalRedirect("www.instantmed.com.au", "/medical-certificate/")).toEqual({
      hostname: "instantmed.com.au",
      pathname: "/medical-certificate",
    })
  })

  it("returns null for an already-canonical URL (no redirect, no loop)", () => {
    expect(getCanonicalRedirect("instantmed.com.au", "/medical-certificate")).toBeNull()
    expect(getCanonicalRedirect("instantmed.com.au", "/")).toBeNull()
  })

  it("never strips the root slash", () => {
    expect(getCanonicalRedirect("instantmed.com.au", "/")).toBeNull()
    // www root: host fixed, path left as "/"
    expect(getCanonicalRedirect("www.instantmed.com.au", "/")).toEqual({
      hostname: "instantmed.com.au",
    })
  })

  it("never touches /api/* path shapes (webhooks POST to exact paths)", () => {
    expect(getCanonicalRedirect("instantmed.com.au", "/api/webhooks/stripe/")).toBeNull()
    // www on an api path still consolidates host, but leaves the path intact
    expect(getCanonicalRedirect("www.instantmed.com.au", "/api/webhooks/stripe/")).toEqual({
      hostname: "instantmed.com.au",
    })
  })

  it("collapses multiple trailing slashes", () => {
    expect(getCanonicalRedirect("instantmed.com.au", "/blog//")).toEqual({
      pathname: "/blog",
    })
  })
})
