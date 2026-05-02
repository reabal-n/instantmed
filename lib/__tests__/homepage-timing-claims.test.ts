import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("homepage timing claims", () => {
  it("does not hardcode customer-facing review-time promises", () => {
    const publicHomepageFiles = [
      "app/page.tsx",
      "lib/marketing/homepage.ts",
      "components/shared/footer.tsx",
      "components/marketing/how-it-works.tsx",
      "components/marketing/service-cards.tsx",
      "components/marketing/service-picker.tsx",
      "components/marketing/social-proof-section.tsx",
      "components/request/steps/certificate-step.tsx",
      "components/seo/schemas/how-to.tsx",
    ]
    const publicCopy = publicHomepageFiles
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n")
      .toLowerCase()

    expect(publicCopy).not.toContain("under 20 minutes")
    expect(publicCopy).not.toContain("reviewed in minutes")
    expect(publicCopy).not.toContain("reviewed within 1–2 hours")
    expect(publicCopy).not.toContain("reviewed within 1-2 hours")
    expect(publicCopy).not.toContain("most requests reviewed")
    expect(publicCopy).not.toContain("time it takes to make a coffee")
    expect(publicCopy).not.toContain("within the hour")
    expect(publicCopy).not.toContain("within ~1 hour")
    expect(publicCopy).not.toContain("same-day")
  })
})
