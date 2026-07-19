import { describe, expect, it } from "vitest"

import {
  getNextSydneyReviewRequestRetryAt,
  getReviewFulfilmentAt,
  isReviewFulfilmentOldEnough,
  isReviewFulfilmentWithinCatchUpWindow,
  isSydneyReviewRequestHour,
  REVIEW_REQUEST_CATCH_UP_DAYS,
  REVIEW_REQUEST_DELAY_HOURS,
} from "@/lib/email/review-request-timing"

describe("review request timing", () => {
  it("uses confirmed document or eScript fulfilment rather than approval", () => {
    expect(
      getReviewFulfilmentAt({
        category: "medical_certificate",
        document_sent_at: "2026-07-15T00:00:00.000Z",
        script_sent_at: null,
      }),
    ).toBe("2026-07-15T00:00:00.000Z")

    expect(
      getReviewFulfilmentAt({
        category: "prescription",
        document_sent_at: null,
        script_sent_at: "2026-07-15T01:00:00.000Z",
      }),
    ).toBe("2026-07-15T01:00:00.000Z")

    expect(
      getReviewFulfilmentAt({
        category: "consult",
        document_sent_at: null,
        script_sent_at: "2026-07-15T02:00:00.000Z",
      }),
    ).toBe("2026-07-15T02:00:00.000Z")
  })

  it("becomes eligible at 48 hours and remains eligible after 72 hours", () => {
    const now = new Date("2026-07-17T10:00:00.000Z")
    const intake = {
      category: "medical_certificate",
      document_sent_at: "2026-07-15T10:00:00.000Z",
      script_sent_at: null,
    }

    expect(REVIEW_REQUEST_DELAY_HOURS).toBe(48)
    expect(isReviewFulfilmentOldEnough(intake, now)).toBe(true)
    expect(
      isReviewFulfilmentOldEnough(
        { ...intake, document_sent_at: "2026-07-14T09:59:59.000Z" },
        now,
      ),
    ).toBe(true)
    expect(
      isReviewFulfilmentOldEnough(
        { ...intake, document_sent_at: "2026-07-15T10:00:01.000Z" },
        now,
      ),
    ).toBe(false)
  })

  it("selects 10:00 Sydney across daylight-saving transitions", () => {
    expect(isSydneyReviewRequestHour(new Date("2026-07-17T00:00:00.000Z"))).toBe(true)
    expect(isSydneyReviewRequestHour(new Date("2026-01-16T23:00:00.000Z"))).toBe(true)
    expect(isSydneyReviewRequestHour(new Date("2026-07-16T23:00:00.000Z"))).toBe(false)
    expect(isSydneyReviewRequestHour(new Date("2026-01-17T00:00:00.000Z"))).toBe(false)
  })

  it("bounds eligibility at the inclusive 120-day catch-up boundary", () => {
    const now = new Date("2026-07-17T10:00:00.000Z")
    const boundary = {
      category: "medical_certificate",
      document_sent_at: new Date(
        now.getTime() -
          REVIEW_REQUEST_CATCH_UP_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      script_sent_at: null,
    }

    expect(isReviewFulfilmentWithinCatchUpWindow(boundary, now)).toBe(true)
    expect(isReviewFulfilmentWithinCatchUpWindow({
      ...boundary,
      document_sent_at: new Date(
        new Date(boundary.document_sent_at).getTime() - 1,
      ).toISOString(),
    }, now)).toBe(false)
    expect(isReviewFulfilmentWithinCatchUpWindow({
      ...boundary,
      document_sent_at: new Date(
        now.getTime() - REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000 + 1,
      ).toISOString(),
    }, now)).toBe(false)
  })

  it("finds the next Sydney 10:00 retry across AEST and AEDT", () => {
    expect(
      getNextSydneyReviewRequestRetryAt(
        new Date("2026-07-16T23:30:00.000Z"),
      ),
    ).toBe("2026-07-17T00:00:00.000Z")
    expect(
      getNextSydneyReviewRequestRetryAt(
        new Date("2026-07-17T00:15:00.000Z"),
      ),
    ).toBe("2026-07-18T00:00:00.000Z")
    expect(
      getNextSydneyReviewRequestRetryAt(
        new Date("2026-01-17T00:00:00.000Z"),
      ),
    ).toBe("2026-01-17T23:00:00.000Z")
  })

  it("rejects missing or invalid fulfilment timestamps", () => {
    expect(
      isReviewFulfilmentOldEnough({
        category: "medical_certificate",
        document_sent_at: null,
        script_sent_at: null,
      }),
    ).toBe(false)
    expect(
      isReviewFulfilmentOldEnough({
        category: "prescription",
        document_sent_at: null,
        script_sent_at: "not-a-date",
      }),
    ).toBe(false)
  })
})
