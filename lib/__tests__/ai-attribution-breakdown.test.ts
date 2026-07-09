import { describe, expect, it } from "vitest"

import {
  classifyAiUtmSource,
  getAiAttributionBreakdown,
} from "@/lib/admin/ai-attribution-breakdown"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

// Minimal supabase stub: from().select().in().gte() resolves to { data, error }.
function stub(
  result: { data: unknown; error: unknown },
  opts?: { onSelect?: (columns: string) => void },
) {
  const chain = {
    select: (columns: string) => {
      opts?.onSelect?.(columns)
      return chain
    },
    in: () => chain,
    gte: () => Promise.resolve(result),
  }
  return { from: () => chain } as never
}

// A created_at guaranteed inside the CURRENT week bucket (weekly.at(-1)).
// Must be `now`, not `now - 24h`: weeks are bucketed by Monday (mondayUTC,
// matching Postgres date_trunc('week')), so on a Monday `now - 24h` falls into
// the PRIOR week and the weekly.at(-1) assertions flake. `now` is always in the
// current week regardless of weekday.
const recentIso = new Date().toISOString()

describe("classifyAiUtmSource", () => {
  it("maps known AI hosts to engine labels", () => {
    expect(classifyAiUtmSource("chatgpt.com")).toBe("ChatGPT")
    expect(classifyAiUtmSource("chat.openai.com")).toBe("ChatGPT")
    expect(classifyAiUtmSource("perplexity.ai")).toBe("Perplexity")
    expect(classifyAiUtmSource("gemini.google.com")).toBe("Gemini")
  })

  it("falls back to referrer when utm_source is empty", () => {
    expect(classifyAiUtmSource(null, "https://www.perplexity.ai/search?q=instantmed")).toBe(
      "Perplexity",
    )
  })

  it("keeps utm_source authoritative when both fields contain AI signals", () => {
    expect(classifyAiUtmSource("chatgpt.com", "https://www.perplexity.ai/search")).toBe(
      "ChatGPT",
    )
  })

  it("returns null for non-AI, empty, or ambiguous search sources", () => {
    expect(classifyAiUtmSource(null)).toBeNull()
    expect(classifyAiUtmSource("")).toBeNull()
    expect(classifyAiUtmSource("google")).toBeNull()
    // "bing"/"you" are deliberately NOT matched — they over-count search traffic.
    expect(classifyAiUtmSource("bing.com")).toBeNull()
    expect(
      classifyAiUtmSource(null, "https://www.bing.com/search?q=medical+certificate"),
    ).toBeNull()
    expect(classifyAiUtmSource("you.com")).toBeNull()
  })
})

describe("getAiAttributionBreakdown", () => {
  it("returns an empty-but-shaped result on a query error", async () => {
    const out = await getAiAttributionBreakdown(
      stub({ data: null, error: { message: "boom" } }),
      { weeks: 8 },
    )
    expect(out.totalAiOrders).toBe(0)
    expect(out.paidTotal).toBe(0)
    expect(out.bySource).toEqual([])
    expect(out.weekly).toHaveLength(8) // continuous series even on error
  })

  it("counts AI orders by engine, computes the paid denominator, and orders by count desc", async () => {
    const out = await getAiAttributionBreakdown(
      stub({
        data: [
          {
            utm_source: "chatgpt.com",
            referrer: null,
            created_at: recentIso,
            patient_id: "p1",
            exclude_from_reporting: false,
          },
          {
            utm_source: "chatgpt.com",
            referrer: null,
            created_at: recentIso,
            patient_id: "p2",
            exclude_from_reporting: false,
          },
          {
            utm_source: "perplexity.ai",
            referrer: null,
            created_at: recentIso,
            patient_id: "p3",
            exclude_from_reporting: false,
          },
          {
            utm_source: "google",
            referrer: null,
            created_at: recentIso,
            patient_id: "p4",
            exclude_from_reporting: false,
          }, // non-AI
          {
            utm_source: null,
            referrer: null,
            created_at: recentIso,
            patient_id: "p5",
            exclude_from_reporting: false,
          }, // direct
        ],
        error: null,
      }),
      { weeks: 8 },
    )
    expect(out.paidTotal).toBe(5) // all 5 are live paid orders (the AI-share denominator)
    expect(out.totalAiOrders).toBe(3) // chatgpt x2 + perplexity x1
    expect(out.bySource[0]).toEqual({ label: "ChatGPT", count: 2 })
    expect(out.bySource.find((s) => s.label === "Perplexity")?.count).toBe(1)
    // ChatGPT-only weekly trend: the two chatgpt orders land in the latest week.
    expect(out.weekly.at(-1)?.chatgpt).toBe(2)
    expect(out.weekly.reduce((sum, w) => sum + w.chatgpt, 0)).toBe(2)
  })

  it("reads referrer and counts referrer-only AI orders without counting ordinary Bing search", async () => {
    let selectedColumns = ""
    const out = await getAiAttributionBreakdown(
      stub(
        {
          data: [
            {
              utm_source: null,
              referrer: "https://www.perplexity.ai/search?q=instantmed",
              created_at: recentIso,
              patient_id: "p1",
              exclude_from_reporting: false,
            },
            {
              utm_source: null,
              referrer: "https://www.bing.com/search?q=medical+certificate",
              created_at: recentIso,
              patient_id: "p2",
              exclude_from_reporting: false,
            },
          ],
          error: null,
        },
        { onSelect: (columns) => (selectedColumns = columns) },
      ),
      { weeks: 8 },
    )
    expect(selectedColumns).toContain("referrer")
    expect(out.paidTotal).toBe(2)
    expect(out.totalAiOrders).toBe(1)
    expect(out.bySource).toEqual([{ label: "Perplexity", count: 1 }])
  })

  it("excludes seeded E2E and excluded-from-reporting rows from numerator and denominator", async () => {
    const out = await getAiAttributionBreakdown(
      stub({
        data: [
          {
            utm_source: "chatgpt.com",
            referrer: null,
            created_at: recentIso,
            patient_id: "real",
            exclude_from_reporting: false,
          },
          {
            utm_source: "chatgpt.com",
            referrer: null,
            created_at: recentIso,
            patient_id: SEEDED_E2E_PATIENT_PROFILE_ID,
            exclude_from_reporting: false,
          },
          {
            utm_source: "chatgpt.com",
            referrer: null,
            created_at: recentIso,
            patient_id: "real2",
            exclude_from_reporting: true,
          },
        ],
        error: null,
      }),
      { weeks: 8 },
    )
    expect(out.paidTotal).toBe(1) // only the one real, non-excluded row
    expect(out.totalAiOrders).toBe(1)
    expect(out.bySource).toEqual([{ label: "ChatGPT", count: 1 }])
  })
})
