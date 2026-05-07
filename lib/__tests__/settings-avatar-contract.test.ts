import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("settings avatar contract", () => {
  it("persists preset and uploaded avatars through server-mediated profile updates", () => {
    const actionSource = read("app/actions/profile-avatar.ts")
    const storageSource = read("lib/account/avatar-storage.ts")
    const uploadSource = read("components/settings/profile-avatar-upload.tsx")
    const patientSettingsSource = read("app/patient/settings/settings-client.tsx")
    const doctorSettingsSource = read("app/doctor/settings/identity/identity-settings-client.tsx")

    expect(actionSource).toContain("setProfileAvatarPresetAction")
    expect(actionSource).toContain("uploadProfileAvatarAction")
    expect(actionSource).toContain("updateProfile(authUser.profile.id, { avatar_url: avatarValue })")
    expect(actionSource).toContain("MAX_AVATAR_BYTES = 1024 * 1024")
    expect(storageSource).toContain("AVATAR_UPLOAD_VALUE_PREFIX")
    expect(storageSource).toContain("createSignedUrl")
    expect(uploadSource).toContain("accept=\"image/jpeg,image/png,image/webp\"")
    expect(uploadSource).toContain("aria-label=\"Upload avatar image\"")
    expect(patientSettingsSource).toContain("ProfileAvatarUpload")
    expect(patientSettingsSource).toContain("setProfileAvatarPresetAction")
    expect(patientSettingsSource).toContain("customAvatarUrl={getAvatarPresetId(avatarDisplayUrl) ? null : avatarDisplayUrl}")
    expect(doctorSettingsSource).toContain("ProfileAvatarUpload")
    expect(doctorSettingsSource).toContain("setProfileAvatarPresetAction")
    expect(read("components/ui/avatar-picker.tsx")).toContain("Using uploaded photo")
  })

  it("resolves private uploaded avatars before rendering authenticated shells", () => {
    expect(read("app/patient/layout.tsx")).toContain("resolveProfileAvatarUrl")
    expect(read("app/doctor/layout.tsx")).toContain("resolveProfileAvatarUrl")
    expect(read("components/shared/dashboard-sidebar.tsx")).toContain("userAvatar")
  })

  it("keeps patient profile PATCH protected with the CSRF fetch helper", () => {
    const patientSettingsSource = read("app/patient/settings/settings-client.tsx")

    expect(patientSettingsSource).toContain("fetchWithCsrf")
    expect(patientSettingsSource).not.toContain('fetch("/api/patient/profile"')
  })
})
