/**
 * Bot Detection System Tests
 *
 * Tests for honeypot fields, timing analysis, interaction tracking,
 * submission pattern checks, and orchestrated bot detection.
 * Covers: happy paths, edge cases, and bot-like behaviour.
 */

import { describe, it, expect } from "vitest"
import {
  checkHoneypotFields,
  checkFormTiming,
  checkInteractionPatterns,
  checkSubmissionPatterns,
  runBotDetection,
  HONEYPOT_FIELDS,
  HONEYPOT_CSS,
} from "@/lib/security/bot-detection"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Date offset from a base by the given number of milliseconds. */
function dateOffset(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms)
}

const BASE_TIME = new Date("2026-03-06T10:00:00Z")

// ---------------------------------------------------------------------------
// checkHoneypotFields
// ---------------------------------------------------------------------------

describe("checkHoneypotFields", () => {
  it("passes when no honeypot fields are present", () => {
    const result = checkHoneypotFields({ name: "Alice", age: "30" })
    expect(result.triggered).toBe(false)
    expect(result.type).toBe("honeypot")
    expect(result.details).toContain("No honeypot")
  })

  it("passes when honeypot fields exist but are empty strings", () => {
    const result = checkHoneypotFields({
      [HONEYPOT_FIELDS.email_confirm]: "",
      [HONEYPOT_FIELDS.website]: "",
    })
    expect(result.triggered).toBe(false)
  })

  it("passes when honeypot fields are whitespace-only", () => {
    const result = checkHoneypotFields({
      [HONEYPOT_FIELDS.phone_verify]: "   ",
    })
    expect(result.triggered).toBe(false)
  })

  it("triggers when email_confirm honeypot is filled", () => {
    const result = checkHoneypotFields({
      [HONEYPOT_FIELDS.email_confirm]: "bot@spam.com",
    })
    expect(result.triggered).toBe(true)
    expect(result.type).toBe("honeypot")
    expect(result.details).toContain(HONEYPOT_FIELDS.email_confirm)
  })

  it("triggers when website honeypot is filled", () => {
    const result = checkHoneypotFields({
      [HONEYPOT_FIELDS.website]: "https://spam.example.com",
    })
    expect(result.triggered).toBe(true)
    expect(result.details).toContain(HONEYPOT_FIELDS.website)
  })

  it("triggers when fax honeypot is filled", () => {
    const result = checkHoneypotFields({
      [HONEYPOT_FIELDS.fax]: "555-1234",
    })
    expect(result.triggered).toBe(true)
    expect(result.details).toContain(HONEYPOT_FIELDS.fax)
  })

  it("triggers on numeric values coerced to non-empty strings", () => {
    const result = checkHoneypotFields({
      [HONEYPOT_FIELDS.address_2]: 12345,
    })
    expect(result.triggered).toBe(true)
  })

  it("passes when form data is completely empty", () => {
    const result = checkHoneypotFields({})
    expect(result.triggered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkFormTiming
// ---------------------------------------------------------------------------

describe("checkFormTiming", () => {
  it("passes for normal human completion speed", () => {
    // 5 fields, 31 seconds total = 6.2s per field (not divisible by 5 => no round-time flag)
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 31_000), 5)
    expect(result.triggered).toBe(false)
    expect(result.type).toBe("timing")
    expect(result.details).toContain("Normal")
  })

  it("triggers when form is completed too quickly", () => {
    // 5 fields, 5 seconds total = 1s per field (< 2s threshold)
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 5_000), 5)
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("too quickly")
  })

  it("triggers at the exact 2s-per-field boundary with below-threshold timing", () => {
    // 10 fields, 19 seconds = 1.9s per field (just under 2s)
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 19_000), 10)
    expect(result.triggered).toBe(true)
  })

  it("passes at exactly 2s per field", () => {
    // 5 fields, 10 seconds = 2s per field (not < 2)
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 10_000), 5)
    expect(result.triggered).toBe(false)
  })

  it("triggers on suspiciously round completion time divisible by 5", () => {
    // 15 seconds exactly, 1 field = 15s/field (passes speed check)
    // 15 % 5 === 0 && 15 > 10 => triggers
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 15_000), 1)
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("round")
  })

  it("does not trigger round-time check for durations of 10s or less", () => {
    // 10 seconds exactly, 1 field = 10s/field (passes speed check)
    // 10 % 5 === 0 but 10 is NOT > 10 => does not trigger
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 10_000), 1)
    expect(result.triggered).toBe(false)
  })

  it("handles fieldCount of 0 without division error", () => {
    // Math.max(0, 1) = 1, so 61s / 1 = 61s per field (not divisible by 5)
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 61_000), 0)
    expect(result.triggered).toBe(false)
  })

  it("triggers round-time check at exactly 20 seconds", () => {
    // 20s, 1 field => 20s/field (ok). 20 % 5 === 0 && 20 > 10 => triggers
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 20_000), 1)
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("exactly 20s")
  })

  it("does not trigger round-time check for non-divisible-by-5 durations", () => {
    // 17 seconds, 1 field => 17s/field (ok). 17 % 5 !== 0 => not round
    const result = checkFormTiming(BASE_TIME, dateOffset(BASE_TIME, 17_000), 1)
    expect(result.triggered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkInteractionPatterns
// ---------------------------------------------------------------------------

describe("checkInteractionPatterns", () => {
  it("passes for normal human interaction patterns", () => {
    const result = checkInteractionPatterns({
      mouseMovements: 50,
      keystrokes: 30,
      scrollEvents: 5,
      focusChanges: 8,
    })
    expect(result.triggered).toBe(false)
    expect(result.type).toBe("interaction")
    expect(result.details).toContain("Normal")
  })

  it("triggers when keystrokes present but no mouse movement", () => {
    const result = checkInteractionPatterns({
      mouseMovements: 0,
      keystrokes: 20,
      scrollEvents: 3,
      focusChanges: 5,
    })
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("No mouse movement")
  })

  it("does not trigger no-mouse check when keystrokes are 10 or fewer", () => {
    // mouseMovements=0 but keystrokes=10 (not > 10) => does not trigger
    const result = checkInteractionPatterns({
      mouseMovements: 0,
      keystrokes: 10,
      scrollEvents: 3,
      focusChanges: 5,
    })
    expect(result.triggered).toBe(false)
  })

  it("triggers when long form completed without scrolling", () => {
    const result = checkInteractionPatterns({
      mouseMovements: 30,
      keystrokes: 60,
      scrollEvents: 0,
      focusChanges: 10,
    })
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("without scrolling")
  })

  it("does not trigger no-scroll check when keystrokes are 50 or fewer", () => {
    const result = checkInteractionPatterns({
      mouseMovements: 10,
      keystrokes: 50,
      scrollEvents: 0,
      focusChanges: 5,
    })
    expect(result.triggered).toBe(false)
  })

  it("triggers when no focus changes with many keystrokes", () => {
    const result = checkInteractionPatterns({
      mouseMovements: 20,
      keystrokes: 30,
      scrollEvents: 5,
      focusChanges: 0,
    })
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("No field focus changes")
  })

  it("does not trigger no-focus check when keystrokes are 20 or fewer", () => {
    const result = checkInteractionPatterns({
      mouseMovements: 10,
      keystrokes: 20,
      scrollEvents: 2,
      focusChanges: 0,
    })
    expect(result.triggered).toBe(false)
  })

  it("defaults missing interaction fields to 0", () => {
    // All default to 0 — no conditions triggered because keystrokes=0
    const result = checkInteractionPatterns({})
    expect(result.triggered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkSubmissionPatterns
// ---------------------------------------------------------------------------

describe("checkSubmissionPatterns", () => {
  const normalUA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  const normalLang = "en-AU,en;q=0.9"
  const normalEnc = "gzip, deflate, br"

  it("passes for a normal browser user agent", () => {
    const result = checkSubmissionPatterns(normalUA, normalLang, normalEnc)
    expect(result.triggered).toBe(false)
    expect(result.type).toBe("pattern")
    expect(result.details).toContain("Normal")
  })

  it("triggers on Puppeteer user agent", () => {
    const result = checkSubmissionPatterns(
      "Mozilla/5.0 HeadlessChrome Puppeteer",
      normalLang,
      normalEnc
    )
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("Bot user agent")
  })

  it("triggers on Selenium user agent", () => {
    const result = checkSubmissionPatterns(
      "Selenium/4.0",
      normalLang,
      normalEnc
    )
    expect(result.triggered).toBe(true)
  })

  it("triggers on curl user agent", () => {
    const result = checkSubmissionPatterns("curl/7.88.1", normalLang, normalEnc)
    expect(result.triggered).toBe(true)
  })

  it("triggers on wget user agent", () => {
    const result = checkSubmissionPatterns("Wget/1.21", normalLang, normalEnc)
    expect(result.triggered).toBe(true)
  })

  it("triggers on python-requests user agent", () => {
    const result = checkSubmissionPatterns(
      "python-requests/2.31.0",
      normalLang,
      normalEnc
    )
    expect(result.triggered).toBe(true)
  })

  it("triggers on axios user agent", () => {
    const result = checkSubmissionPatterns("axios/1.6.0", normalLang, normalEnc)
    expect(result.triggered).toBe(true)
  })

  it("triggers on generic bot user agent", () => {
    const result = checkSubmissionPatterns(
      "MyCustomBot/1.0",
      normalLang,
      normalEnc
    )
    expect(result.triggered).toBe(true)
  })

  it("triggers on crawler user agent", () => {
    const result = checkSubmissionPatterns(
      "WebCrawler/2.0",
      normalLang,
      normalEnc
    )
    expect(result.triggered).toBe(true)
  })

  it("triggers when Accept-Language header is missing", () => {
    const result = checkSubmissionPatterns(normalUA, "", normalEnc)
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("Missing standard browser headers")
  })

  it("triggers when Accept-Encoding header is missing", () => {
    const result = checkSubmissionPatterns(normalUA, normalLang, "")
    expect(result.triggered).toBe(true)
    expect(result.details).toContain("Missing standard browser headers")
  })

  it("triggers when both standard headers are missing", () => {
    const result = checkSubmissionPatterns(normalUA, "", "")
    expect(result.triggered).toBe(true)
  })

  it("truncates long user agent in details to 50 chars", () => {
    const longUA = "HeadlessBot/" + "a".repeat(100)
    const result = checkSubmissionPatterns(longUA, normalLang, normalEnc)
    expect(result.triggered).toBe(true)
    // The details should contain at most 50 chars of the UA
    expect(result.details.length).toBeLessThan(longUA.length + 50)
  })
})

// ---------------------------------------------------------------------------
// runBotDetection (orchestrated)
// ---------------------------------------------------------------------------

describe("runBotDetection", () => {
  const normalParams = {
    formData: { name: "Alice" },
    startTime: BASE_TIME,
    endTime: dateOffset(BASE_TIME, 31_000), // 31s, normal pace (not divisible by 5)
    fieldCount: 5,
    interactions: {
      mouseMovements: 50,
      keystrokes: 30,
      scrollEvents: 5,
      focusChanges: 8,
    },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    acceptLanguage: "en-AU,en;q=0.9",
    acceptEncoding: "gzip, deflate, br",
  }

  it("classifies a normal human as not a bot", () => {
    const result = runBotDetection(normalParams)
    expect(result.isBot).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.signals.length).toBe(4) // honeypot + timing + interaction + pattern
    expect(result.signals.every((s) => !s.triggered)).toBe(true)
  })

  it("classifies as bot when honeypot is triggered (single signal)", () => {
    const result = runBotDetection({
      ...normalParams,
      formData: { [HONEYPOT_FIELDS.website]: "spam.com" },
    })
    expect(result.isBot).toBe(true)
    // Honeypot alone is enough (special rule)
    expect(result.signals.some((s) => s.type === "honeypot" && s.triggered)).toBe(true)
  })

  it("classifies as bot when 2+ signals trigger (timing + pattern)", () => {
    const result = runBotDetection({
      ...normalParams,
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 2_000), // 2s for 5 fields = 0.4s/field => too fast
      userAgent: "curl/7.88.1",
    })
    expect(result.isBot).toBe(true)
    const triggered = result.signals.filter((s) => s.triggered)
    expect(triggered.length).toBeGreaterThanOrEqual(2)
  })

  it("does not classify as bot with only one non-honeypot signal", () => {
    // Only timing triggers; everything else is clean
    const result = runBotDetection({
      ...normalParams,
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 2_000), // too fast
    })
    expect(result.isBot).toBe(false)
    const triggered = result.signals.filter((s) => s.triggered)
    expect(triggered.length).toBe(1)
  })

  it("calculates confidence as percentage of triggered signals", () => {
    // 4 signals total, 2 triggered = 50%
    const result = runBotDetection({
      ...normalParams,
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 2_000), // timing triggers
      userAgent: "Puppeteer/1.0", // pattern triggers
    })
    expect(result.confidence).toBe(50)
  })

  it("returns 100% confidence when all 4 signals trigger", () => {
    const result = runBotDetection({
      formData: { [HONEYPOT_FIELDS.email_confirm]: "bot@bot.com" },
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 1_000), // 1s for 5 fields
      fieldCount: 5,
      interactions: {
        mouseMovements: 0,
        keystrokes: 30, // no mouse + keystrokes > 10
        scrollEvents: 0,
        focusChanges: 0,
      },
      userAgent: "Selenium/4.0",
      acceptLanguage: "",
      acceptEncoding: "",
    })
    expect(result.isBot).toBe(true)
    expect(result.confidence).toBe(100)
    expect(result.signals.length).toBe(4)
    expect(result.signals.every((s) => s.triggered)).toBe(true)
  })

  it("runs only honeypot + timing when no optional params provided", () => {
    const result = runBotDetection({
      formData: {},
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 30_000),
      fieldCount: 5,
    })
    expect(result.signals.length).toBe(2)
    expect(result.signals.map((s) => s.type)).toEqual(["honeypot", "timing"])
    expect(result.isBot).toBe(false)
  })

  it("includes interaction check only when interactions object is provided", () => {
    const result = runBotDetection({
      formData: {},
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 30_000),
      fieldCount: 5,
      interactions: { mouseMovements: 10, keystrokes: 5 },
    })
    expect(result.signals.length).toBe(3) // honeypot + timing + interaction
    expect(result.signals.map((s) => s.type)).toEqual([
      "honeypot",
      "timing",
      "interaction",
    ])
  })

  it("includes pattern check only when userAgent is provided", () => {
    const result = runBotDetection({
      formData: {},
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 30_000),
      fieldCount: 5,
      userAgent: "Mozilla/5.0",
      acceptLanguage: "en",
      acceptEncoding: "gzip",
    })
    expect(result.signals.length).toBe(3) // honeypot + timing + pattern
    expect(result.signals.map((s) => s.type)).toEqual([
      "honeypot",
      "timing",
      "pattern",
    ])
  })

  it("defaults acceptLanguage and acceptEncoding to empty string when absent", () => {
    // userAgent provided but no acceptLanguage/acceptEncoding => both default to ""
    // Missing headers triggers pattern signal
    const result = runBotDetection({
      formData: {},
      startTime: BASE_TIME,
      endTime: dateOffset(BASE_TIME, 30_000),
      fieldCount: 5,
      userAgent: "Mozilla/5.0",
    })
    const patternSignal = result.signals.find((s) => s.type === "pattern")
    expect(patternSignal).toBeDefined()
    expect(patternSignal!.triggered).toBe(true)
    expect(patternSignal!.details).toContain("Missing standard browser headers")
  })
})

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe("exported constants", () => {
  it("HONEYPOT_FIELDS contains expected field names", () => {
    expect(HONEYPOT_FIELDS.email_confirm).toBe("email_confirm")
    expect(HONEYPOT_FIELDS.phone_verify).toBe("phone_verify")
    expect(HONEYPOT_FIELDS.address_2).toBe("address_line_2")
    expect(HONEYPOT_FIELDS.website).toBe("website_url")
    expect(HONEYPOT_FIELDS.fax).toBe("fax_number")
  })

  it("HONEYPOT_CSS contains visibility hiding rules", () => {
    expect(HONEYPOT_CSS).toContain("hp-field")
    expect(HONEYPOT_CSS).toContain("opacity: 0")
    expect(HONEYPOT_CSS).toContain("pointer-events: none")
  })
})
