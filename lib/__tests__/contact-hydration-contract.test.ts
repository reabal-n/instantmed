import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("contact page hydration contract", () => {
  const contactClientSource = readFileSync(
    join(root, "app/contact/contact-client.tsx"),
    "utf8",
  )
  const patientCountHookSource = readFileSync(
    join(root, "lib/hooks/use-patient-count.ts"),
    "utf8",
  )

  it("keeps the synthetic patient count off the contact page entirely", () => {
    // 2026-07-10: the interpolated patient count was removed from every public
    // surface (see synthetic-patient-count-contract.test.ts). The original
    // hydration concern is moot without the count; what must not return is
    // any render of it, hydration-safe or not.
    expect(contactClientSource).not.toContain("usePatientCount")
    expect(contactClientSource).not.toContain("getPatientCount")
  })

  it("keeps the hook SSR output stable until hydration completes", () => {
    expect(patientCountHookSource).toContain("useSyncExternalStore")
    expect(patientCountHookSource).toContain("return mounted ? count : ANCHOR_COUNT")
  })
})
