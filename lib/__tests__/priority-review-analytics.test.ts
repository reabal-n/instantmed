import { describe, expect, it, vi } from "vitest"

import {
  capturePriorityReviewOptedIn,
  capturePriorityReviewOptedOut,
} from "@/lib/analytics/priority-review-events"

describe("priority review analytics", () => {
  it("dual-emits current Priority events and legacy Express aliases", () => {
    const posthog = { capture: vi.fn() }

    capturePriorityReviewOptedIn(posthog, {
      service_type: "repeat-script",
      surface: "review",
    })
    capturePriorityReviewOptedOut(posthog, {
      service_type: "med-cert",
      surface: "checkout",
    })

    expect(posthog.capture).toHaveBeenCalledWith("priority_review_opted_in", {
      service_type: "repeat-script",
      surface: "review",
    })
    expect(posthog.capture).toHaveBeenCalledWith("express_review_opted_in", {
      service_type: "repeat-script",
      surface: "review",
      legacy_alias_for: "priority_review_opted_in",
    })
    expect(posthog.capture).toHaveBeenCalledWith("priority_review_opted_out", {
      service_type: "med-cert",
      surface: "checkout",
    })
    expect(posthog.capture).toHaveBeenCalledWith("express_review_opted_out", {
      service_type: "med-cert",
      surface: "checkout",
      legacy_alias_for: "priority_review_opted_out",
    })
  })
})
