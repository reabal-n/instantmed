import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const authorityAssetPath = join(root, "lib/authority-assets.ts")

const requiredSlugs = [
  "telehealth-safety-checklist",
  "medical-certificate-employer-policy",
  "secure-online-prescription-requests",
  "gp-wait-times-telehealth-access",
  "complaints-clinical-governance",
  "online-medical-certificate-verification",
  "telehealth-privacy-health-data-checklist",
  "when-telehealth-is-not-appropriate",
  "medicare-bulk-billing-private-telehealth",
  "rural-remote-telehealth-access",
  "repeat-prescription-safety-checklist",
] as const

const waveTwoSlugs = requiredSlugs.slice(5)

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

async function loadAuthorityAssets() {
  expect(
    existsSync(authorityAssetPath),
    "lib/authority-assets.ts should define the Phase 3 authority asset registry",
  ).toBe(true)

  return import("../authority-assets")
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (!value || typeof value !== "object") return []
  if (Array.isArray(value)) return value.flatMap(collectStrings)

  return Object.values(value).flatMap(collectStrings)
}

const bannedAuthorityPatterns = [
  /accepted by all employers/i,
  /all employers accept/i,
  /valid for all employers/i,
  /guaranteed (approval|prescription|treatment|outcome)/i,
  /treatment is guaranteed/i,
  /prescription is guaranteed/i,
  /testimonial/i,
  /patient stor(y|ies)/i,
  /buy (sildenafil|tadalafil|finasteride|viagra|cialis|ozempic|semaglutide)/i,
  /get (sildenafil|tadalafil|finasteride|viagra|cialis|ozempic|semaglutide)/i,
  /\b(sildenafil|tadalafil|finasteride|viagra|cialis|ozempic|semaglutide)\b/i,
]

