import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { BRANDED_SEARCH_LINKS } from "@/lib/seo/branded-search-links"
import { getAllIntentSlugs } from "@/lib/seo/intents"

const root = process.cwd()

const EXPECTED_INTENT_SLUGS = [
  "same-day-medical-certificate",
  "medical-certificate-for-work",
  "online-sick-certificate",
  "one-day-medical-certificate",
  "two-day-medical-certificate",
  "medical-certificate-for-cold-and-flu",
  "medical-certificate-for-mental-health-day",
  "carers-leave-certificate-online",
  "student-medical-certificate-online",
  "medical-certificate-for-shift-workers",
  "repeat-prescription-online",
  "after-hours-repeat-prescription",
  "weekend-repeat-prescription",
  "urgent-repeat-prescription-online",
  "online-doctor-certificate-australia",
  "telehealth-medical-certificate-vs-gp",
  "online-medical-certificate-comparison",
  "instant-scripts-alternative-medical-certificate",
  "bulk-billed-telehealth-vs-instantmed",
]

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("SEO indexing contracts", () => {
  it("prioritizes useful branded sitelinks and excludes footer boilerplate from snippets", () => {
    expect(BRANDED_SEARCH_LINKS).toEqual([
      { label: "Medical certificates", href: "/medical-certificate" },
      { label: "Repeat prescriptions", href: "/prescriptions" },
      { label: "Pricing", href: "/pricing" },
      { label: "How InstantMed works", href: "/how-it-works" },
      { label: "Verify a certificate", href: "/verify" },
      { label: "Contact support", href: "/contact" },
    ])

    const homepageRail = read("components/marketing/home-service-links.tsx")
    const homepageData = read("lib/marketing/homepage.ts")
    const footer = read("components/shared/footer.tsx")
    const medCertLayout = read("app/medical-certificate/layout.tsx")
    const contactPage = read("app/contact/contact-client.tsx")

    expect(homepageRail).toContain("BRANDED_SEARCH_LINKS")
    expect(homepageRail).toContain("Popular pages")
    expect(homepageData).not.toMatch(/\/locations\/(?:sydney|melbourne|canberra)/)
    expect(homepageData).toContain("...BRANDED_SEARCH_LINKS.slice(2)")
    expect(footer).toContain('data-nosnippet=""')
    expect(footer).toContain("footerLinks.help")
    expect(footer).toContain("All rights reserved.")
    expect(medCertLayout).not.toContain("export const metadata")
    expect(contactPage).toContain('getApprovedClaim("complaints_timing")')
  })

  it("gives each indexed city pair one resolved HTTP 308 canonical owner", async () => {
    const { default: nextConfig } = await import("../../next.config.mjs")
    const redirects = await nextConfig.redirects?.()
    const sitemap = read("app/sitemap.ts")
    const locationPolicy = read("lib/seo/index-policy.ts")
    const medCertLocationBlock = sitemap.match(
      /const medCertLocationSlugs = \[([\s\S]*?)\]/,
    )?.[1]

    const redirectOwners = [
      ...["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra"].map(
        (city) => ({ source: `/medical-certificate/${city}`, destination: `/locations/${city}` }),
      ),
      ...["sydney", "melbourne", "brisbane", "perth", "adelaide"].map(
        (city) => ({
          source: `/intent/medical-certificate-online-${city}`,
          destination: `/locations/${city}`,
        }),
      ),
      { source: "/medical-certificate/gold-coast", destination: "/medical-certificate" },
      {
        source: "/intent/medical-certificate-online-gold-coast",
        destination: "/medical-certificate",
      },
    ]

    expect(redirectOwners).toHaveLength(13)
    for (const { source, destination } of redirectOwners) {
      const matches = (redirects ?? []).filter((redirect) => redirect.source === source)
      expect(matches, source).toHaveLength(1)
      expect(matches[0]).toMatchObject({ destination, permanent: true })
    }

    for (const city of ["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra"]) {
      expect(medCertLocationBlock).not.toContain(`"${city}"`)
      expect(locationPolicy).toContain(`"${city}"`)
    }

    for (const city of ["parramatta", "hobart", "darwin"]) {
      expect(medCertLocationBlock).toContain(`"${city}"`)
    }

    expect(
      (redirects ?? []).some(
        (redirect) =>
          redirect.destination === "/intent/medical-certificate-online-:city",
      ),
    ).toBe(false)
  })

  it("keeps redirected city intent sources out of registry-derived surfaces", () => {
    const intentRegistry = read("lib/seo/intents.ts")
    const intentPage = read("app/intent/page.tsx")
    const intentSlugPage = read("app/intent/[slug]/page.tsx")
    const intentSitemap = read("app/intent/sitemap.ts")
    const htmlSitemap = read("app/sitemap-html/page.tsx")

    for (const city of [
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
      "gold-coast",
    ]) {
      const slug = `medical-certificate-online-${city}`
      expect(intentRegistry).not.toContain(`slug: "${slug}"`)
      expect(intentPage).not.toContain(slug)
      expect(intentSlugPage).toContain("getAllIntentSlugs")
      expect(htmlSitemap).toContain("getAllIntentSlugs")
    }

    expect(intentSitemap).toContain("return []")
  })

  it("executes the pruned intent registry for static params", async () => {
    const { generateStaticParams } = await import("../../app/intent/[slug]/page")

    expect(getAllIntentSlugs()).toEqual(EXPECTED_INTENT_SLUGS)
    expect(generateStaticParams()).toEqual(
      EXPECTED_INTENT_SLUGS.map((slug) => ({ slug })),
    )
  })

  it("allows ChatGPT Search crawler to discover public source pages", () => {
    const robots = read("app/robots.ts")

    expect(robots).toContain('userAgent: "OAI-SearchBot"')
    expect(robots).toContain('allow: ["/", "/llms.txt", "/llms-full.txt"]')
    expect(robots).toContain('disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"]')
  })

  it("keeps llms source files compliant and citation-friendly", () => {
    const llms = read("public/llms.txt")
    const llmsFull = read("public/llms-full.txt")
    const combined = `${llms}\n${llmsFull}`

    expect(combined).toContain("InstantMed Pty Ltd (ABN 64 694 559 334)")
    expect(combined).toContain("Employer and institution policies may vary.")
    expect(combined).toContain("Prescription only if clinically appropriate after doctor review.")
    expect(combined).not.toMatch(/Valid for Australian employers/i)
    expect(combined).not.toMatch(/typically under 30 minutes/i)
    expect(combined).not.toMatch(/usually within 30 minutes/i)
    expect(combined).not.toMatch(/cannot discriminate/i)
    expect(combined).not.toMatch(/Centrelink requirements/i)
    expect(combined).not.toMatch(/Jury duty exemption/i)
    expect(combined).not.toMatch(/Return-to-work clearance/i)
    expect(combined).not.toMatch(/\b(sildenafil|tadalafil|finasteride|Viagra|Cialis)\b/i)
  })

  it("renders a shared citation fact block on priority public pages", () => {
    const componentPath = "components/marketing/citation-facts.tsx"
    expect(existsSync(join(root, componentPath))).toBe(true)

    const component = read(componentPath)
    expect(component).toContain("CitationFacts")
    expect(component).toContain("InstantMed Pty Ltd")
    expect(component).toContain("ABN 64 694 559 334")

    const priorityPageFiles = [
      "app/about/about-client.tsx",
      "app/trust/trust-client.tsx",
      "app/clinical-governance/clinical-governance-client.tsx",
      "app/how-we-decide/page.tsx",
      "app/online-doctor-australia/page.tsx",
      "app/telehealth-australia/page.tsx",
    ]

    for (const pageFile of priorityPageFiles) {
      expect(read(pageFile), pageFile).toContain("<CitationFacts")
    }

    const prescriptionsPage = read("app/prescriptions/page.tsx")
    const prescriptionsLanding = read("components/marketing/prescriptions-landing.tsx")
    const medCertLanding = read("components/marketing/med-cert-landing.tsx")
    expect(medCertLanding).toContain("WorkplaceProofPanel")
    expect(medCertLanding).toContain("Fair Work Act 2009")
    expect(prescriptionsPage).toContain("<PrescriptionsLanding />")
    expect(prescriptionsLanding).toContain("PrescriptionResourceNav")
    expect(prescriptionsLanding).toContain("/resources/secure-online-prescription-requests")
  })

  it("hard-links new authority resources from relevant public source pages", () => {
    const expectedLinks: Record<string, string[]> = {
      "components/marketing/med-cert-landing.tsx": [
        "/resources/medical-certificate-employer-policy",
        "/resources/online-medical-certificate-verification",
      ],
      "components/marketing/med-cert-reason-links.tsx": ["/prescriptions"],
      "components/marketing/prescriptions-landing.tsx": [
        "/resources/secure-online-prescription-requests",
        "/resources/repeat-prescription-safety-checklist",
        "/online-prescriptions",
      ],
      "app/privacy/page.tsx": [
        "/resources/telehealth-privacy-health-data-checklist",
      ],
      "app/trust/trust-client.tsx": [
        "/resources/telehealth-safety-checklist",
        "/resources/when-telehealth-is-not-appropriate",
      ],
      "app/clinical-governance/clinical-governance-client.tsx": [
        "/resources/complaints-clinical-governance",
        "/resources/repeat-prescription-safety-checklist",
      ],
      "app/telehealth-australia/page.tsx": [
        "/resources/gp-wait-times-telehealth-access",
        "/resources/when-telehealth-is-not-appropriate",
        "/resources/medicare-bulk-billing-private-telehealth",
        "/resources/rural-remote-telehealth-access",
      ],
      "app/online-doctor-australia/page.tsx": [
        "/resources/medicare-bulk-billing-private-telehealth",
        "/resources/when-telehealth-is-not-appropriate",
      ],
      "components/seo/content-hub-links.tsx": [
        "/prescriptions",
      ],
    }

    for (const [file, links] of Object.entries(expectedLinks)) {
      const source = read(file)
      for (const link of links) {
        expect(source, `${file} should link ${link}`).toContain(link)
      }
    }
  })

  it("enforces www to apex redirects at the Vercel edge", () => {
    const vercelConfig = JSON.parse(read("vercel.json")) as {
      redirects?: Array<{
        source?: string
        destination?: string
        permanent?: boolean
        has?: Array<{ type?: string; value?: string }>
      }>
    }

    expect(vercelConfig.redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/(.*)",
          destination: "https://instantmed.com.au/$1",
          permanent: true,
          has: expect.arrayContaining([
            expect.objectContaining({
              type: "host",
              value: "www.instantmed.com.au",
            }),
          ]),
        }),
      ]),
    )
  })

  it("does not mark root sitemap URLs as freshly changed on every build", () => {
    const sitemap = read("app/sitemap.ts")
    const lastmod = read("lib/seo/sitemap-lastmod.ts")

    // Per-URL lastmod must be stable (git-sourced + baked into a static map),
    // never re-stamped at build time — otherwise Google sees every URL as
    // "changed" on every deploy. The argless `new Date()` is the forbidden
    // build-time stamp; fixed `new Date("YYYY-MM-DD")` strings are fine.
    expect(sitemap).not.toContain("new Date()")
    expect(lastmod).not.toContain("new Date()")
    expect(sitemap).toContain("routeLastModified")
    expect(lastmod).toContain("ROUTE_LAST_MODIFIED")
  })

  it("keeps live money and high-yield SEO pages discoverable in the root sitemap", () => {
    const sitemap = read("app/sitemap.ts")
    const lastmod = read("lib/seo/sitemap-lastmod.ts")

    for (const route of [
      "/medical-certificate",
      "/prescriptions",
      "/online-prescriptions",
      "/mens-health",
      "/erectile-dysfunction",
      "/mental-health-online",
      "/weight-loss-online",
      "/hair-loss",
      "/womens-health",
      "/uti-assessment-online",
      "/contraceptive-pill-assessment-online",
      "/consult",
    ]) {
      expect(sitemap, route).toContain(`"${route}"`)
      expect(lastmod, route).toContain(`"${route}"`)
    }
  })

  it("keeps /request crawlable noindex without a homepage canonical", () => {
    const requestPage = read("app/request/page.tsx")

    expect(requestPage).toContain("robots: { index: false, follow: true }")
    expect(requestPage).toContain("canonical: null")
    expect(requestPage).not.toContain('canonical: "/"')
    expect(requestPage).not.toContain('"https://instantmed.com.au/"')
  })

  it("gives the prescription service and explainer distinct indexing roles", () => {
    const prescriptionsPage = read("app/prescriptions/page.tsx")
    const onlinePrescriptionsPage = read("app/online-prescriptions/page.tsx")
    const onlinePrescriptionsLanding = read("components/marketing/online-prescriptions-landing.tsx")

    expect(prescriptionsPage).toContain("canonical: 'https://instantmed.com.au/prescriptions'")
    expect(prescriptionsPage).toContain("robots: {")
    expect(prescriptionsPage).toContain("index: true")
    expect(prescriptionsPage).toContain("follow: true")

    expect(onlinePrescriptionsPage).toContain(
      'canonical: "https://instantmed.com.au/online-prescriptions"',
    )
    expect(onlinePrescriptionsPage).toContain(
      'url: "https://instantmed.com.au/online-prescriptions"',
    )
    expect(onlinePrescriptionsPage).toContain('url="/online-prescriptions"')
    expect(onlinePrescriptionsPage).toContain('type: "article"')
    expect(onlinePrescriptionsPage).not.toContain("ServiceSchema")
    expect(onlinePrescriptionsPage).not.toContain("PRICING_DISPLAY")

    expect(onlinePrescriptionsLanding).toContain('const MONEY_PAGE_HREF = "/prescriptions"')
    expect(onlinePrescriptionsLanding).toContain("See repeat prescription service")
    expect(onlinePrescriptionsLanding).not.toContain('/request?service=repeat-script')
    expect(onlinePrescriptionsLanding).not.toContain("PRICING_DISPLAY")
  })

  it("keeps GSC indexing audits as read-only diagnostics", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>
    }
    const scriptPath = "tools/gsc-mcp-server/gsc-index-audit.mjs"

    expect(packageJson.scripts?.["seo:gsc-index-audit"]).toBe(`node ${scriptPath}`)
    expect(existsSync(join(root, scriptPath))).toBe(true)

    const auditScript = read(scriptPath)
    expect(auditScript).toContain("searchconsole.urlInspection.index.inspect")
    expect(auditScript).toContain("searchconsole.searchanalytics.query")
    expect(auditScript).toContain(
      'scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]',
    )
    expect(auditScript).not.toContain('https://www.googleapis.com/auth/webmasters"')
    expect(auditScript).not.toContain("https://www.googleapis.com/auth/indexing")
    expect(auditScript).not.toContain("indexing.urlNotifications.publish")
    expect(packageJson.scripts?.["seo:submit-indexing"]).toBeUndefined()
    expect(
      existsSync(join(root, "tools/gsc-mcp-server/gsc-submit-indexing.mjs")),
    ).toBe(false)
  })

  it("reports redacted branded landing pages without adding an indexing mutation", () => {
    const auditScript = read("tools/gsc-mcp-server/gsc-index-audit.mjs")

    expect(auditScript).toContain("getBrandedLandingPages")
    expect(auditScript).toContain('dimensions: ["query", "page"]')
    expect(auditScript).toContain("isBrandedQuery")
    expect(auditScript).toContain("brandedLandingPages")
    expect(auditScript).not.toContain("query: row.keys")
    expect(auditScript).not.toContain("indexing.urlNotifications.publish")
  })

  it("keeps branded landing helpers importable without running the audit", async () => {
    const { getBrandedLandingPages, getPerformancePages, publicPagePath } = await import(
      "../../tools/gsc-mcp-server/gsc-index-audit.mjs"
    )

    expect(getBrandedLandingPages).toBeTypeOf("function")
    expect(getPerformancePages).toBeTypeOf("function")
    expect(publicPagePath).toBeTypeOf("function")
  })

  it("aggregates branded landings only for public InstantMed hosts", async () => {
    const { getBrandedLandingPages, publicPagePath } = await import(
      "../../tools/gsc-mcp-server/gsc-index-audit.mjs"
    )
    const brandedInputs = [
      "InstantMed",
      ["instant", "med"].join(" "),
      "instant-med",
      "instant.med",
      "instantmed.com.au",
    ]
    let request: { requestBody?: { dimensions?: string[] } } | undefined

    const brandedLandingPages = await getBrandedLandingPages(
      {
        searchanalytics: {
          query: async (input: { requestBody?: { dimensions?: string[] } }) => {
            request = input
            return {
              data: {
                rows: [
                  { keys: [brandedInputs[0], "https://instantmed.com.au/prescriptions?source=test#top"], clicks: 2, impressions: 10 },
                  { keys: [brandedInputs[1], "https://www.instantmed.com.au/prescriptions/?source=www"], clicks: 3, impressions: 15 },
                  { keys: [brandedInputs[2], "https://instantmed.com.au/prescriptions/"], clicks: 5, impressions: 20 },
                  { keys: [brandedInputs[3], "https://www.instantmed.com.au/prescriptions"], clicks: 7, impressions: 25 },
                  { keys: [brandedInputs[4], "https://instantmed.com.au/prescriptions/?source=domain"], clicks: 11, impressions: 30 },
                  { keys: [brandedInputs[0], "https://instantmed.com.au////?source=root"], clicks: 1, impressions: 4 },
                  { keys: [brandedInputs[0], "https://instantmed.com.au/verify/IM-WORK?source=work"], clicks: 2, impressions: 4 },
                  { keys: [brandedInputs[0], "https://www.instantmed.com.au/verify/STUDY/#top"], clicks: 3, impressions: 6 },
                  { keys: [brandedInputs[0], "https://instantmed.com.au/verify/CARER"], clicks: 5, impressions: 10 },
                  { keys: [brandedInputs[0], "https://staging.instantmed.com.au/prescriptions"], clicks: 100, impressions: 200 },
                  { keys: [brandedInputs[0], "https://example.com/prescriptions"], clicks: 100, impressions: 200 },
                  { keys: [brandedInputs[0], "not a URL"], clicks: 100, impressions: 200 },
                  { keys: ["instant medical certificate", "https://instantmed.com.au/pricing"], clicks: 100, impressions: 200 },
                  { keys: ["instant medicine delivery", "https://instantmed.com.au/pricing"], clicks: 100, impressions: 200 },
                  { keys: ["myinstantmedapp", "https://instantmed.com.au/pricing"], clicks: 100, impressions: 200 },
                  { keys: ["unbranded", "https://instantmed.com.au/pricing"], clicks: 100, impressions: 200 },
                ],
              },
            }
          },
        },
      },
      "2026-05-27",
      "2026-08-25",
    )

    expect(request?.requestBody?.dimensions).toEqual(["query", "page"])
    expect(publicPagePath("https://instantmed.com.au/prescriptions?source=test#top")).toBe("/prescriptions")
    expect(publicPagePath("https://www.instantmed.com.au/prescriptions/?source=www")).toBe("/prescriptions")
    expect(publicPagePath("https://instantmed.com.au/?source=root")).toBe("/")
    expect(publicPagePath("https://instantmed.com.au////?source=root")).toBe("/")
    expect(publicPagePath("https://instantmed.com.au/verify/IM-WORK?source=work")).toBe("/verify")
    expect(publicPagePath("https://www.instantmed.com.au/verify/STUDY/#top")).toBe("/verify")
    expect(publicPagePath("https://instantmed.com.au/verify/CARER")).toBe("/verify")
    expect(publicPagePath("https://staging.instantmed.com.au/prescriptions")).toBeNull()
    expect(publicPagePath("https://example.com/prescriptions")).toBeNull()
    expect(publicPagePath("ftp://instantmed.com.au/prescriptions")).toBeNull()
    expect(publicPagePath("not a URL")).toBeNull()
    expect(brandedLandingPages).toEqual([
      { page: "/prescriptions", clicks: 28, impressions: 100, ctr: 0.28 },
      { page: "/verify", clicks: 10, impressions: 20, ctr: 0.5 },
      { page: "/", clicks: 1, impressions: 4, ctr: 0.25 },
    ])
    expect(Object.keys(brandedLandingPages[0])).toEqual([
      "page",
      "clicks",
      "impressions",
      "ctr",
    ])
    expect(JSON.stringify(brandedLandingPages)).not.toContain("instant")
    expect(JSON.stringify(brandedLandingPages)).not.toContain("keys")
    expect(JSON.stringify(brandedLandingPages)).not.toContain("IM-WORK")
    expect(JSON.stringify(brandedLandingPages)).not.toContain("STUDY")
    expect(JSON.stringify(brandedLandingPages)).not.toContain("CARER")
  })

  it("aggregates public performance pages without serializing raw page inputs", async () => {
    const { getPerformancePages } = await import(
      "../../tools/gsc-mcp-server/gsc-index-audit.mjs"
    )

    const performancePages = await getPerformancePages(
      {
        searchanalytics: {
          query: async () => ({
            data: {
              rows: [
                { keys: ["https://instantmed.com.au/prescriptions?gclid=first#top"], clicks: 2, impressions: 10, position: 2 },
                { keys: ["https://www.instantmed.com.au/prescriptions/?utm_source=www"], clicks: 3, impressions: 30, position: 8 },
                { keys: ["https://instantmed.com.au/prescriptions/"], clicks: 5, impressions: 20, position: 10 },
                { keys: ["https://instantmed.com.au/?source=root"], clicks: 1, impressions: 4, position: 3 },
                { keys: ["https://www.instantmed.com.au////?source=root-alias"], clicks: 2, impressions: 6, position: 5 },
                { keys: ["https://instantmed.com.au/verify/IM-WORK?source=work"], clicks: 2, impressions: 4, position: 2 },
                { keys: ["https://www.instantmed.com.au/verify/STUDY/#top"], clicks: 3, impressions: 6, position: 8 },
                { keys: ["https://instantmed.com.au/verify/CARER"], clicks: 5, impressions: 10, position: 10 },
                { keys: ["https://staging.instantmed.com.au/prescriptions?gclid=staging"], clicks: 100, impressions: 200, position: 1 },
                { keys: ["https://example.com/prescriptions?gclid=external"], clicks: 100, impressions: 200, position: 1 },
                { keys: ["not a URL"], clicks: 100, impressions: 200, position: 1 },
              ],
            },
          }),
        },
      },
      "2026-05-27",
      "2026-08-25",
    )

    expect(performancePages).toEqual([
      {
        page: "https://instantmed.com.au/prescriptions",
        clicks: 10,
        impressions: 60,
        ctr: 1 / 6,
        position: 23 / 3,
      },
      {
        page: "https://instantmed.com.au/verify",
        clicks: 10,
        impressions: 20,
        ctr: 0.5,
        position: 7.8,
      },
      {
        page: "https://instantmed.com.au/",
        clicks: 3,
        impressions: 10,
        ctr: 0.3,
        position: 4.2,
      },
    ])
    const serialized = JSON.stringify(performancePages)
    expect(serialized).not.toContain("gclid")
    expect(serialized).not.toContain("utm_source")
    expect(serialized).not.toContain("staging")
    expect(serialized).not.toContain("example.com")
    expect(serialized).not.toContain("IM-WORK")
    expect(serialized).not.toContain("STUDY")
    expect(serialized).not.toContain("CARER")
  })

  it("inspects current money pages by default in GSC indexing audits", () => {
    const auditScript = read("tools/gsc-mcp-server/gsc-index-audit.mjs")

    expect(auditScript).toContain("DEFAULT_PRIORITY_INSPECTION_PATHS")
    expect(auditScript).toContain("DEFAULT_INSPECT_LIMIT")

    for (const route of [
      "/medical-certificate",
      "/medical-certificate-online",
      "/prescriptions",
      "/online-prescriptions",
      "/erectile-dysfunction",
      "/hair-loss",
      "/womens-health",
      "/uti-assessment-online",
      "/contraceptive-pill-assessment-online",
      "/pricing",
      "/telehealth-australia",
      "/online-doctor-australia",
      "/weight-loss",
    ]) {
      expect(auditScript, route).toContain(`"${route}"`)
    }
  })

  it("uses permanent redirects for retired public acquisition aliases", () => {
    const nextConfig = read("next.config.mjs")
    const retiredAliases = [
      "/request/med-cert",
      "/request/consult",
      "/medical-certificate/request",
      "/consult/request",
      "/prescriptions/request",
      "/prescriptions/repeat",
      "/prescriptions/new",
    ]

    for (const source of retiredAliases) {
      expect(nextConfig).toMatch(
        new RegExp(
          `source: "${source.replaceAll("/", "\\/")}",[^}]*permanent: true`,
        ),
      )
    }
  })
})
