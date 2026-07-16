import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const source = readFileSync(
  join(process.cwd(), "components/request/steps/review-step.tsx"),
  "utf8",
)

describe("mobile review readability contract", () => {
  it("keeps review rows and pay-moment guidance at a readable body size", () => {
    expect(source).toContain('gap-3 text-base')
    expect(source).toContain('className="text-base text-muted-foreground mt-0.5"')
    expect(source).toContain('className="text-base leading-snug text-muted-foreground"')
    expect(source).toContain('className="block text-base leading-relaxed text-foreground"')
  })

  it("gives every section Edit control a 44px touch target", () => {
    expect(source).toContain('className="-mr-2 h-11 min-w-11')
    expect(source).not.toContain('className="-mr-2 h-7')
  })
})
