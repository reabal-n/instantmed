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

  it("keeps the patient count behind the hydration-safe hook", () => {
    expect(contactClientSource).toContain(
      'import { usePatientCount } from "@/lib/hooks/use-patient-count"',
    )
    expect(contactClientSource).toContain("const patientCount = usePatientCount()")
    expect(contactClientSource).not.toContain("getPatientCount().toLocaleString()")
  })

  it("keeps the hook SSR output stable until hydration completes", () => {
    expect(patientCountHookSource).toContain("useSyncExternalStore")
    expect(patientCountHookSource).toContain("return mounted ? count : ANCHOR_COUNT")
  })
})
