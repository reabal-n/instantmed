import { afterEach, describe, expect, it, vi } from "vitest"

import { getAvailabilityMessage, getBusinessHoursDisplay, getEstimatedResponseTime } from "@/lib/utils/time-of-day"

describe("time-of-day request availability", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps all request types accepting submissions outside review hours", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T13:30:00.000Z")) // 11:30pm Australia/Sydney

    const availability = getAvailabilityMessage("repeat-script")

    expect(availability.isActive).toBe(true)
    expect(availability.message).toBe("Accepting requests now")
    expect(availability.subtext).toBe("Doctor review follows when available")
    expect(`${availability.message} ${availability.subtext}`).not.toMatch(/resume|begin|8am|closed/i)
  })

  it("does not frame response timing as a submission window", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T13:30:00.000Z")) // 11:30pm Australia/Sydney

    expect(getEstimatedResponseTime("repeat-script")).toBe("after doctor review")
    expect(getBusinessHoursDisplay()).toBe("Requests accepted 24/7; doctor review timing varies")
  })
})
