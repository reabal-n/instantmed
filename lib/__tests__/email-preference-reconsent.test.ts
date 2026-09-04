import { describe, expect, it } from "vitest"

import { buildExplicitEmailPreferenceUpdate } from "@/lib/email/preference-updates"

const UPDATED_AT = "2026-09-05T06:00:00.000Z"

describe("explicit email preference re-consent", () => {
  it("does not turn an empty update into re-enablement evidence", () => {
    expect(buildExplicitEmailPreferenceUpdate({}, UPDATED_AT)).toEqual({})
  })
  it("does not accept identity or timestamp fields from preference input", () => {
    expect(buildExplicitEmailPreferenceUpdate({
      marketing_emails: true, profile_id: "another-owner", preferences_changed_at: "2099-01-01",
    } as never, UPDATED_AT)).not.toHaveProperty("profile_id")
  })
  it.each([
    { marketing_emails: true },
    { abandoned_checkout_emails: true },
    { marketing_emails: true, abandoned_checkout_emails: false },
  ])("clears stale unsubscribe metadata for deliberate opt-in %#", (preferences) => {
    expect(buildExplicitEmailPreferenceUpdate(preferences, UPDATED_AT)).toEqual({
      ...preferences,
      unsubscribed_at: null,
      unsubscribe_reason: null,
      preferences_changed_at: UPDATED_AT,
      updated_at: UPDATED_AT,
    })
  })

  it.each([
    { marketing_emails: false },
    { abandoned_checkout_emails: false },
    { marketing_emails: false, abandoned_checkout_emails: false },
  ])("does not treat a false-only update as re-consent %#", (preferences) => {
    expect(buildExplicitEmailPreferenceUpdate(preferences, UPDATED_AT)).toEqual({
      ...preferences,
      preferences_changed_at: UPDATED_AT,
      updated_at: UPDATED_AT,
    })
  })
})
