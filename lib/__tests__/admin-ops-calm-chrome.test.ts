import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..")

// Word-bounded so `bg-amber-500` (the legitimate 8px dot) is not falsely
// matched as `bg-amber-50` substring. Only `-50` or `-100` followed by a
// non-digit (or end of string) counts as a tinted backdrop.
const FORBIDDEN_BG_CLASS_RE = /bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/

const FILES_UNDER_TEST = [
  "app/admin/ops/page.tsx",
  "app/admin/ops/ops-client.tsx",
  "components/operator/counter-card.tsx",
  "components/operator/cases/recovery-row.tsx",
] as const

describe("Calm-chrome contract: /admin/ops surface", () => {
  it.each(FILES_UNDER_TEST)(
    "%s does not use colored-background pills on routine status",
    (relativePath) => {
      const contents = readFileSync(join(REPO_ROOT, relativePath), "utf8")
      const match = contents.match(FORBIDDEN_BG_CLASS_RE)
      expect(
        match,
        match
          ? `Calm-chrome violation in ${relativePath}: found "${match[0]}". Use StatusDot/SemanticDot + plain text for routine status; colored-background Badge variants are reserved for exception states (Refunded, Priority, etc.) on row chrome, not this surface.`
          : "no match",
      ).toBeNull()
    },
  )
})
