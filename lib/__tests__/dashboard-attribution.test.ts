import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type IntakeRow = {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_term?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  campaignid?: string | null
  adgroupid?: string | null
  keyword?: string | null
  creative?: string | null
  matchtype?: string | null
  device?: string | null
  network?: string | null
  referrer?: string | null
  landing_page?: string | null
}

interface QueryResult {
  data: IntakeRow[] | null
  error: { message: string } | null
}

function createSupabaseMock(result: QueryResult) {
  // Thenable terminal that mimics the awaited Supabase query builder
  // result. The data layer chains .not(...) at the end (via
  // filterSeededE2EIntakes) so the terminal node must be awaitable.
  // Typed as `any` because the real Supabase builder is recursively
  // self-referential and we only need a duck-typed stand-in here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const terminal: any = {}
  terminal.not = vi.fn(() => terminal)
  terminal.then = Promise.resolve(result).then.bind(Promise.resolve(result))

  const not = vi.fn(() => terminal)
  const gte = vi.fn(() => ({ not }))
  const select = vi.fn(() => ({ gte }))
  const from = vi.fn(() => ({ select }))

  return { from, select, gte, not, terminal }
}

describe("getAttributionSourceBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an empty breakdown when no paid intakes exist", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getAttributionSourceBreakdown } = await import("@/lib/data/dashboard-attribution")
    const result = await getAttributionSourceBreakdown()

    expect(result.totalIntakes).toBe(0)
    expect(result.topSources).toEqual([])
    expect(result.windowDays).toBe(30)
  })

  it("returns an empty breakdown on Supabase error", async () => {
    const supabase = createSupabaseMock({
      data: null,
      error: { message: "boom" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getAttributionSourceBreakdown } = await import("@/lib/data/dashboard-attribution")
    const result = await getAttributionSourceBreakdown()

    expect(result.totalIntakes).toBe(0)
    expect(result.topSources).toEqual([])
  })

  it("classifies and sorts a mix of sources descending by count", async () => {
    const rows: IntakeRow[] = [
      // 3 Google Ads (have click IDs / value-track)
      { gclid: "abc" },
      { gclid: "def" },
      { campaignid: "12345" },
      // 2 Organic non-brand (search host referrer + prescription path)
      { referrer: "https://www.google.com/search", landing_page: "/prescriptions" },
      { referrer: "https://www.google.com/", landing_page: "/medical-certificate" },
      // 1 AI referral (utm_source includes "chatgpt")
      { utm_source: "chatgpt", referrer: "https://chat.openai.com/" },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getAttributionSourceBreakdown } = await import("@/lib/data/dashboard-attribution")
    const result = await getAttributionSourceBreakdown()

    expect(result.totalIntakes).toBe(6)
    expect(result.topSources.length).toBeGreaterThan(0)
    // First entry should be the highest count (google_ads with 3)
    expect(result.topSources[0]?.group).toBe("google_ads")
    expect(result.topSources[0]?.count).toBe(3)
    // Sorted descending
    for (let i = 1; i < result.topSources.length; i++) {
      expect(result.topSources[i - 1]!.count).toBeGreaterThanOrEqual(
        result.topSources[i]!.count,
      )
    }
    // Shares sum to 1 (within rounding tolerance)
    const sumShare = result.topSources.reduce((acc, r) => acc + r.share, 0)
    expect(sumShare).toBeGreaterThan(0.99)
    expect(sumShare).toBeLessThanOrEqual(1.0001)
  })

  it("caps the top-N list at 5 entries", async () => {
    // Build 7 distinct groups using a variety of canonical inputs.
    const rows: IntakeRow[] = [
      { gclid: "a" },                       // google_ads
      { utm_source: "facebook", utm_medium: "cpc" }, // other_paid
      { referrer: "https://www.google.com/", utm_source: "google", utm_medium: "organic" }, // organic_brand
      { referrer: "https://www.bing.com/", landing_page: "/medical-certificate" }, // organic_nonbrand
      { utm_source: "chatgpt" },            // ai_referral
      { utm_source: "recovery_email", utm_medium: "email" }, // recovery_email
      { referrer: "https://partner.example/", utm_medium: "referral" },          // referral
      { landing_page: "/" },                // direct
      {},                                   // unknown
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getAttributionSourceBreakdown } = await import("@/lib/data/dashboard-attribution")
    const result = await getAttributionSourceBreakdown()

    expect(result.totalIntakes).toBe(rows.length)
    expect(result.topSources.length).toBe(5)
  })

  it("queries the intakes table with the right filters", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getAttributionSourceBreakdown } = await import("@/lib/data/dashboard-attribution")
    await getAttributionSourceBreakdown()

    expect(supabase.from).toHaveBeenCalledWith("intakes")
    expect(supabase.select).toHaveBeenCalled()
    // Window filter
    expect(supabase.gte).toHaveBeenCalledWith("paid_at", expect.any(String))
    // Null-paid exclusion: the data layer calls .not("paid_at", "is", null)
    // and filterSeededE2EIntakes may also call .not(...) on the terminal.
    expect(supabase.not).toHaveBeenCalledWith("paid_at", "is", null)
  })
})
