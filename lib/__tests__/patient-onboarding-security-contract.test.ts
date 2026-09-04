import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("patient onboarding security contract", () => {
  it("routes optional onboarding PHI through the canonical encrypted profile writer", () => {
    const source = read("app/patient/onboarding/actions.ts")

    expect(source).toContain('import { updateProfile } from "@/lib/data/profiles"')
    expect(source).toContain("await updateProfile(authUser.profile.id")
    expect(source).not.toContain('from("profiles")')
    expect(source).not.toContain("createServiceRoleClient")
  })

  it("does not force incomplete patient profiles through onboarding at sign-in", () => {
    const source = read("app/auth/post-signin/page.tsx")

    expect(source).toContain("profile completion is progressive and optional")
    expect(source).not.toContain('profile.onboarding_completed ? "/patient" : "/patient/onboarding"')
  })
})
