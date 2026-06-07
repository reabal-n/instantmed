import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { isPostConversionPath } from "@/lib/browser/post-conversion-path"

function setPath(pathname: string) {
  vi.stubGlobal("window", { location: { pathname } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("isPostConversionPath", () => {
  it("is true on the patient success page (where purchase_completed fires)", () => {
    setPath("/patient/intakes/success")
    expect(isPostConversionPath()).toBe(true)
  })

  it("is true on the guest complete-account page (where guest purchase fires)", () => {
    setPath("/auth/complete-account")
    expect(isPostConversionPath()).toBe(true)
  })

  it("is false on the request/intake flow", () => {
    setPath("/request")
    expect(isPostConversionPath()).toBe(false)
  })

  it("is false on a normal patient intake detail page", () => {
    setPath("/patient/intakes/3f2b9c10-0000-0000-0000-000000000000")
    expect(isPostConversionPath()).toBe(false)
  })

  it("is false during SSR (no window)", () => {
    // Node test env has no window unless stubbed.
    expect(isPostConversionPath()).toBe(false)
  })
})

describe("instrumentation-client telemetry gating (TRK-1 regression guard)", () => {
  const source = readFileSync(join(process.cwd(), "instrumentation-client.ts"), "utf8")

  it("imports the shared post-conversion-path helper", () => {
    expect(source).toContain('from "@/lib/browser/post-conversion-path"')
    expect(source).toContain("isPostConversionPath()")
  })

  it("starts PostHog and Sentry via the post-conversion bypass, not raw onFirstInteraction", () => {
    // Both init paths must route through startTelemetryWhenReady so the success
    // page fires purchase_completed without waiting for a click. A raw
    // onFirstInteraction() wrapper around init would reintroduce the dead pixel.
    expect(source).toContain("startTelemetryWhenReady(() => loadAndInitSentry())")
    expect(source).toContain("startTelemetryWhenReady(() => {")
    expect(source).not.toContain("onFirstInteraction(() => loadAndInitSentry())")
  })
})
