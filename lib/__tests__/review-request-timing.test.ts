import { describe, expect, it } from "vitest"

import {
  getReviewFulfilmentAt,
  isReviewFulfilmentOldEnough,
  isSydneyReviewRequestHour,
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
