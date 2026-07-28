import { describe, expect, it } from "vitest"

import {
  resolveSydneyClosedDay,
  resolveSydneyDateWindow,
} from "@/lib/ads-agent/time"

describe("Google Ads Agent Sydney time windows", () => {
  it("resolves the previous closed AEST day", () => {
    expect(resolveSydneyClosedDay(new Date("2026-07-27T23:00:00.000Z"))).toEqual({
      reportDate: "2026-07-27",
      startUtc: "2026-07-26T14:00:00.000Z",
      endUtcExclusive: "2026-07-27T14:00:00.000Z",
    })
  })

  it("resolves the previous closed AEDT day", () => {
    expect(resolveSydneyClosedDay(new Date("2026-12-14T22:00:00.000Z"))).toEqual({
      reportDate: "2026-12-14",
      startUtc: "2026-12-13T13:00:00.000Z",
      endUtcExclusive: "2026-12-14T13:00:00.000Z",
    })
  })

  it("derives a rolling window from Sydney date keys across a DST boundary", () => {
    expect(resolveSydneyDateWindow("2026-10-20", 30)).toEqual({
      startDate: "2026-09-21",
      endDate: "2026-10-20",
      startUtc: "2026-09-20T14:00:00.000Z",
      endUtcExclusive: "2026-10-20T13:00:00.000Z",
    })
  })

  it("rejects invalid dates and day counts", () => {
    expect(() => resolveSydneyClosedDay(new Date("invalid"))).toThrow(
      "Cannot resolve a Sydney Ads window from an invalid date",
    )
    expect(() => resolveSydneyDateWindow("2026-07-27", 0)).toThrow(
      "Sydney Ads window days must be a positive integer",
    )
    expect(() => resolveSydneyDateWindow("2026-02-30", 30)).toThrow(
      "Invalid Sydney date key",
    )
  })
})
