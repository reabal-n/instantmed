import { describe, expect, it } from "vitest"

import {
  DEFAULT_FLAGS,
  FLAG_KEYS,
  getFlagInfo,
  type FeatureFlags,
} from "@/lib/data/types/feature-flags"

describe("cockpit_v2 feature flag", () => {
  it("is registered in FLAG_KEYS", () => {
    expect(FLAG_KEYS.COCKPIT_V2).toBe("cockpit_v2")
  })

  it("is typed on the FeatureFlags interface", () => {
    const sample: FeatureFlags = { ...DEFAULT_FLAGS }
    expect(typeof sample.cockpit_v2).toBe("boolean")
  })

  it("defaults to false", () => {
    expect(DEFAULT_FLAGS.cockpit_v2).toBe(false)
  })

  it("has a label and a description in getFlagInfo", () => {
    const info = getFlagInfo(FLAG_KEYS.COCKPIT_V2)
    expect(info.label.length).toBeGreaterThan(2)
    expect(info.description.length).toBeGreaterThan(20)
  })
})
