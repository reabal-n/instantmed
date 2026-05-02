import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const PUBLIC_COPY_ROOTS = [
  "app",
  "components/marketing",
  "components/patient",
  "components/request",
  "lib/data",
  "lib/email",
  "lib/marketing",
  "lib/microcopy",
  "lib/seo",
  "lib/sms",
]

const IGNORED_PATH_PARTS = [
  "/app/admin/",
  "/app/api/",
  "/app/cert-preview/",
  "/app/doctor/",
  "/app/email-preview/",
  "/lib/data/analytics.ts",
  "/lib/data/intakes/",
  "/lib/data/reconciliation.ts",
  "/lib/data/types/",
  "/lib/seo/data/conditions/",
  "/lib/seo/data/symptoms/",
  "/__snapshots__/",
]

const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".md"])

function collectFiles(path: string): string[] {
  const absolute = join(process.cwd(), path)
  const stat = statSync(absolute)
  if (stat.isFile()) return [path]

  return readdirSync(absolute).flatMap((entry) => collectFiles(join(path, entry)))
}

function isPublicCopyFile(path: string) {
  const normalized = `/${path}`
  if (IGNORED_PATH_PARTS.some((part) => normalized.includes(part))) return false
  return [...FILE_EXTENSIONS].some((extension) => path.endsWith(extension))
}

describe("public request funnel timing claims", () => {
  it("does not hardcode customer-facing doctor review or delivery-time promises", () => {
    const publicFiles = PUBLIC_COPY_ROOTS
      .flatMap(collectFiles)
      .filter(isPublicCopyFile)

    const forbidden = [
      "averageresponseminutes",
      "certturnaroundminutes",
      "samedaydeliverypercent",
      "average review time",
      "avg response",
      "under 30 minutes",
      "under an hour",
      "within the hour",
      "within an hour",
      "reviewed within",
      "approved within an hour",
      "requests approved within",
      "most requests reviewed within",
      "most certificates are reviewed within",
      "reviewed in ~",
      "certificate in 15 minutes",
      "get your certificate in 15 minutes",
      "eta: ~15",
      "~15 min",
      "~30 min med cert",
      "~45 min",
      "~45 mins",
      "same-day where appropriate",
      "reviewed same-day",
      "delivered same day",
      "sent same day",
      "fulfilled same day",
    ]

    const offenders = publicFiles.flatMap((path) => {
      const copy = readFileSync(join(process.cwd(), path), "utf8").toLowerCase()
      return forbidden
        .filter((phrase) => copy.includes(phrase))
        .map((phrase) => `${path}: ${phrase}`)
    })

    expect(offenders).toEqual([])
  })
})
