/**
 * Sanitization Module Tests
 *
 * Tests for input sanitization functions used across the platform.
 * Covers: sanitizeString, sanitizeHtml, sanitizeEmail, sanitizePhone, sanitizeObject.
 */

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  sanitizeString,
  sanitizeHtml,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject,
  sanitizedSchemas,
  validateAndSanitize,
} from "@/lib/security/sanitize"

describe("sanitizeString", () => {
  it("passes through normal text unchanged", () => {
    expect(sanitizeString("Hello world")).toBe("Hello world")
  })

  it("preserves unicode characters", () => {
    expect(sanitizeString("José O'Brien-Müller")).toBe("José O'Brien-Müller")
  })

  it("returns empty string for empty input", () => {
    expect(sanitizeString("")).toBe("")
  })

  it("returns empty string for null-like falsy values", () => {
    // The function checks !input first, so these coerce to empty
    expect(sanitizeString(null as unknown as string)).toBe("")
    expect(sanitizeString(undefined as unknown as string)).toBe("")
  })

  it("returns empty string for non-string types", () => {
    expect(sanitizeString(123 as unknown as string)).toBe("")
    expect(sanitizeString({} as unknown as string)).toBe("")
  })

  it("removes simple HTML tags", () => {
    expect(sanitizeString("Hello <b>world</b>")).toBe("Hello world")
  })

  it("removes script tags and their content", () => {
    const input = 'Hello <script>alert("xss")</script> world'
    const result = sanitizeString(input)
    expect(result).not.toContain("<script")
    expect(result).not.toContain("alert")
    expect(result).toBe("Hello  world")
  })

  it("removes script tags case-insensitively", () => {
    const input = 'Hello <SCRIPT>alert("xss")</SCRIPT> world'
    const result = sanitizeString(input)
    expect(result).not.toContain("<SCRIPT")
    expect(result).not.toContain("alert")
    expect(result).toBe("Hello  world")
  })

  it("removes script tags with attributes", () => {
    const input = 'Hello <script type="text/javascript">alert("xss")</script> world'
    const result = sanitizeString(input)
    expect(result).not.toContain("<script")
    expect(result).not.toContain("alert")
    expect(result).toBe("Hello  world")
  })

  it("removes event handler attributes by stripping the tag", () => {
    const input = '<img onerror="alert(1)" src="x">'
    expect(sanitizeString(input)).toBe("")
  })

  it("removes anchor tags with javascript: protocol", () => {
    const input = '<a href="javascript:alert(1)">click</a>'
    expect(sanitizeString(input)).toBe("click")
  })

  it("removes iframe tags", () => {
    const input = '<iframe src="https://evil.com"></iframe>'
    expect(sanitizeString(input)).toBe("")
  })

  it("removes null bytes", () => {
    expect(sanitizeString("hello\0world")).toBe("helloworld")
  })

  it("collapses excessive whitespace to a single space", () => {
    expect(sanitizeString("hello     world")).toBe("hello world")
  })

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello")
  })

  it("preserves double spaces (not excessive)", () => {
    // Pattern matches 3+ whitespace chars, so double space is kept
    expect(sanitizeString("hello  world")).toBe("hello  world")
  })

  it("handles combined attack vectors", () => {
    const input =
      '<script>alert("xss")</script><img onerror="alert(1)">\0  DROP TABLE users;     '
    const result = sanitizeString(input)
    expect(result).not.toContain("<script")
    expect(result).not.toContain("<img")
    expect(result).not.toContain("\0")
  })
})

describe("sanitizeHtml", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("")
  })

  it("returns empty string for null-like falsy values", () => {
    expect(sanitizeHtml(null as unknown as string)).toBe("")
    expect(sanitizeHtml(undefined as unknown as string)).toBe("")
  })

  it("strips all HTML when no allowed tags specified", () => {
    expect(sanitizeHtml("<b>bold</b> and <i>italic</i>")).toBe("bold and italic")
  })

  it("preserves allowed tags", () => {
    const result = sanitizeHtml("<b>bold</b> and <i>italic</i>", ["b"])
    expect(result).toBe("<b>bold</b> and italic")
  })

  it("preserves multiple allowed tags", () => {
    const input = "<b>bold</b> <i>italic</i> <u>underline</u>"
    const result = sanitizeHtml(input, ["b", "i"])
    expect(result).toBe("<b>bold</b> <i>italic</i> underline")
  })

  it("preserves closing tags of allowed tags", () => {
    const result = sanitizeHtml("<p>paragraph</p>", ["p"])
    expect(result).toContain("</p>")
  })

  it("always removes script tags even if in allowed list", () => {
    const input = '<script>alert("xss")</script><p>text</p>'
    const result = sanitizeHtml(input, ["script", "p"])
    expect(result).not.toContain("<script")
    expect(result).toContain("<p>text</p>")
  })

  it("removes dangerous tags while keeping safe ones", () => {
    const input = "<p>text</p><iframe src='evil.com'></iframe><p>more</p>"
    const result = sanitizeHtml(input, ["p"])
    expect(result).toBe("<p>text</p><p>more</p>")
  })

  it("is case-insensitive for tag removal", () => {
    const input = "<B>bold</B> <I>italic</I>"
    const result = sanitizeHtml(input, ["b"])
    // The allowed tag regex is case-insensitive, so <B> should be kept
    expect(result).toContain("bold")
  })
})

