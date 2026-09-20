import { describe, expect, it, vi } from "vitest"

import {
  CODEINE_REPEAT_WINDOW_DAYS,
  evaluateCodeineRepeatWindow,
  formatRequestAgainDate,
  resolveIssuedSydneyDate,
  sydneyCalendarDateDaysAgo,
} from "@/lib/clinical/codeine-repeat-window"
import { isCodeineCombinationMedication } from "@/lib/clinical/controlled-substances"
import {
  findRecentCodeineScript,
  resolveGuestPatientIdsForRecency,
} from "@/lib/clinical/recent-codeine-script"
import { evaluateCodeineRepeatGate } from "@/lib/stripe/checkout/codeine-repeat-gate"

/**
 * Operator decision 2026-09-19: codeine combination repeats (Panadeine Forte
 * and friends) are prescribed at most once every 7 days. The gate stops a
 * re-request BEFORE payment so the doctor never has to decline-and-refund it.
 */

const PATIENT_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_ID = "22222222-2222-4222-8222-222222222222"

/** Small in-memory Supabase query that applies filters before the terminal call. */
function mockSupabase(tables: Record<string, Array<Record<string, unknown>>>, error: { message: string } | null = null) {
  const from = vi.fn((table: string) => {
    let rows = [...(tables[table] ?? [])]
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        rows = rows.filter((row) => row[column] === value)
        return query
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        rows = rows.filter((row) => values.includes(row[column]))
        return query
      }),
      is: vi.fn((column: string, value: unknown) => {
        rows = rows.filter((row) => row[column] === value)
        return query
      }),
      gte: vi.fn((column: string, value: string) => {
        rows = rows.filter((row) => String(row[column]) >= value)
        return query
      }),
      order: vi.fn(() => query),
      limit: vi.fn(async (count: number) => ({ data: rows.slice(0, count), error })),
    }
    return query
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

describe("isCodeineCombinationMedication", () => {
  it.each([
    "Panadeine Forte",
    "panadeine forte 500/30",
    "Paracetamol + Codeine 500 mg/30 mg",
    "paracetamol/codeine",
    "Codeine 30mg tablets",
    "Nurofen Plus",
    "Mersyndol",
    "Codalgin Forte",
    "Prodeine",
    "Panamax Co",
  ])("flags %s", (text) => {
    expect(isCodeineCombinationMedication(text)).toBe(true)
  })

  it.each(["Sertraline 100 mg", "Atorvastatin", "Panadol Osteo", "Panamax coated", "Nurofen"])("does not flag %s", (text) => {
    expect(isCodeineCombinationMedication(text)).toBe(false)
  })
})

describe("evaluateCodeineRepeatWindow", () => {
  const now = new Date("2026-09-19T03:00:00.000Z") // 13:00 Sydney, 2026-09-19

  it("pins the 7-day window", () => {
    expect(CODEINE_REPEAT_WINDOW_DAYS).toBe(7)
  })

  it("blocks a script issued 2 days ago and names the day it can be requested again", () => {
    const result = evaluateCodeineRepeatWindow({ issuedDates: ["2026-09-17"], now })
    expect(result).toEqual({
      withinWindow: true,
      latestIssuedDate: "2026-09-17",
      daysSince: 2,
      requestAgainOn: "2026-09-24",
    })
  })

  it("blocks on day 6 and allows on day 7", () => {
    expect(evaluateCodeineRepeatWindow({ issuedDates: ["2026-09-13"], now }).withinWindow).toBe(true)
    expect(evaluateCodeineRepeatWindow({ issuedDates: ["2026-09-12"], now }).withinWindow).toBe(false)
  })

  it("uses the most recent script when several exist", () => {
    const result = evaluateCodeineRepeatWindow({ issuedDates: ["2026-08-01", "2026-09-18", "2026-09-10"], now })
    expect(result.latestIssuedDate).toBe("2026-09-18")
    expect(result.daysSince).toBe(1)
    expect(result.withinWindow).toBe(true)
  })

  it("treats a same-day or future-dated script as within the window", () => {
    expect(evaluateCodeineRepeatWindow({ issuedDates: ["2026-09-19"], now }).withinWindow).toBe(true)
    expect(evaluateCodeineRepeatWindow({ issuedDates: ["2026-09-20"], now }).withinWindow).toBe(true)
  })

  it("is not within the window with no scripts", () => {
    expect(evaluateCodeineRepeatWindow({ issuedDates: [], now }).withinWindow).toBe(false)
  })

  it("formats the request-again date for patients", () => {
    expect(formatRequestAgainDate("2026-09-24")).toBe("24 September 2026")
  })
})

