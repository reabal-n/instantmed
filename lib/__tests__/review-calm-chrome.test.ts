import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..")

// Word-bounded so `bg-amber-500` (the legitimate 8px dot) is not falsely
// matched as `bg-amber-50` substring. Only `-50` or `-100` followed by a
// non-digit (or end of string) counts as a tinted backdrop.
const FORBIDDEN_BG_CLASS_RE = /bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/

// Plan 06: the doctor review/packet surfaces follow the calm-chrome rule —
// routine status + cautions render as an 8px dot + plain text, never a
// colored-background pill. This guards the medication/packet render surfaces
// (previously PrescriptionRecommendationCard shipped a bg-amber-50 caution
// panel that the /admin/ops calm-chrome contract did not cover).
const FILES_UNDER_TEST = [
  "components/doctor/prescribing-packet-card.tsx",
  "components/doctor/review/intake-review-cockpit.tsx",
  "components/doctor/review/intake-action-buttons.tsx",
] as const

describe("Calm-chrome contract: doctor review packet surfaces", () => {
  it.each(FILES_UNDER_TEST)(
    "%s does not use colored-background pills on routine status",
    (relativePath) => {
      const contents = readFileSync(join(REPO_ROOT, relativePath), "utf8")
      const match = contents.match(FORBIDDEN_BG_CLASS_RE)
      expect(
        match,
        match
          ? `Calm-chrome violation in ${relativePath}: found "${match[0]}". Use an 8px dot + plain text for cautions/status; colored-background pills are reserved for exception chips, not the packet render.`
          : "no match",
      ).toBeNull()
    },
  )
})