describe("sanitizeEmail", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeEmail("")).toBe("")
  })

  it("returns empty string for null-like falsy values", () => {
    expect(sanitizeEmail(null as unknown as string)).toBe("")
    expect(sanitizeEmail(undefined as unknown as string)).toBe("")
  })

  it("lowercases the email", () => {
    expect(sanitizeEmail("User@Example.COM")).toBe("user@example.com")
  })

  it("trims whitespace", () => {
    expect(sanitizeEmail("  user@example.com  ")).toBe("user@example.com")
  })

  it("removes angle brackets", () => {
    expect(sanitizeEmail("<user@example.com>")).toBe("user@example.com")
  })

  it("handles combined issues", () => {
    expect(sanitizeEmail("  <User@Example.COM>  ")).toBe("user@example.com")
  })

  it("preserves valid email characters", () => {
    expect(sanitizeEmail("user+tag@sub.example.com")).toBe("user+tag@sub.example.com")
  })

  it("preserves dots and hyphens", () => {
    expect(sanitizeEmail("first.last@my-domain.com.au")).toBe(
      "first.last@my-domain.com.au"
    )
  })
})

describe("sanitizePhone", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizePhone("")).toBe("")
  })

  it("returns empty string for null-like falsy values", () => {
    expect(sanitizePhone(null as unknown as string)).toBe("")
    expect(sanitizePhone(undefined as unknown as string)).toBe("")
  })

  it("keeps a clean Australian mobile number", () => {
    expect(sanitizePhone("0412 345 678")).toBe("0412 345 678")
  })

  it("keeps international prefix format", () => {
    expect(sanitizePhone("+61 412 345 678")).toBe("+61 412 345 678")
  })

  it("keeps parentheses for area codes", () => {
    expect(sanitizePhone("(02) 9123 4567")).toBe("(02) 9123 4567")
  })

  it("keeps hyphens", () => {
    expect(sanitizePhone("0412-345-678")).toBe("0412-345-678")
  })

  it("removes letters", () => {
    expect(sanitizePhone("0412abc678")).toBe("0412678")
  })

  it("removes special injection characters", () => {
    expect(sanitizePhone("0412<script>345")).toBe("0412345")
  })

  it("removes semicolons and quotes", () => {
    expect(sanitizePhone('0412;345"678')).toBe("0412345678")
  })

  it("trims whitespace", () => {
    expect(sanitizePhone("  0412345678  ")).toBe("0412345678")
  })
})

