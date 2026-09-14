import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server"
import { describe, expect, it } from "vitest"

import robots from "@/app/robots"

import nextConfig from "../../next.config.mjs"

const baseUrl = "https://instantmed.com.au"

async function robotsHeader(path: string) {
  const response = await unstable_getResponseFromNextConfig({
    url: `${baseUrl}${path}`,
    nextConfig,
  })
  return response.headers.get("x-robots-tag")
}

describe("signature image indexing", () => {
  it.each([
    "/branding/eSignature.png",
    "/branding/eSignature.png?v=2",
    "/_next/image?url=%2Fbranding%2FeSignature.png&w=3840&q=75",
    "/_next/image?w=256&q=85&url=%2Fbranding%2FeSignature.png",
    "/_next/image?url=/branding/eSignature.png&w=128&q=75",
  ])("excludes the signature image at %s", async (path) => {
    expect(await robotsHeader(path)).toBe("noindex")
  })

  it.each([
    "/", "/contact", "/medical-certificate", "/blog/work-from-home-sick-certificate",
    "/icon.png", "/favicon.ico", "/branding/logo.png", "/opengraph-image",
    "/api/og?type=blog&title=Example",
    "/_next/image?url=%2Fbranding%2Flogo.png&w=64&q=75",
    "/_next/image?url=%2Fimages%2Fblog%2Fexample.webp&w=1200&q=75",
    "/_next/image?url=%2Fbranding%2FeSignature.png.other.png&w=128&q=75",
  ])("preserves indexing for unrelated pages and images at %s", async (path) => {
    expect(await robotsHeader(path)).toBeNull()
  })

  it("allows blog preview images through the API crawl block", () => {
    const rules = robots().rules
    const generalRule = (Array.isArray(rules) ? rules : [rules])
      .find((rule) => rule.userAgent === "*")!
    const allows = [generalRule.allow].flat().filter((path): path is string => !!path)
    const disallows = [generalRule.disallow].flat().filter((path): path is string => !!path)
    for (const path of ["/api/og", "/api/og?type=blog&title=Example"]) {
      const allowLength = Math.max(0, ...allows.filter((rule) => path.startsWith(rule)).map((rule) => rule.length))
      const disallowLength = Math.max(0, ...disallows.filter((rule) => path.startsWith(rule)).map((rule) => rule.length))
      expect(allowLength, path).toBeGreaterThan(disallowLength)
    }
    expect(disallows).toContain("/api/")
    expect(disallows.some((path) => "/branding/eSignature.png".startsWith(path))).toBe(false)
  })
})
