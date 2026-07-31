import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  canEmbedParchmentForHost,
  matchesParchmentIframeHostPattern,
} from "@/lib/parchment/embed-policy"

describe("Parchment embed policy", () => {
  it("reads the public iframe override through a statically analyzable client reference", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/parchment/embed-policy.ts"),
      "utf8",
    )

    expect(source).toContain(
      "process.env.NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS",
    )
    expect(source).not.toMatch(/env:\s*Record<string, string \| undefined>\s*=\s*process\.env/)
  })

  it("allows local, Vercel, and whitelisted production hosts by default", () => {
    expect(canEmbedParchmentForHost("localhost")).toBe(true)
    expect(canEmbedParchmentForHost("127.0.0.1")).toBe(true)
    expect(canEmbedParchmentForHost("instantmed-git-main-rey-project.vercel.app")).toBe(true)
    expect(canEmbedParchmentForHost("instantmed.com.au")).toBe(true)
    expect(canEmbedParchmentForHost("www.instantmed.com.au")).toBe(true)
  })

  it("matches wildcard host patterns only for subdomains", () => {
    expect(matchesParchmentIframeHostPattern("preview.vercel.app", "*.vercel.app")).toBe(true)
    expect(matchesParchmentIframeHostPattern("vercel.app", "*.vercel.app")).toBe(false)
  })

  it("can be overridden if Parchment host policy changes", () => {
    expect(canEmbedParchmentForHost("instantmed.com.au", ["instantmed.com.au", "www.instantmed.com.au"])).toBe(true)
  })
})