describe("Phase 3 authority asset contracts", () => {
  it("defines the five required linkable authority assets", async () => {
    const { AUTHORITY_ASSET_SLUGS, AUTHORITY_ASSETS, getAuthorityAsset } =
      await loadAuthorityAssets()

    expect(AUTHORITY_ASSET_SLUGS).toEqual(requiredSlugs)
    expect(AUTHORITY_ASSETS).toHaveLength(requiredSlugs.length)

    for (const slug of requiredSlugs) {
      const asset = getAuthorityAsset(slug)
      expect(asset, slug).toBeDefined()
      expect(asset.slug).toBe(slug)
      expect(asset.lastReviewed).toBe("6 June 2026")
      expect(asset.title.length, `${slug} should have a specific title`).toBeGreaterThan(20)
      expect(asset.description.length, `${slug} should have metadata copy`).toBeGreaterThan(70)
      expect(asset.sections.length, `${slug} should not be a thin post`).toBeGreaterThanOrEqual(4)
      expect(asset.sources.length, `${slug} should expose visible sources`).toBeGreaterThanOrEqual(2)
    }
  })

  it("defines wave two resources as comprehensive citation pages with GPT image 2 visuals", async () => {
    const { getAuthorityAsset } = await loadAuthorityAssets()
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.["authority:generate-visuals"]).toBe(
      "tsx scripts/generate-authority-resource-visuals.ts",
    )
    expect(read("scripts/generate-authority-resource-visuals.ts")).toContain(
      'const GPT_IMAGE_MODEL = "openai/gpt-image-2"',
    )

    for (const slug of waveTwoSlugs) {
      const asset = getAuthorityAsset(slug)

      expect(asset.sections.length, `${slug} should be in-depth enough to cite`).toBeGreaterThanOrEqual(6)
      expect(asset.sources.length, `${slug} should cite multiple public authorities`).toBeGreaterThanOrEqual(3)
      expect(asset.visuals?.length, `${slug} should include at least one premium explainer visual`).toBeGreaterThanOrEqual(1)

      for (const visual of asset.visuals ?? []) {
        expect(visual.assetPath, `${slug}:${visual.id} should use the resource image directory`).toMatch(
          new RegExp(`^/images/resources/${slug}/[a-z0-9-]+\\.webp$`),
        )
        expect(visual.alt, `${slug}:${visual.id} should have useful alt text`).toMatch(/\b(checklist|diagram|map|pathway|privacy|evidence|telehealth|prescription|regional)\b/i)
        expect(visual.caption.length, `${slug}:${visual.id} should explain the visual`).toBeGreaterThan(60)
        expect(visual.prompt, `${slug}:${visual.id} should retain the GPT image 2 generation brief`).toContain("GPT image 2")
        expect(existsSync(join(root, "public", visual.assetPath)), `${slug}:${visual.id} asset file should exist`).toBe(true)
      }
    }
  })

  it("keeps every section claim-led, source-backed, reviewed, and clinically bounded", async () => {
    const { AUTHORITY_ASSETS } = await loadAuthorityAssets()

    for (const asset of AUTHORITY_ASSETS) {
      const sourceIds = new Set(asset.sources.map((source) => source.id))
      expect(asset.clinicalLimits.length, `${asset.slug} should list neutral limits`).toBeGreaterThanOrEqual(2)

      for (const source of asset.sources) {
        expect(source.url, `${asset.slug}:${source.id} should use a public https source`).toMatch(/^https:\/\//)
        expect(new URL(source.url).hostname, `${asset.slug}:${source.id} should not cite InstantMed as its own authority`).not.toMatch(/instantmed\.com\.au$/)
        expect(source.publisher.length, `${asset.slug}:${source.id} should name the publisher`).toBeGreaterThan(4)
        expect(source.accessed).toBe("6 June 2026")
      }

      for (const section of asset.sections) {
        expect(section.claim.trim().length, `${asset.slug}:${section.id} needs one clear claim`).toBeGreaterThan(24)
        expect(section.claim, `${asset.slug}:${section.id} claim should be plain language`).not.toMatch(/[?]/)
        expect(section.body.length, `${asset.slug}:${section.id} should explain the claim`).toBeGreaterThanOrEqual(1)
        expect(section.sourceIds.length, `${asset.slug}:${section.id} should cite sources`).toBeGreaterThanOrEqual(1)

        for (const sourceId of section.sourceIds) {
          expect(sourceIds.has(sourceId), `${asset.slug}:${section.id} cites unknown source ${sourceId}`).toBe(true)
        }
      }
    }
  })

  it("uses only public access sources for the GP access brief", async () => {
    const { getAuthorityAsset } = await loadAuthorityAssets()
    const asset = getAuthorityAsset("gp-wait-times-telehealth-access")
    const sourceHosts = asset.sources.map((source) => new URL(source.url).hostname)

    expect(sourceHosts).toEqual(
      expect.arrayContaining([
        "www.abs.gov.au",
        "www.pc.gov.au",
      ]),
    )
    expect(asset.sources.every((source) => source.url.startsWith("https://"))).toBe(true)
  })

  it("keeps all authority asset copy neutral and non-promotional", async () => {
    const { AUTHORITY_ASSETS } = await loadAuthorityAssets()
    const combined = AUTHORITY_ASSETS.map((asset) => collectStrings(asset).join("\n")).join("\n\n")

    for (const pattern of bannedAuthorityPatterns) {
      expect(combined).not.toMatch(pattern)
    }

    expect(combined).not.toContain("—")
  })

  it("exposes authority assets through crawlable routes, sitemap, navigation, and LLM files", () => {
    expect(existsSync(join(root, "app/resources/page.tsx"))).toBe(true)
    expect(existsSync(join(root, "app/resources/[slug]/page.tsx"))).toBe(true)
    expect(existsSync(join(root, "components/marketing/authority-asset-page.tsx"))).toBe(true)

    const sitemap = read("app/sitemap.ts")
    const nav = read("components/shared/navbar/resources-dropdown.tsx")
    const llms = `${read("public/llms.txt")}\n${read("public/llms-full.txt")}`
    const renderer = read("components/marketing/authority-asset-page.tsx")

    expect(sitemap).toContain("getAuthorityAssetSummaries")
    expect(sitemap).toContain("/resources")
    expect(nav).toContain("/resources")
    expect(renderer).toContain("Last reviewed")
    expect(renderer).toContain("Sources")
    expect(renderer).toContain("asset.visuals")
    expect(renderer).toContain("Premium explainer")

    for (const slug of requiredSlugs) {
      expect(llms, `${slug} should be listed for AI citation discovery`).toContain(
        `https://instantmed.com.au/resources/${slug}`,
      )
    }
  })

  it("surfaces authority visuals in metadata, structured data, and grouped hub sections", () => {
    const dynamicRoute = read("app/resources/[slug]/page.tsx")
    const hubRoute = read("app/resources/page.tsx")
    const registry = read("lib/authority-assets.ts")

    expect(dynamicRoute).toContain("buildAuthorityAssetImages")
    expect(dynamicRoute).toContain("images: authorityImages")
    expect(dynamicRoute).toContain("thumbnailUrl")
    expect(dynamicRoute).toContain("primaryImageOfPage")

    expect(registry).toContain("category:")
    expect(registry).toContain("getAuthorityAssetGroups")
    expect(hubRoute).toContain("getAuthorityAssetGroups")

    for (const label of [
      "Certificate evidence",
      "Prescription safety",
      "Telehealth access",
      "Privacy and governance",
    ]) {
      expect(hubRoute, label).toContain(label)
    }
  })
})
