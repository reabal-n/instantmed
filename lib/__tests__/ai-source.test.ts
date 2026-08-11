/**
 * Exact AI-source classification + referrer privacy (2026-08-11)
 *
 * Pins the replacement of substring AI detection: `utm_source=youtube` used
 * to classify as You.com, `bing` as Copilot, `meta` as Meta AI,
 * `gemini_test` as Gemini, and any URL containing "chatgpt" as an AI
 * arrival — polluting the channel data the growth strategy reads. Also pins
 * the referrer sanitizer every persistence path now runs.
 */

import { describe, expect, it } from "vitest"

import { classifyAiSource } from "@/lib/analytics/ai-source"
import { sanitizeAttributionReferrer } from "@/lib/analytics/referrer-privacy"

describe("classifyAiSource — utm_source (exact match only)", () => {
  it("matches known AI utm_source values exactly", () => {
    expect(classifyAiSource({ utmSource: "chatgpt.com" })).toEqual({
      label: "ChatGPT",
      matchedBy: "utm_source",
    })
    expect(classifyAiSource({ utmSource: "ChatGPT" })?.label).toBe("ChatGPT")
    expect(classifyAiSource({ utmSource: "  perplexity  " })?.label).toBe("Perplexity")
    expect(classifyAiSource({ utmSource: "claude.ai" })?.label).toBe("Claude")
  })

  it("rejects the substring-era false positives", () => {
    expect(classifyAiSource({ utmSource: "youtube" })).toBeNull()
    expect(classifyAiSource({ utmSource: "bing" })).toBeNull()
    expect(classifyAiSource({ utmSource: "meta" })).toBeNull()
    expect(classifyAiSource({ utmSource: "gemini_test" })).toBeNull()
    expect(classifyAiSource({ utmSource: "livechat" })).toBeNull()
    expect(classifyAiSource({ utmSource: "you" })).toBeNull()
  })
})

describe("classifyAiSource — referrer (host-anchored)", () => {
  it("matches exact hosts and subdomains", () => {
    expect(classifyAiSource({ referrer: "https://chatgpt.com/" })?.label).toBe("ChatGPT")
    expect(classifyAiSource({ referrer: "https://www.perplexity.ai/search" })?.label).toBe(
      "Perplexity",
    )
    expect(classifyAiSource({ referrer: "https://gemini.google.com/app" })?.label).toBe("Gemini")
    expect(classifyAiSource({ referrer: "https://copilot.microsoft.com/" })?.label).toBe("Copilot")
    expect(classifyAiSource({ referrer: "https://claude.ai/chat/abc" })?.label).toBe("Claude")
    expect(classifyAiSource({ referrer: "https://poe.com" })?.label).toBe("Poe")
  })

  it("reports how the match was made", () => {
    expect(classifyAiSource({ referrer: "https://chatgpt.com/" })?.matchedBy).toBe("referrer")
  })

  it("rejects lookalike hosts, path mentions, and garbage", () => {
    expect(classifyAiSource({ referrer: "https://chatgpt.com.evil.example/" })).toBeNull()
    expect(classifyAiSource({ referrer: "https://reddit.com/r/chatgpt/top" })).toBeNull()
    expect(classifyAiSource({ referrer: "https://openai.com/research" })).toBeNull()
    expect(classifyAiSource({ referrer: "https://bing.com/chat" })).toBeNull()
    expect(classifyAiSource({ referrer: "not a url" })).toBeNull()
    expect(classifyAiSource({ referrer: "" })).toBeNull()
    expect(classifyAiSource({})).toBeNull()
  })

  it("classifies google.com as non-AI (organic stays organic)", () => {
    expect(classifyAiSource({ referrer: "https://www.google.com/" })).toBeNull()
    expect(classifyAiSource({ referrer: "https://www.bing.com/search?q=x" })).toBeNull()
  })
})

describe("sanitizeAttributionReferrer", () => {
  it("keeps origin only for external referrers", () => {
    expect(
      sanitizeAttributionReferrer("https://chatgpt.com/c/private-thread?prompt=health"),
    ).toBe("https://chatgpt.com")
    expect(sanitizeAttributionReferrer("https://www.google.com/search?q=med+cert")).toBe(
      "https://www.google.com",
    )
  })

  it("keeps path only for internal referrers", () => {
    expect(
      sanitizeAttributionReferrer("https://instantmed.com.au/request?symptom=private"),
    ).toBe("/request")
    expect(
      sanitizeAttributionReferrer("https://www.instantmed.com.au/medical-certificate"),
    ).toBe("/medical-certificate")
    expect(
      sanitizeAttributionReferrer("http://localhost:3060/request?x=1", "http://localhost:3060"),
    ).toBe("/request")
  })

  it("drops unparseable, scheme-less, and non-http values", () => {
    expect(sanitizeAttributionReferrer("not a url")).toBeUndefined()
    expect(sanitizeAttributionReferrer("chatgpt.com/c/thread")).toBeUndefined()
    expect(sanitizeAttributionReferrer("javascript:alert(1)")).toBeUndefined()
    expect(sanitizeAttributionReferrer("")).toBeUndefined()
    expect(sanitizeAttributionReferrer(null)).toBeUndefined()
    expect(sanitizeAttributionReferrer(undefined)).toBeUndefined()
  })
})
