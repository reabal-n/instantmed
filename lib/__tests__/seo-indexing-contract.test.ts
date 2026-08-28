import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { BRANDED_SEARCH_LINKS } from "@/lib/seo/branded-search-links"

const root = process.cwd()

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
    const redirectBySource = new Map(
      (redirects ?? []).map((redirect) => [redirect.source, redirect]),
    )
    const sitemap = read("app/sitemap.ts")
    const locationPolicy = read("lib/seo/index-policy.ts")
    const medCertLocationBlock = sitemap.match(
      /const medCertLocationSlugs = \[([\s\S]*?)\]/,
    )?.[1]

    for (const city of [
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
      "canberra",
    ]) {
      expect(redirectBySource.get(`/medical-certificate/${city}`)).toMatchObject({
        destination: `/locations/${city}`,
        permanent: true,
      })
      expect(medCertLocationBlock).not.toContain(`"${city}"`)
      expect(locationPolicy).toContain(`"${city}"`)
    }

    for (const city of [
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
    ]) {
      expect(
        redirectBySource.get(`/intent/medical-certificate-online-${city}`),
      ).toMatchObject({
        destination: `/locations/${city}`,
        permanent: true,
      })
    }

    for (const city of ["parramatta", "hobart", "darwin"]) {
      expect(medCertLocationBlock).toContain(`"${city}"`)
    }

    expect(redirectBySource.get("/medical-certificate/gold-coast")).toMatchObject({
      destination: "/medical-certificate",
      permanent: true,
    })
    expect(
      redirectBySource.get("/intent/medical-certificate-online-gold-coast"),
    ).toMatchObject({
      destination: "/medical-certificate",
      permanent: true,
    })
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
    expect(auditScript).toContain("normalizeBrandQuery")
    expect(auditScript).toContain("brandedLandingPages")
    expect(auditScript).not.toContain("query: row.keys")
    expect(auditScript).not.toContain("indexing.urlNotifications.publish")
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
