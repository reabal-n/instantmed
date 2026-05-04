import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("SEO indexing contracts", () => {
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

    expect(sitemap).not.toContain("const BUILD_DATE = new Date()")
    expect(sitemap).toContain("ROOT_SITEMAP_LAST_MODIFIED")
    expect(sitemap).toContain("SERVICE_PAGES_LAST_MODIFIED")
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
          `source: "${source.replaceAll("/", "\\/")}",[\\s\\S]*?permanent: true`,
        ),
      )
    }
  })
})