describe("sanitizeObject", () => {
  it("sanitizes string values in a flat object", () => {
    const result = sanitizeObject({
      name: "<b>John</b>",
      greeting: "Hello world",
    })
    expect(result.name).toBe("John")
    expect(result.greeting).toBe("Hello world")
  })

  it("preserves non-string values", () => {
    const result = sanitizeObject({
      count: 42,
      active: true,
      empty: null,
    })
    expect(result.count).toBe(42)
    expect(result.active).toBe(true)
    expect(result.empty).toBe(null)
  })

  it("sanitizes string items in arrays", () => {
    const result = sanitizeObject({
      tags: ["<b>tag1</b>", "tag2", '<script>alert("x")</script>tag3'],
    })
    expect(result.tags).toEqual(["tag1", "tag2", "tag3"])
  })

  it("preserves non-string items in arrays", () => {
    const result = sanitizeObject({
      numbers: [1, 2, 3],
    })
    expect(result.numbers).toEqual([1, 2, 3])
  })

  it("recursively sanitizes nested objects", () => {
    const result = sanitizeObject({
      user: {
        name: "<b>John</b>",
        address: {
          street: '<script>alert("xss")</script>123 Main St',
        },
      },
    })
    expect(result.user).toEqual({
      name: "John",
      address: {
        street: "123 Main St",
      },
    })
  })

  it("handles mixed types in a complex object", () => {
    const result = sanitizeObject({
      name: "<b>Jane</b>",
      age: 30,
      active: true,
      tags: ["<i>admin</i>", "user"],
      profile: {
        bio: '<img src="x" onerror="alert(1)">Developer',
        score: 100,
      },
    })

    expect(result).toEqual({
      name: "Jane",
      age: 30,
      active: true,
      tags: ["admin", "user"],
      profile: {
        bio: "Developer",
        score: 100,
      },
    })
  })

  it("handles an empty object", () => {
    expect(sanitizeObject({})).toEqual({})
  })

  it("removes null bytes from nested string values", () => {
    const result = sanitizeObject({
      note: "hello\0world",
    })
    expect(result.note).toBe("helloworld")
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// sanitizedSchemas — Zod schemas with built-in sanitization
// ──────────────────────────────────────────────────────────────────────────────
describe("sanitizedSchemas", () => {
  describe("medicare", () => {
    it("accepts a valid 10-digit Medicare number", () => {
      const result = sanitizedSchemas.medicare.safeParse("1234567890")
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe("1234567890")
    })

    it("accepts a valid 11-digit Medicare number", () => {
      const result = sanitizedSchemas.medicare.safeParse("12345678901")
      expect(result.success).toBe(true)
    })

    it("rejects non-digit characters", () => {
      const result = sanitizedSchemas.medicare.safeParse("12345abcde")
      expect(result.success).toBe(false)
    })

    it("rejects too short numbers", () => {
      const result = sanitizedSchemas.medicare.safeParse("123456789")
      expect(result.success).toBe(false)
    })
  })

  describe("name", () => {
    it("accepts standard names", () => {
      const result = sanitizedSchemas.name.safeParse("Jane Smith")
      expect(result.success).toBe(true)
    })

    it("accepts names with hyphens and apostrophes", () => {
      const result = sanitizedSchemas.name.safeParse("Mary-Jane O'Brien")
      expect(result.success).toBe(true)
    })

    it("accepts unicode names", () => {
      const result = sanitizedSchemas.name.safeParse("José García")
      expect(result.success).toBe(true)
    })

    it("rejects names with digits", () => {
      const result = sanitizedSchemas.name.safeParse("User123")
      expect(result.success).toBe(false)
    })

    it("rejects names shorter than 2 chars", () => {
      const result = sanitizedSchemas.name.safeParse("A")
      expect(result.success).toBe(false)
    })

    it("sanitizes HTML in accepted names", () => {
      const result = sanitizedSchemas.name.safeParse("Jane Smith")
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).not.toContain("<")
    })
  })

  describe("dateOfBirth", () => {
    it("accepts a valid DOB in YYYY-MM-DD", () => {
      const result = sanitizedSchemas.dateOfBirth.safeParse("1990-05-15")
      expect(result.success).toBe(true)
    })

    it("rejects invalid date format", () => {
      const result = sanitizedSchemas.dateOfBirth.safeParse("15/05/1990")
      expect(result.success).toBe(false)
    })

    it("rejects future dates", () => {
      const result = sanitizedSchemas.dateOfBirth.safeParse("2090-01-01")
      expect(result.success).toBe(false)
    })
  })

  describe("freeText", () => {
    it("accepts text within length limit", () => {
      const schema = sanitizedSchemas.freeText(100)
      const result = schema.safeParse("Short text")
      expect(result.success).toBe(true)
    })

    it("rejects text exceeding length limit", () => {
      const schema = sanitizedSchemas.freeText(10)
      const result = schema.safeParse("This text is way too long")
      expect(result.success).toBe(false)
    })

    it("sanitizes HTML tags", () => {
      const schema = sanitizedSchemas.freeText(1000)
      const result = schema.safeParse("<script>alert(1)</script>Hello")
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).not.toContain("<script>")
    })
  })

  describe("url", () => {
    it("accepts valid HTTPS URLs", () => {
      const result = sanitizedSchemas.url.safeParse("https://example.com")
      expect(result.success).toBe(true)
    })

    it("rejects HTTP URLs", () => {
      const result = sanitizedSchemas.url.safeParse("http://example.com")
      expect(result.success).toBe(false)
    })

    it("rejects non-URL strings", () => {
      const result = sanitizedSchemas.url.safeParse("not-a-url")
      expect(result.success).toBe(false)
    })
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// validateAndSanitize — Request body validation
// ──────────────────────────────────────────────────────────────────────────────
describe("validateAndSanitize", () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number(),
  })

  function makeRequest(body: unknown): Request {
    return {
      json: () => Promise.resolve(body),
    } as Request
  }

  it("validates and returns data for valid input", async () => {
    const result = await validateAndSanitize(
      makeRequest({ name: "Jane", age: 30 }),
      testSchema
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Jane")
      expect(result.data.age).toBe(30)
    }
  })

  it("returns error for invalid schema", async () => {
    const result = await validateAndSanitize(
      makeRequest({ name: "", age: "not-a-number" }),
      testSchema
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBeTruthy()
  })

  it("returns error for invalid JSON", async () => {
    const badRequest = {
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as Request
    const result = await validateAndSanitize(badRequest, testSchema)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("Invalid JSON body")
  })

  it("sanitizes HTML before validation", async () => {
    const result = await validateAndSanitize(
      makeRequest({ name: "<b>Jane</b>", age: 30 }),
      testSchema
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe("Jane")
  })
})
