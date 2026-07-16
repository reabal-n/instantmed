import { describe, expect, it } from "vitest"

import { keepCanonicalCheckoutReminderCandidates } from "@/lib/email/checkout-reminder-dedupe"

describe("checkout reminder dedupe", () => {
  it("keeps only the newest unpaid request for the same email and service", () => {
    const older = {
      category: "prescription",
      createdAt: "2026-07-15T00:00:00.000Z",
      email: "Patient@Example.com",
      id: "older",
      subtype: "repeat",
    }
    const newer = {
      ...older,
      createdAt: "2026-07-15T01:00:00.000Z",
      email: " patient@example.com ",
      id: "newer",
    }

    expect(
      keepCanonicalCheckoutReminderCandidates([older, newer], [older, newer]),
    ).toEqual([newer])
  })

  it("suppresses an older reminder when a newer sibling has already been paid", () => {
    const abandoned = {
      category: "prescription",
      createdAt: "2026-07-15T00:00:00.000Z",
      email: "patient@example.com",
      id: "abandoned",
      subtype: "repeat",
    }
    const newerPaidSibling = {
      ...abandoned,
      createdAt: "2026-07-15T02:00:00.000Z",
      id: "paid",
    }

    expect(
      keepCanonicalCheckoutReminderCandidates([abandoned], [abandoned, newerPaidSibling]),
    ).toEqual([])
  })

  it("does not merge different service subtypes", () => {
    const ed = {
      category: "consult",
      createdAt: "2026-07-15T00:00:00.000Z",
      email: "patient@example.com",
      id: "ed",
      subtype: "ed",
    }
    const hairLoss = {
      ...ed,
      createdAt: "2026-07-15T01:00:00.000Z",
      id: "hair-loss",
      subtype: "hair_loss",
    }

    expect(
      keepCanonicalCheckoutReminderCandidates([ed, hairLoss], [ed, hairLoss]),
    ).toEqual([ed, hairLoss])
  })
})
