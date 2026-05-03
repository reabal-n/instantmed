import { beforeEach, describe, expect, it } from "vitest"

import {
  ATTRIBUTION_COOKIE_KEY,
  captureAttribution,
  getAttribution,
} from "@/lib/analytics/attribution"

let storage: Record<string, string>
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
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    },
    writable: true,
  })
}

beforeEach(() => {
  storage = {}
  cookieJar = ""
  locationState = { search: "", pathname: "/", protocol: "https:" }
  installBrowserGlobals()
})

describe("attribution capture", () => {
  it("persists Google click IDs to session storage and a first-party cookie", () => {
    locationState = {
      search: "?gclid=test-click&utm_source=google&utm_campaign=med-cert",
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
      utm_campaign: "med-cert",
      landing_page: "/medical-certificate",
      referrer: "https://www.google.com/",
    })
    expect(cookieJar.startsWith(`${ATTRIBUTION_COOKIE_KEY}=`)).toBe(true)
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
})
