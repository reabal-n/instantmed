import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildPrescriptionRenewalHref,
  REQUEST_REPEAT_SCRIPT_HREF,
} from "@/lib/dashboard/routes"

function collectSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  if (statSync(dir).isFile()) return /\.(ts|tsx)$/.test(dir) ? [dir] : []

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : []
  })
}

describe("request links", () => {
  it("sends prescription CTAs to the canonical repeat-script intake", () => {
    const dashboardHero = readFileSync(
      join(process.cwd(), "components/patient/dashboard-hero.tsx"),
      "utf8",
    )
    const source = [
      ...collectSourceFiles(join(process.cwd(), "app/patient")),
      ...collectSourceFiles(join(process.cwd(), "app/manifest.ts")),
      ...collectSourceFiles(join(process.cwd(), "components/patient")),
      ...collectSourceFiles(join(process.cwd(), "components/marketing")),
      ...collectSourceFiles(join(process.cwd(), "lib/dashboard/routes.ts")),
      ...collectSourceFiles(join(process.cwd(), "lib/marketing")),
      ...collectSourceFiles(join(process.cwd(), "lib/seo/data/guides")),
    ].map((file) => readFileSync(file, "utf8")).join("\n")

    expect(REQUEST_REPEAT_SCRIPT_HREF).toBe("/request?service=repeat-script")
    expect(source).toContain(REQUEST_REPEAT_SCRIPT_HREF)
    expect(source).not.toContain("/request?service=prescription")
    expect(dashboardHero).toContain('serviceParam: "repeat-script"')
    expect(dashboardHero).not.toContain('serviceParam: "prescription"')
  })

  it("builds record-specific renewal links from the opaque prescription id only", () => {
    const prescriptionsClient = readFileSync(
      join(process.cwd(), "app/patient/prescriptions/client.tsx"),
      "utf8",
    )
    const dashboardHero = readFileSync(
      join(process.cwd(), "components/patient/dashboard-hero.tsx"),
      "utf8",
    )
    const dashboardActivity = readFileSync(
      join(process.cwd(), "components/patient/dashboard-activity.tsx"),
      "utf8",
    )
    const href = buildPrescriptionRenewalHref("rx/id?not-phi")
    const url = new URL(href, "https://instantmed.com.au")

    expect(url.pathname).toBe("/request")
    expect([...url.searchParams.entries()]).toEqual([
      ["service", "repeat-script"],
      ["renewal", "rx/id?not-phi"],
    ])
    expect(prescriptionsClient).toContain("buildPrescriptionRenewalHref(rx.id)")
    expect(dashboardHero).toContain("buildPrescriptionRenewalHref(prescription.id)")
    expect(dashboardActivity).toContain("buildPrescriptionRenewalHref(prescription.id)")
    expect(dashboardActivity).toContain("prescription.dosage_instructions?.trim()")
  })
})