describe("sydneyCalendarDateDaysAgo", () => {
  it("counts back in Sydney calendar days, not UTC days", () => {
    // 15:00 UTC on 19 Sep is already 01:00 on 20 Sep in Sydney.
    const now = new Date("2026-09-19T15:00:00.000Z")
    expect(sydneyCalendarDateDaysAgo(now, 0)).toBe("2026-09-20")
    expect(sydneyCalendarDateDaysAgo(now, 2)).toBe("2026-09-18")
    expect(sydneyCalendarDateDaysAgo(now, CODEINE_REPEAT_WINDOW_DAYS)).toBe("2026-09-13")
  })
})

describe("resolveIssuedSydneyDate", () => {
  // Rows written before the Sydney-day sync hold the UTC day of the Parchment
  // issue instant. 13 Sep 08:00 Sydney is 12 Sep 22:00 UTC, so such a script was
  // stored as 2026-09-12, with the webhook sync stamped on the row seconds later.
  it("pins a stored UTC day to the Sydney day of its issue-time sync", () => {
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-12", createdAt: "2026-09-12T22:00:05.000Z" })).toBe("2026-09-13")
  })

  it("keeps a stored day that already is the Sydney day of its sync", () => {
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-13", createdAt: "2026-09-12T22:00:05.000Z" })).toBe("2026-09-13")
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-13", createdAt: "2026-09-13T05:00:00.000Z" })).toBe("2026-09-13")
  })

  it("is DST-correct through Intl (10 Oct 08:00 AEDT is 9 Oct 21:00 UTC)", () => {
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-10-09", createdAt: "2026-10-09T21:00:05.000Z" })).toBe("2026-10-10")
  })

  it("takes the later of the two possible days when the row was written long after issue", () => {
    // A history refresh or retried sync days later cannot say whether "2026-09-12"
    // was the UTC day or the Sydney day; the strict read only delays by a day.
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-12", createdAt: "2026-09-15T02:00:00.000Z" })).toBe("2026-09-13")
  })

  it("never moves a stored day earlier than written", () => {
    // Sync instant just before Sydney midnight, stored day already the next day.
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-14", createdAt: "2026-09-13T13:59:50.000Z" })).toBe("2026-09-14")
  })

  it("uses the stored day as-is without a usable sync instant", () => {
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-12", createdAt: null })).toBe("2026-09-12")
    expect(resolveIssuedSydneyDate({ issuedDate: "2026-09-12", createdAt: "not a date" })).toBe("2026-09-12")
  })

  it("returns null for an unusable stored day", () => {
    expect(resolveIssuedSydneyDate({ issuedDate: "nope", createdAt: "2026-09-12T22:00:05.000Z" })).toBeNull()
    expect(resolveIssuedSydneyDate({ issuedDate: null, createdAt: "2026-09-12T22:00:05.000Z" })).toBeNull()
  })
})

