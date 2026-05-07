import { describe, expect, it } from "vitest"

import {
  AVATAR_PRESETS,
  getAvatarPresetId,
  getAvatarPresetUrl,
} from "@/lib/account/avatar-presets"

describe("avatar presets", () => {
  it("resolves canonical preset ids and urls", () => {
    const preset = AVATAR_PRESETS[0]

    expect(getAvatarPresetUrl(preset.id)).toBe(preset.url)
    expect(getAvatarPresetId(preset.url)).toBe(preset.id)
  })

  it("does not default uploaded or unknown avatars to a preset", () => {
    expect(getAvatarPresetId("avatar:user-id/custom.webp")).toBeNull()
    expect(getAvatarPresetId("https://example.com/avatar.webp")).toBeNull()
    expect(getAvatarPresetId(null)).toBeNull()
  })
})
