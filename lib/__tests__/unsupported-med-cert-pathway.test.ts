import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import {
  getSupportedMedCertIntentSlugs,
  getUnsupportedMedCertUseCase,
  UNSUPPORTED_MED_CERT_USE_CASES,
  unsupportedMedCertRedirectPath,
} from "@/lib/medical-cert/unsupported-use-cases"

const ROOT = path.resolve(__dirname, "../..")

describe("unsupported medical certificate pathway", () => {
  it("keeps unsupported legacy medical-certificate intent pages out of the root sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).not.toContain("https://instantmed.com.au/medical-certificate/centrelink")
    expect(urls).not.toContain("https://instantmed.com.au/medical-certificate/return-to-work")
  })

  it("maps high-risk legacy certificate intents to a dedicated blocked pathway", () => {
    expect(unsupportedMedCertRedirectPath("centrelink")).toBe("/medical-certificate/not-suitable/centrelink")
    expect(unsupportedMedCertRedirectPath("return-to-work")).toBe("/medical-certificate/not-suitable/return-to-work")

    expect(getUnsupportedMedCertUseCase("centrelink")).toMatchObject({
      slug: "centrelink",
      category: "government-program-evidence",
    })
    expect(getUnsupportedMedCertUseCase("return-to-work")).toMatchObject({
      slug: "return-to-work",
      category: "fitness-or-capacity-clearance",
    })
  })

  it("excludes unsupported medical-certificate slugs from supported intent generation", () => {
    expect(getSupportedMedCertIntentSlugs()).not.toContain("centrelink")
    expect(getSupportedMedCertIntentSlugs()).not.toContain("return-to-work")
    expect(Object.keys(UNSUPPORTED_MED_CERT_USE_CASES)).toEqual(["centrelink", "return-to-work"])
  })

  it("keeps legacy unsupported URLs on hard permanent redirects, not rendered acquisition pages", () => {
    const config = readFileSync(path.join(ROOT, "next.config.mjs"), "utf8")

    expect(config).toContain('source: "/medical-certificate/centrelink"')
    expect(config).toContain('destination: "/medical-certificate/not-suitable/centrelink"')
    expect(config).toContain('source: "/medical-certificate/return-to-work"')
    expect(config).toContain('destination: "/medical-certificate/not-suitable/return-to-work"')
  })
})
