import { describe, expect, it } from "vitest"

import {
  canEmbedParchmentForHost,
  matchesParchmentIframeHostPattern,
} from "@/lib/parchment/embed-policy"

describe("Parchment embed policy", () => {
  it("allows local and Vercel hosts that Parchment sandbox currently permits", () => {
    expect(canEmbedParchmentForHost("localhost")).toBe(true)
    expect(canEmbedParchmentForHost("127.0.0.1")).toBe(true)
    expect(canEmbedParchmentForHost("instantmed-git-main-rey-project.vercel.app")).toBe(true)
  })

  it("does not assume custom production domains are iframe-whitelisted", () => {
    expect(canEmbedParchmentForHost("instantmed.com.au")).toBe(false)
    expect(canEmbedParchmentForHost("www.instantmed.com.au")).toBe(false)
  })

  it("matches wildcard host patterns only for subdomains", () => {
    expect(matchesParchmentIframeHostPattern("preview.vercel.app", "*.vercel.app")).toBe(true)
    expect(matchesParchmentIframeHostPattern("vercel.app", "*.vercel.app")).toBe(false)
  })

  it("can be overridden after Parchment whitelists the production domain", () => {
    expect(canEmbedParchmentForHost("instantmed.com.au", ["instantmed.com.au", "www.instantmed.com.au"])).toBe(true)
  })
})
