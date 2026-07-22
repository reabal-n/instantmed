import { beforeEach, describe, expect, it } from "vitest"

import {
  ATTRIBUTION_COOKIE_KEY,
  captureAttribution,
  getAttribution,
  mergeAttributionByRecency,
} from "@/lib/analytics/attribution"

let sessionStorageState: Record<string, string>
let localStorageState: Record<string, string>
let cookieJar: string
let locationState: { search: string; pathname: string; protocol: string }

function installBrowserGlobals() {
  Object.defineProperty(global, "window", {
    value: {
      get location() {
        return locationState
      },
    },
    writable: true,
  })

  Object.defineProperty(global, "document", {
    value: {
      referrer: "",
      get cookie() {
        return cookieJar
      },
      set cookie(value: string) {
        cookieJar = value.split(";")[0] ?? ""
      },
    },
    writable: true,
  })

  Object.defineProperty(global, "sessionStorage", {
    value: {
      getItem: (key: string) => sessionStorageState[key] ?? null,
      setItem: (key: string, value: string) => {
        sessionStorageState[key] = value
      },
      removeItem: (key: string) => {
        delete sessionStorageState[key]
      },
    },
    writable: true,
  })

  Object.defineProperty(global, "localStorage", {
    value: {
      getItem: (key: string) => localStorageState[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageState[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageState[key]
      },
    },
    writable: true,
  })
}

beforeEach(() => {
  sessionStorageState = {}
  localStorageState = {}
  cookieJar = ""
  locationState = { search: "", pathname: "/", protocol: "https:" }
  installBrowserGlobals()
})

describe("attribution capture", () => {
  it.each([
    "/track/signed-request-access",
    "/track/request",
    "/resume/signed-checkout-resume",
    "/patient/intakes/11111111-1111-4111-8111-111111111111",
    "/doctor/intakes/11111111-1111-4111-8111-111111111111",
    "/auth/post-signin",
    "/sign-in",
  ])("never persists a capability or private-app route (%s)", (pathname) => {
    locationState = {
      search: "?utm_source=email&utm_campaign=transactional",
      pathname,
      protocol: "https:",
    }

    captureAttribution()

    expect(sessionStorageState).toEqual({})
    expect(localStorageState).toEqual({})
    expect(cookieJar).toBe("")
  })

  it("persists Google click IDs to session storage and a first-party cookie", () => {
    locationState = {
      search: "?gclid=test-click&utm_source=google&utm_id=123456&utm_campaign=med-cert&campaignid=111&adgroupid=222&keyword=medical%20certificate&creative=333&matchtype=e&device=m&network=g",
      pathname: "/medical-certificate",
      protocol: "https:",
    }
    Object.defineProperty(document, "referrer", {
      value: "https://www.google.com/",
      configurable: true,
    })

    captureAttribution()

    expect(getAttribution()).toMatchObject({
      gclid: "test-click",
      utm_source: "google",
      utm_id: "123456",
      utm_campaign: "med-cert",
      campaignid: "111",
      adgroupid: "222",
      keyword: "medical certificate",
      creative: "333",
      matchtype: "e",
      device: "m",
      network: "g",
      landing_page: "/medical-certificate",
      referrer: "https://www.google.com/",
    })
    expect(cookieJar.startsWith(`${ATTRIBUTION_COOKIE_KEY}=`)).toBe(true)
    expect(localStorageState[ATTRIBUTION_COOKIE_KEY]).toBeTruthy()
  })

  it("attributes a Meta fbclid click to facebook / paid instead of direct", () => {
    locationState = { search: "?fbclid=fb_abc123", pathname: "/medical-certificate", protocol: "https:" }

    captureAttribution()

    expect(getAttribution()).toMatchObject({ utm_source: "facebook", utm_medium: "paid" })
  })

  it("does not override an explicit utm_source even when a non-Google click id is present", () => {
    locationState = {
      search: "?fbclid=fb_abc123&utm_source=newsletter&utm_medium=email",
      pathname: "/",
      protocol: "https:",
    }

    captureAttribution()

    expect(getAttribution().utm_source).toBe("newsletter")
  })

  it("lets a later paid click replace earlier direct-session context", () => {
    captureAttribution()

    locationState = {
      search: "?gclid=paid-click&utm_source=google",
      pathname: "/request",
      protocol: "https:",
    }

    captureAttribution()

    expect(getAttribution()).toMatchObject({
      gclid: "paid-click",
      utm_source: "google",
      landing_page: "/request",
    })
  })

  it("falls back to the attribution cookie when session storage is empty", () => {
    const encoded = encodeURIComponent(JSON.stringify({ gclid: "cookie-click", landing_page: "/request" }))
    cookieJar = `${ATTRIBUTION_COOKIE_KEY}=${encoded}`

    expect(getAttribution()).toMatchObject({
      gclid: "cookie-click",
      landing_page: "/request",
    })
  })

  it("falls back to local storage when a new tab has no session attribution", () => {
    locationState = {
      search: "?gclid=durable-click&utm_source=google",
      pathname: "/medical-certificate",
      protocol: "https:",
    }

    captureAttribution()
    sessionStorageState = {}
    cookieJar = ""

    expect(getAttribution()).toMatchObject({
      gclid: "durable-click",
      utm_source: "google",
      landing_page: "/medical-certificate",
    })
  })

  it("prefers newer middleware-cookie Google attribution over stale browser storage", () => {
    sessionStorageState[ATTRIBUTION_COOKIE_KEY] = JSON.stringify({
      landing_page: "/",
      captured_at: "2026-07-01T00:00:00.000Z",
    })
    localStorageState[ATTRIBUTION_COOKIE_KEY] = JSON.stringify({
      landing_page: "/",
      captured_at: "2026-07-01T00:00:00.000Z",
    })
    cookieJar = `${ATTRIBUTION_COOKIE_KEY}=${encodeURIComponent(
      JSON.stringify({
        gclid: "cookie-click",
        utm_source: "google",
        utm_medium: "cpc",
        campaignid: "23957241733",
        adgroupid: "197810760419",
        landing_page: "/erectile-dysfunction",
        captured_at: "2026-07-07T00:00:00.000Z",
      }),
    )}`
    locationState = {
      search: "",
      pathname: "/request",
      protocol: "https:",
    }

    captureAttribution()

    expect(getAttribution()).toMatchObject({
      gclid: "cookie-click",
      utm_source: "google",
      utm_medium: "cpc",
      campaignid: "23957241733",
      adgroupid: "197810760419",
      landing_page: "/erectile-dysfunction",
      captured_at: "2026-07-07T00:00:00.000Z",
    })
  })

  it("merges attribution by capture recency without dropping older paid identifiers", () => {
    expect(
      mergeAttributionByRecency(
        {
          gclid: "old-click",
          campaignid: "old-campaign",
          landing_page: "/medical-certificate",
          captured_at: "2026-07-01T00:00:00.000Z",
        },
        {
          utm_content: "new-creative",
          landing_page: "/request",
          captured_at: "2026-07-07T00:00:00.000Z",
        },
      ),
    ).toMatchObject({
      gclid: "old-click",
      campaignid: "old-campaign",
      utm_content: "new-creative",
      landing_page: "/request",
      captured_at: "2026-07-07T00:00:00.000Z",
    })
  })
})
