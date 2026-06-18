import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("SEO indexing contracts", () => {
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
      "components/marketing/med-cert-landing.tsx",
    ]

    for (const pageFile of priorityPageFiles) {
      expect(read(pageFile), pageFile).toContain("<CitationFacts")
    }

    const prescriptionsPage = read("app/prescriptions/page.tsx")
    const prescriptionsLanding = read("components/marketing/prescriptions-landing.tsx")
    expect(prescriptionsPage).toContain("PrescriptionAuthorityResourceLink")
    expect(prescriptionsPage).toContain("/resources/secure-online-prescription-requests")
    expect(prescriptionsLanding).toContain("{children}")
  })

  it("hard-links new authority resources from relevant public source pages", () => {
    const expectedLinks: Record<string, string[]> = {
      "components/marketing/med-cert-landing.tsx": [
        "/resources/medical-certificate-employer-policy",
        "/resources/online-medical-certificate-verification",
      ],
      "app/prescriptions/page.tsx": [
        "/resources/secure-online-prescription-requests",
        "/resources/repeat-prescription-safety-checklist",
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

  it("keeps live money pages discoverable in the root sitemap", () => {
    const sitemap = read("app/sitemap.ts")
    const lastmod = read("lib/seo/sitemap-lastmod.ts")

    for (const route of [
      "/medical-certificate",
      "/prescriptions",
      "/erectile-dysfunction",
      "/hair-loss",
      "/womens-health",
      "/consult",
    ]) {
      expect(sitemap, route).toContain(`"${route}"`)
      expect(lastmod, route).toContain(`"${route}"`)
    }
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
