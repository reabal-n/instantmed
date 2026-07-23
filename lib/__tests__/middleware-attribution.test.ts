import { NextRequest, NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import {
  ATTRIBUTION_COOKIE_KEY,
  captureAttributionToCookie,
} from "@/lib/analytics/middleware-attribution"

function buildRequest(
  url: string,
  init?: { cookieValue?: string; referer?: string },
): NextRequest {
  const headers = new Headers()
  if (init?.referer) headers.set("referer", init.referer)
  if (init?.cookieValue) {
    headers.set("cookie", `${ATTRIBUTION_COOKIE_KEY}=${init.cookieValue}`)
  }
  return new NextRequest(url, { headers })
}

function decodeAttributionCookie(value: string): Record<string, unknown> {
  return JSON.parse(decodeURIComponent(value)) as Record<string, unknown>
}

describe("captureAttributionToCookie", () => {
  it.each([
    "/track/signed-request-access",
    "/track/request",
    "/resume/signed-checkout-resume",
    "/patient/intakes/11111111-1111-4111-8111-111111111111",
    "/admin/intakes/11111111-1111-4111-8111-111111111111",
    "/auth/post-signin",
  ])("does not persist a capability or private pathname even when UTMs are appended (%s)", (pathname) => {
    const req = buildRequest(
      `https://instantmed.com.au${pathname}?utm_source=email&utm_campaign=transactional`,
    )
    const response = captureAttributionToCookie(req, NextResponse.next())

    expect(response.cookies.get(ATTRIBUTION_COOKIE_KEY)).toBeUndefined()
  })

  it("is a no-op when the URL has no attribution params", () => {
    const req = buildRequest("https://instantmed.com.au/medical-certificate")
    const res = NextResponse.next()
    const out = captureAttributionToCookie(req, res)

    expect(out).toBe(res)
    expect(out.cookies.get(ATTRIBUTION_COOKIE_KEY)).toBeUndefined()
  })

  it("attributes a Meta fbclid-only URL to facebook / paid (not a no-op)", () => {
    // fbclid is not in ATTRIBUTION_PARAM_KEYS, so without the derivation this
    // would be a no-op and the paid click would be lost as "direct".
    const req = buildRequest("https://instantmed.com.au/medical-certificate?fbclid=fb_abc")
    const res = NextResponse.next()
    const out = captureAttributionToCookie(req, res)

    const cookie = out.cookies.get(ATTRIBUTION_COOKIE_KEY)
    expect(cookie).toBeDefined()
    const data = decodeAttributionCookie(cookie!.value)
    expect(data.utm_source).toBe("facebook")
    expect(data.utm_medium).toBe("paid")
  })

  it("does not override an explicit utm_source when a click id is also present", () => {
    const req = buildRequest(
      "https://instantmed.com.au/?fbclid=fb&utm_source=newsletter&utm_medium=email",
    )
    const res = NextResponse.next()
    const out = captureAttributionToCookie(req, res)

    const data = decodeAttributionCookie(out.cookies.get(ATTRIBUTION_COOKIE_KEY)!.value)
    expect(data.utm_source).toBe("newsletter")
  })

  it("writes gclid + utm + landing page when present", () => {
    const req = buildRequest(
      "https://instantmed.com.au/medical-certificate?gclid=abc123&utm_source=google&utm_medium=cpc&utm_campaign=medcert_au",
      { referer: "https://www.google.com.au/" },
    )
    const res = NextResponse.next()
    const out = captureAttributionToCookie(req, res)

    const cookie = out.cookies.get(ATTRIBUTION_COOKIE_KEY)
    expect(cookie).toBeDefined()
    expect(cookie?.sameSite).toBe("lax")
    expect(cookie?.secure).toBe(true)
    expect(cookie?.path).toBe("/")

    const data = decodeAttributionCookie(cookie!.value)
    expect(data.gclid).toBe("abc123")
    expect(data.utm_source).toBe("google")
    expect(data.utm_medium).toBe("cpc")
    expect(data.utm_campaign).toBe("medcert_au")
    expect(data.landing_page).toBe("/medical-certificate")
    expect(data.referrer).toBe("https://www.google.com.au/")
    expect(typeof data.captured_at).toBe("string")
  })

  it("captures all 13 ValueTrack + UTM keys when present", () => {
    const req = buildRequest(
      "https://instantmed.com.au/?gclid=g1&gbraid=g2&wbraid=g3" +
        "&utm_source=google&utm_medium=cpc&utm_id=u1&utm_campaign=c&utm_content=ct&utm_term=tm" +
        "&campaignid=11&adgroupid=22&keyword=kw&creative=cr&matchtype=e&device=m&network=g",
    )
    const out = captureAttributionToCookie(req, NextResponse.next())
    const cookie = out.cookies.get(ATTRIBUTION_COOKIE_KEY)!
    const data = decodeAttributionCookie(cookie.value)

    expect(data.gclid).toBe("g1")
    expect(data.gbraid).toBe("g2")
    expect(data.wbraid).toBe("g3")
    expect(data.utm_id).toBe("u1")
    expect(data.utm_term).toBe("tm")
    expect(data.campaignid).toBe("11")
    expect(data.adgroupid).toBe("22")
    expect(data.keyword).toBe("kw")
    expect(data.matchtype).toBe("e")
    expect(data.device).toBe("m")
    expect(data.network).toBe("g")
  })

  it("merges new params over an existing cookie (latest paid click wins)", () => {
    const existing = encodeURIComponent(
      JSON.stringify({
        gclid: "old_gclid",
        utm_source: "google",
        utm_campaign: "old_campaign",
        landing_page: "/erectile-dysfunction",
        captured_at: "2026-04-01T00:00:00.000Z",
      }),
    )
    const req = buildRequest(
      "https://instantmed.com.au/medical-certificate?gclid=new_gclid&utm_campaign=new_campaign",
      { cookieValue: existing },
    )
    const out = captureAttributionToCookie(req, NextResponse.next())
    const data = decodeAttributionCookie(out.cookies.get(ATTRIBUTION_COOKIE_KEY)!.value)

    expect(data.gclid).toBe("new_gclid")
    expect(data.utm_campaign).toBe("new_campaign")
    expect(data.utm_source).toBe("google") // preserved from existing
    expect(data.landing_page).toBe("/medical-certificate") // updated to latest
  })

  it("starts fresh when the existing cookie is malformed", () => {
    const req = buildRequest(
      "https://instantmed.com.au/?gclid=valid",
      { cookieValue: "not-valid-json-at-all" },
    )
    const out = captureAttributionToCookie(req, NextResponse.next())
    const data = decodeAttributionCookie(out.cookies.get(ATTRIBUTION_COOKIE_KEY)!.value)

    expect(data.gclid).toBe("valid")
  })

  it("does not set Secure on http origins (preview/dev)", () => {
    const req = buildRequest("http://localhost:3000/?gclid=x")
    const out = captureAttributionToCookie(req, NextResponse.next())

    expect(out.cookies.get(ATTRIBUTION_COOKIE_KEY)?.secure).toBe(false)
  })

  it("attaches a 30-day Max-Age", () => {
    const req = buildRequest("https://instantmed.com.au/?gclid=x")
    const out = captureAttributionToCookie(req, NextResponse.next())

    const cookie = out.cookies.get(ATTRIBUTION_COOKIE_KEY)!
    expect(cookie.maxAge).toBe(60 * 60 * 24 * 30)
  })

  it("preserves prior referrer when the new request has no referer header", () => {
    const existing = encodeURIComponent(
      JSON.stringify({ referrer: "https://www.google.com.au/" }),
    )
    const req = buildRequest("https://instantmed.com.au/?gclid=x", {
      cookieValue: existing,
    })
    const out = captureAttributionToCookie(req, NextResponse.next())
    const data = decodeAttributionCookie(out.cookies.get(ATTRIBUTION_COOKIE_KEY)!.value)

    expect(data.referrer).toBe("https://www.google.com.au/")
  })
})