describe("findRecentCodeineScript", () => {
  const now = new Date("2026-09-19T03:00:00.000Z")

  it("reads a pre-fix UTC-day row through its sync instant: 13 Sep 08:00 Sydney blocks on 19 Sep and clears on 20 Sep", async () => {
    const supabase = () => mockSupabase({
      prescriptions: [
        // Stored as the UTC day (12 Sep) by the old sync; the webhook wrote the row seconds after issue.
        { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2026-09-12", created_at: "2026-09-12T22:00:05.000Z" },
      ],
    })
    const lastDay = supabase()
    // 19 Sep 23:00 Sydney
    expect(await findRecentCodeineScript(lastDay, { patientIds: [PATIENT_ID], now: new Date("2026-09-19T13:00:00.000Z") })).toEqual({
      withinWindow: true,
      latestIssuedDate: "2026-09-13",
      daysSince: 6,
      requestAgainOn: "2026-09-20",
    })
    // The lookup must fetch the sync instant it resolves the day with.
    expect(lastDay.from.mock.results[0].value.select).toHaveBeenCalledWith(expect.stringContaining("created_at"))
    // 20 Sep 00:30 Sydney
    expect(await findRecentCodeineScript(supabase(), { patientIds: [PATIENT_ID], now: new Date("2026-09-19T14:30:00.000Z") })).toBeNull()
  })

  it("returns the latest codeine script inside the window for the patient", async () => {
    const supabase = mockSupabase({
      prescriptions: [
        { patient_id: PATIENT_ID, medication_name: "Paracetamol + Codeine 500/30", status: "active", issued_date: "2026-09-17" },
        { patient_id: PATIENT_ID, medication_name: "Sertraline", status: "active", issued_date: "2026-09-18" },
        { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "cancelled", issued_date: "2026-09-18" },
        { patient_id: OTHER_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2026-09-18" },
        { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "completed", issued_date: "2026-09-01" },
      ],
    })
    const result = await findRecentCodeineScript(supabase, { patientIds: [PATIENT_ID], now })
    expect(result).toEqual({
      withinWindow: true,
      latestIssuedDate: "2026-09-17",
      daysSince: 2,
      requestAgainOn: "2026-09-24",
    })
  })

  it("returns null when the only codeine scripts are older than the window", async () => {
    const supabase = mockSupabase({
      prescriptions: [
        { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2026-09-01" },
      ],
    })
    expect(await findRecentCodeineScript(supabase, { patientIds: [PATIENT_ID], now })).toBeNull()
  })

  it("fails soft to null on a database error", async () => {
    const supabase = mockSupabase({ prescriptions: [] }, { message: "boom" })
    expect(await findRecentCodeineScript(supabase, { patientIds: [PATIENT_ID], now })).toBeNull()
  })

  it("does not query with no patient ids", async () => {
    const supabase = mockSupabase({ prescriptions: [] })
    expect(await findRecentCodeineScript(supabase, { patientIds: [], now })).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe("resolveGuestPatientIdsForRecency", () => {
  const profiles = [
    { id: PATIENT_ID, email: "pat@example.com", full_name: "Pat  Example", date_of_birth: "1990-06-20", role: "patient", merged_into_profile_id: null, account_closed_at: null },
    { id: OTHER_ID, email: "other@example.com", full_name: "pat example", date_of_birth: "1990-06-20", role: "patient", merged_into_profile_id: null, account_closed_at: null },
    { id: "33333333-3333-4333-8333-333333333333", email: "merged@example.com", full_name: "Pat Example", date_of_birth: "1990-06-20", role: "patient", merged_into_profile_id: PATIENT_ID, account_closed_at: null },
    { id: "44444444-4444-4444-8444-444444444444", email: "someone@example.com", full_name: "Pat Example", date_of_birth: "1991-01-01", role: "patient", merged_into_profile_id: null, account_closed_at: null },
  ]

  it("matches by normalised email and by name + date of birth, excluding merged profiles", async () => {
    const ids = await resolveGuestPatientIdsForRecency(mockSupabase({ profiles }), {
      email: "  PAT@example.com ",
      fullName: "pat   example",
      dateOfBirth: "1990-06-20",
    })
    expect([...ids].sort()).toEqual([PATIENT_ID, OTHER_ID].sort())
  })

  it("returns an empty list on a database error", async () => {
    const ids = await resolveGuestPatientIdsForRecency(mockSupabase({ profiles }, { message: "boom" }), {
      email: "pat@example.com",
      fullName: "Pat Example",
      dateOfBirth: "1990-06-20",
    })
    expect(ids).toEqual([])
  })
})

describe("evaluateCodeineRepeatGate", () => {
  const now = new Date("2026-09-19T03:00:00.000Z")
  const codeineAnswers = {
    medications: [{ name: "Panadeine Forte", strength: "500/30", form: "tablet", pbsCode: "MANUAL" }],
  }

  it("does not query when the request is not for a codeine combination medicine", async () => {
    const supabase = mockSupabase({ prescriptions: [] })
    const result = await evaluateCodeineRepeatGate({
      supabase,
      answers: { medications: [{ name: "Sertraline", strength: "100 mg", pbsCode: "MANUAL" }] },
      patientIds: [PATIENT_ID],
      now,
    })
    expect(result).toEqual({ blocked: false })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("blocks a codeine repeat inside the window with the dated evidence", async () => {
    const supabase = mockSupabase({
      prescriptions: [{ patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2026-09-16" }],
    })
    const result = await evaluateCodeineRepeatGate({ supabase, answers: codeineAnswers, patientIds: [PATIENT_ID], now })
    expect(result).toEqual({
      blocked: true,
      latestIssuedDate: "2026-09-16",
      daysSince: 3,
      requestAgainOn: "2026-09-23",
    })
  })

  it("allows a codeine repeat once the window has passed", async () => {
    const supabase = mockSupabase({
      prescriptions: [{ patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2026-09-12" }],
    })
    expect(await evaluateCodeineRepeatGate({ supabase, answers: codeineAnswers, patientIds: [PATIENT_ID], now })).toEqual({ blocked: false })
  })

  it("blocks a pre-fix UTC-day row on the last Sydney day of the window and allows it the next Sydney day", async () => {
    // Script issued 13 Sep 08:00 Sydney; the old sync stored the UTC day, 12 Sep.
    const rows = [
      { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2026-09-12", created_at: "2026-09-12T22:00:05.000Z" },
    ]
    const lastDay = await evaluateCodeineRepeatGate({
      supabase: mockSupabase({ prescriptions: rows }),
      answers: codeineAnswers,
      patientIds: [PATIENT_ID],
      now: new Date("2026-09-19T13:00:00.000Z"), // 19 Sep 23:00 Sydney
    })
    expect(lastDay).toEqual({ blocked: true, latestIssuedDate: "2026-09-13", daysSince: 6, requestAgainOn: "2026-09-20" })

    const nextDay = await evaluateCodeineRepeatGate({
      supabase: mockSupabase({ prescriptions: rows }),
      answers: codeineAnswers,
      patientIds: [PATIENT_ID],
      now: new Date("2026-09-19T14:30:00.000Z"), // 20 Sep 00:30 Sydney
    })
    expect(nextDay).toEqual({ blocked: false })
  })
})
