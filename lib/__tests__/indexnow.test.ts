import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import { collectIndexNowUrls, DEFAULT_INDEXNOW_KEY, submitIndexNowUrls } from "@/lib/seo/indexnow"

function response(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, ...init })
}

describe("IndexNow sitemap discovery", () => {
  it("keeps the default key aligned with the public verification file", () => {
    const keyFile = readFileSync(
      join(process.cwd(), "public", `${DEFAULT_INDEXNOW_KEY}.txt`),
      "utf8",
    ).trim()

    expect(keyFile).toBe(DEFAULT_INDEXNOW_KEY)
  })

  it("collects URLs from every sitemap listed in robots.txt", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const href = String(url)

      if (href.endsWith("/robots.txt")) {
        return response(`
User-agent: *
Allow: /
Sitemap: https://instantmed.com.au/sitemap.xml
Sitemap: https://instantmed.com.au/blog/sitemap.xml
`)
      }

      if (href.endsWith("/blog/sitemap.xml")) {
        return response(`
<urlset>
  <url><loc>https://instantmed.com.au/blog/shared</loc></url>
  <url><loc>https://instantmed.com.au/blog/can-you-get-antibiotics-online-australia</loc></url>
</urlset>
`)
      }

      if (href.endsWith("/sitemap.xml")) {
        return response(`
<urlset>
  <url><loc>https://instantmed.com.au/medical-certificate</loc></url>
  <url><loc>https://instantmed.com.au/blog/shared</loc></url>
</urlset>
`)
      }

      throw new Error(`Unexpected fetch ${href}`)
    }) as typeof fetch

    const result = await collectIndexNowUrls({ fetcher })

    expect(result.sitemaps).toEqual([
      {
        sitemap: "https://instantmed.com.au/sitemap.xml",
        status: 200,
        urlCount: 2,
      },
      {
        sitemap: "https://instantmed.com.au/blog/sitemap.xml",
        status: 200,
        urlCount: 2,
      },
    ])
    expect(result.urls).toEqual([
      "https://instantmed.com.au/medical-certificate",
      "https://instantmed.com.au/blog/shared",
      "https://instantmed.com.au/blog/can-you-get-antibiotics-online-australia",
    ])
  })

  it("submits a deduped URL list to the IndexNow endpoint", async () => {
    const fetcher = vi.fn(async () => response("", { status: 202 })) as typeof fetch

    const indexNowResponse = await submitIndexNowUrls({
      key: "test-key",
      urls: ["https://instantmed.com.au/a", "https://instantmed.com.au/b"],
      fetcher,
    })

    expect(indexNowResponse.status).toBe(202)
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.indexnow.org/indexnow",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          host: "instantmed.com.au",
          key: "test-key",
          keyLocation: "https://instantmed.com.au/test-key.txt",
          urlList: ["https://instantmed.com.au/a", "https://instantmed.com.au/b"],
        }),
      }),
    )
  })
})
