const DEFAULT_HOST = "instantmed.com.au"
const DEFAULT_USER_AGENT = "InstantMed-IndexNow/1.0"
export const DEFAULT_INDEXNOW_KEY = "b4d7f2a1e9c34568af12de89c7654321"
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
const INDEXNOW_BATCH_LIMIT = 10000

type Fetcher = typeof fetch

export type IndexNowSitemapResult = {
  sitemap: string
  status: number
  urlCount: number
}

export type CollectIndexNowUrlsResult = {
  urls: string[]
  sitemaps: IndexNowSitemapResult[]
}

function extractLocs(xml: string) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

function extractSitemapUrls(robotsTxt: string) {
  return [...robotsTxt.matchAll(/^Sitemap:\s*(\S+)$/gim)].map((match) => match[1])
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function withUserAgent(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "User-Agent": DEFAULT_USER_AGENT,
    },
  }
}

export async function collectIndexNowUrls({
  host = DEFAULT_HOST,
  fetcher = fetch,
}: {
  host?: string
  fetcher?: Fetcher
} = {}): Promise<CollectIndexNowUrlsResult> {
  const origin = `https://${host}`
  const robotsResponse = await fetcher(`${origin}/robots.txt`, withUserAgent())

  if (!robotsResponse.ok) {
    throw new Error(`Failed to fetch robots.txt: ${robotsResponse.status}`)
  }

  const robotsTxt = await robotsResponse.text()
  const sitemapUrls = extractSitemapUrls(robotsTxt)
  const sitemapSources = sitemapUrls.length > 0 ? sitemapUrls : [`${origin}/sitemap.xml`]

  const sitemapResults = await Promise.all(
    sitemapSources.map(async (sitemap) => {
      const sitemapResponse = await fetcher(sitemap, withUserAgent())

      if (!sitemapResponse.ok) {
        throw new Error(`Failed to fetch sitemap ${sitemap}: ${sitemapResponse.status}`)
      }

      const urls = extractLocs(await sitemapResponse.text())
      return {
        sitemap,
        status: sitemapResponse.status,
        urls,
      }
    }),
  )

  return {
    urls: unique(sitemapResults.flatMap((sitemap) => sitemap.urls)).slice(
      0,
      INDEXNOW_BATCH_LIMIT,
    ),
    sitemaps: sitemapResults.map((sitemap) => ({
      sitemap: sitemap.sitemap,
      status: sitemap.status,
      urlCount: sitemap.urls.length,
    })),
  }
}

export async function submitIndexNowUrls({
  key,
  urls,
  host = DEFAULT_HOST,
  fetcher = fetch,
}: {
  key: string
  urls: string[]
  host?: string
  fetcher?: Fetcher
}) {
  return fetcher(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: urls.slice(0, INDEXNOW_BATCH_LIMIT),
    }),
  })
}
