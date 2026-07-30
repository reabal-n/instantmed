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

function getFrameSources(csp: string) {
  return csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-src ")) ?? ""
}

describe("Parchment frame CSP contract", () => {
  it("allows the sandbox portal locally without widening production", async () => {
    const developmentHeaders = await getHeadersFor("development")
    const productionHeaders = await getHeadersFor("production")
    const developmentFrameSources = getFrameSources(
      getHeaderValue(developmentHeaders, "Content-Security-Policy"),
    )
    const productionFrameSources = getFrameSources(
      getHeaderValue(productionHeaders, "Content-Security-Policy"),
    )
    const productionReportOnlyFrameSources = getFrameSources(
      getHeaderValue(productionHeaders, "Content-Security-Policy-Report-Only"),
    )

    expect(developmentFrameSources).toContain("https://portal.parchment.health")
    expect(developmentFrameSources).toContain("https://portal.sandbox.parchment.health")
    expect(productionFrameSources).toContain("https://portal.parchment.health")
    expect(productionFrameSources).not.toContain("https://portal.sandbox.parchment.health")
    expect(productionReportOnlyFrameSources).not.toContain(
      "https://portal.sandbox.parchment.health",
    )
  })
})
