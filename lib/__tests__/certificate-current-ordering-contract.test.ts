import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function selectorBlock(source: string, anchor: string): string {
  const start = source.indexOf(anchor)
  const end = source.indexOf(".limit(1)", start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("current certificate ordering contract", () => {
  it.each([
    {
      path: "lib/data/documents.ts",
      anchor: "export async function getMedCertCertificateForIntake",
    },
    {
      path: "lib/email/send-email.ts",
      anchor: "const { data: currentCertificate, error: currentCertificateError }",
    },
    {
      path: "app/actions/resend-certificate.ts",
      anchor: "// No certificate found. Distinguish",
    },
    {
      path: "app/actions/revoke-cert.ts",
      anchor: "// 2. FETCH CERTIFICATE RECORD",
    },
    {
      path: "app/actions/undo-cert-approval.ts",
      anchor: "// 2. Fetch the most recent certificate",
    },
  ])("uses created_at DESC then id DESC in $path", ({ path, anchor }) => {
    const block = selectorBlock(readSource(path), anchor)

    expect(block).toMatch(
      /\.order\("created_at", \{ ascending: false \}\)\s*\.order\("id", \{ ascending: false \}\)/,
    )
  })
})
