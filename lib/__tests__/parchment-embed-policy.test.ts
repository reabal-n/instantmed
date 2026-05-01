import { describe, expect, it } from "vitest"

import {
  canEmbedParchmentForHost,
  matchesParchmentIframeHostPattern,
} from "@/lib/parchment/embed-policy"

describe("Parchment embed policy", () => {
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
