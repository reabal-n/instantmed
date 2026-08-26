import { describe, expect, it } from "vitest"

type Header = {
  key: string
  value: string
}

type HeaderRoute = {
  source: string
  headers: Header[]
}

type NextConfigWithHeaders = {
  headers: () => Promise<HeaderRoute[]>
}

async function getHeadersFor(nodeEnv: "development" | "production") {
  const previousNodeEnv = process.env.NODE_ENV
  // @ts-expect-error NODE_ENV is typed as read-only, but the config reads it at call time.
  process.env.NODE_ENV = nodeEnv

  try {
    const { default: nextConfig } = (await import("../../next.config.mjs")) as {
      default: NextConfigWithHeaders
    }
    return nextConfig.headers()
  } finally {
    // @ts-expect-error NODE_ENV is typed as read-only, but the config reads it at call time.
    process.env.NODE_ENV = previousNodeEnv
  }
}

function getHeaderValue(headers: HeaderRoute[], key: string) {
  return headers[0]?.headers.find((header) => header.key === key)?.value ?? ""
}

function getDirective(csp: string, name: string) {
  return csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `)) ?? ""
}

describe("certificate preview CSP contract", () => {
  it("allows short-lived PDF object URLs in frames without enabling object embeds", async () => {
    const developmentHeaders = await getHeadersFor("development")
    const productionHeaders = await getHeadersFor("production")
    const policies = [
      getHeaderValue(developmentHeaders, "Content-Security-Policy"),
      getHeaderValue(productionHeaders, "Content-Security-Policy"),
      getHeaderValue(productionHeaders, "Content-Security-Policy-Report-Only"),
    ]

    for (const csp of policies) {
      expect(getDirective(csp, "frame-src").split(/\s+/)).toContain("blob:")
      expect(getDirective(csp, "object-src")).toBe("object-src 'none'")
    }
  })
})
