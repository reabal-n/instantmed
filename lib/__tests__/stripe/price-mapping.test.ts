/**
 * Stripe Price Mapping - Comprehensive Unit Tests
 *
 * Tests all exported functions from lib/stripe/price-mapping.ts:
 *   getAbsenceDays, getConsultPriceId, getPriceIdForRequest,
 *   getConsultSubtypePrice, getDisplayPriceForCategory, getBasePriceCents
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

// ---------------------------------------------------------------------------
// Env setup / teardown
// ---------------------------------------------------------------------------

const MOCK_ENV = {
  STRIPE_PRICE_MEDCERT: "price_medcert_1day",
  STRIPE_PRICE_MEDCERT_2DAY: "price_medcert_2day",
  STRIPE_PRICE_MEDCERT_3DAY: "price_medcert_3day",
  STRIPE_PRICE_REPEAT_SCRIPT: "price_repeat_script",
  STRIPE_PRICE_CONSULT: "price_consult_general",
  STRIPE_PRICE_CONSULT_ED: "price_consult_ed",
  STRIPE_PRICE_CONSULT_HAIR_LOSS: "price_consult_hair_loss",
  STRIPE_PRICE_CONSULT_WOMENS_HEALTH: "price_consult_womens_health",
  STRIPE_PRICE_CONSULT_WEIGHT_LOSS: "price_consult_weight_loss",
} as const

const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = { ...originalEnv, ...MOCK_ENV }
})

afterEach(() => {
  process.env = originalEnv
  vi.unstubAllEnvs()
  vi.resetModules()
})

// Helper - dynamic import so each test picks up fresh env
async function importModule() {
  return import("@/lib/stripe/price-mapping")
}

// ===========================================================================
// getAbsenceDays
// ===========================================================================

describe("getAbsenceDays", () => {
  // -- defaults --
  it("returns 1 when answers is undefined", async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays(undefined)).toBe(1)
  })

  it("returns 1 when answers is empty object", async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({})).toBe(1)
  })

  // -- unified duration flow --
  it('returns 1 for duration "1"', async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ duration: "1" })).toBe(1)
  })

  it('returns 2 for duration "2"', async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ duration: "2" })).toBe(2)
  })

  it('returns 3 for duration "3"', async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ duration: "3" })).toBe(3)
  })

  it("duration takes precedence over legacy absence_dates", async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ duration: "2", absence_dates: "today" })).toBe(2)
  })

  it("falls through to legacy flow for unexpected duration value", async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ duration: "5", absence_dates: "today" })).toBe(1)
  })

  // -- legacy absence_dates flow --
  it('returns 1 for absence_dates "today"', async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ absence_dates: "today" })).toBe(1)
  })

  it('returns 1 for absence_dates "yesterday"', async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ absence_dates: "yesterday" })).toBe(1)
  })

  it("calculates 2 days for multi_day with consecutive dates", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({
        absence_dates: "multi_day",
        start_date: "2024-01-15",
        end_date: "2024-01-16",
      }),
    ).toBe(2)
  })

  it("calculates 3 days for multi_day spanning 3 days", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({
        absence_dates: "multi_day",
        start_date: "2024-01-15",
        end_date: "2024-01-17",
      }),
    ).toBe(3)
  })

  it("returns 1 for multi_day with same start and end date", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({
        absence_dates: "multi_day",
        start_date: "2024-03-10",
        end_date: "2024-03-10",
      }),
    ).toBe(1)
  })

  it("returns 1 for multi_day without dates", async () => {
    const { getAbsenceDays } = await importModule()
    expect(getAbsenceDays({ absence_dates: "multi_day" })).toBe(1)
  })

  it("returns 1 for multi_day with only start_date", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({ absence_dates: "multi_day", start_date: "2024-01-15" }),
    ).toBe(1)
  })

  it("returns 1 for multi_day with only end_date", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({ absence_dates: "multi_day", end_date: "2024-06-10" }),
    ).toBe(1)
  })

  it("handles reversed dates (end before start) via Math.abs", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({
        absence_dates: "multi_day",
        start_date: "2024-01-17",
        end_date: "2024-01-15",
      }),
    ).toBe(3)
  })

  it("handles month boundary crossing", async () => {
    const { getAbsenceDays } = await importModule()
    expect(
      getAbsenceDays({
        absence_dates: "multi_day",
        start_date: "2024-01-31",
        end_date: "2024-02-02",
      }),
    ).toBe(3)
  })
})

// ===========================================================================
// getConsultPriceId
// ===========================================================================

describe("getConsultPriceId", () => {
  // -- happy path: all subtypes with env vars set --
  it.each([
    ["ed", "price_consult_ed"],
    ["hair_loss", "price_consult_hair_loss"],
    ["womens_health", "price_consult_womens_health"],
    ["weight_loss", "price_consult_weight_loss"],
  ] as const)('returns correct price for "%s" subtype', async (subtype, expected) => {
    const { getConsultPriceId } = await importModule()
    expect(getConsultPriceId(subtype)).toBe(expected)
  })

  it('returns default consult price for "general" subtype', async () => {
    const { getConsultPriceId } = await importModule()
    expect(getConsultPriceId("general")).toBe("price_consult_general")
  })

  it("falls back to default for unknown subtype", async () => {
    const { getConsultPriceId } = await importModule()
    expect(getConsultPriceId("some_future_type")).toBe("price_consult_general")
  })

  it("uses consultSubtype from answers when primary subtype has no match", async () => {
    const { getConsultPriceId } = await importModule()
    expect(
      getConsultPriceId("unknown", { consultSubtype: "weight_loss" }),
    ).toBe("price_consult_weight_loss")
  })

  it("prefers direct subtype over answers.consultSubtype", async () => {
    const { getConsultPriceId } = await importModule()
    // "ed" has a direct match, so answers.consultSubtype should be ignored
    expect(
      getConsultPriceId("ed", { consultSubtype: "weight_loss" }),
    ).toBe("price_consult_ed")
  })

  it("throws when STRIPE_PRICE_CONSULT is missing and no subtype match", async () => {
    delete process.env.STRIPE_PRICE_CONSULT
    const { getConsultPriceId } = await importModule()
    expect(() => getConsultPriceId("general")).toThrow(
      "Missing STRIPE_PRICE_CONSULT environment variable",
    )
  })

  // -- production hard-fail for known subtypes missing env --
  describe("production hard-fail on missing subtype env var", () => {
    it("throws in production when known subtype env var is missing", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("STRIPE_PRICE_CONSULT_ED", "")
      vi.stubEnv("STRIPE_PRICE_CONSULT", "price_fallback")

      const { getConsultPriceId } = await importModule()
      expect(() => getConsultPriceId("ed")).toThrow(
        /STRIPE_PRICE_CONSULT_ED/,
      )
    })

    it("throws in production for each known subtype without env var", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("STRIPE_PRICE_CONSULT", "price_fallback")

      for (const sub of ["ed", "hair_loss", "womens_health", "weight_loss"]) {
        vi.stubEnv(`STRIPE_PRICE_CONSULT_${sub.toUpperCase()}`, "")
        const { getConsultPriceId } = await importModule()
        expect(() => getConsultPriceId(sub)).toThrow(
          new RegExp(`STRIPE_PRICE_CONSULT_${sub.toUpperCase()}`),
        )
        vi.resetModules()
      }
    })

    it("falls back to default in development (warns, does not throw)", async () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("STRIPE_PRICE_CONSULT_ED", "")
      vi.stubEnv("STRIPE_PRICE_CONSULT", "price_fallback")

      const { getConsultPriceId } = await importModule()
      expect(getConsultPriceId("ed")).toBe("price_fallback")
    })

    it("falls back to default in test env", async () => {
      vi.stubEnv("NODE_ENV", "test")
      vi.stubEnv("STRIPE_PRICE_CONSULT_ED", "")
      vi.stubEnv("STRIPE_PRICE_CONSULT", "price_fallback")

      const { getConsultPriceId } = await importModule()
      expect(getConsultPriceId("ed")).toBe("price_fallback")
    })

    it("does not throw in production for 'general' (no dedicated env var)", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("STRIPE_PRICE_CONSULT", "price_fallback")

      const { getConsultPriceId } = await importModule()
      expect(getConsultPriceId("general")).toBe("price_fallback")
    })
  })
})

// ===========================================================================
// getPriceIdForRequest
// ===========================================================================

describe("getPriceIdForRequest", () => {
  // -- medical_certificate tiers --
  it("returns 1-day med cert price for duration=1", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "work",
        answers: { duration: "1" },
      }),
    ).toBe("price_medcert_1day")
  })

  it("returns 1-day med cert price when no answers", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({ category: "medical_certificate", subtype: "work" }),
    ).toBe("price_medcert_1day")
  })

  it("returns 2-day med cert price for duration=2", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "study",
        answers: { duration: "2" },
      }),
    ).toBe("price_medcert_2day")
  })

  it("returns 3-day med cert price for duration=3", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "work",
        answers: { duration: "3" },
      }),
    ).toBe("price_medcert_3day")
  })

  it("returns 3-day med cert price for multi_day spanning 3 days", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "study",
        answers: {
          absence_dates: "multi_day",
          start_date: "2024-03-01",
          end_date: "2024-03-03",
        },
      }),
    ).toBe("price_medcert_3day")
  })

  // -- prescription --
  it("returns repeat script price for prescription", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({ category: "prescription", subtype: "repeat" }),
    ).toBe("price_repeat_script")
  })

  // -- consult delegates to getConsultPriceId --
  it("delegates consult to getConsultPriceId", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({ category: "consult", subtype: "ed" }),
    ).toBe("price_consult_ed")
  })

  it("delegates consult with answers fallback", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(
      getPriceIdForRequest({
        category: "consult",
        subtype: "unknown",
        answers: { consultSubtype: "hair_loss" },
      }),
    ).toBe("price_consult_hair_loss")
  })

  // -- error paths --
  it("throws for unknown category", async () => {
    const { getPriceIdForRequest } = await importModule()
    expect(() =>
      getPriceIdForRequest({ category: "unknown" as never, subtype: "" }),
    ).toThrow("Unknown category: unknown")
  })

  it("throws when STRIPE_PRICE_MEDCERT is missing", async () => {
    delete process.env.STRIPE_PRICE_MEDCERT
    const { getPriceIdForRequest } = await importModule()
    expect(() =>
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "work",
        answers: { duration: "1" },
      }),
    ).toThrow("Missing STRIPE_PRICE_MEDCERT environment variable")
  })

  it("throws when STRIPE_PRICE_MEDCERT_2DAY is missing for 2-day cert", async () => {
    delete process.env.STRIPE_PRICE_MEDCERT_2DAY
    const { getPriceIdForRequest } = await importModule()
    expect(() =>
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "work",
        answers: { duration: "2" },
      }),
    ).toThrow("Missing STRIPE_PRICE_MEDCERT_2DAY environment variable")
  })

  it("throws when STRIPE_PRICE_MEDCERT_3DAY is missing for 3-day cert", async () => {
    delete process.env.STRIPE_PRICE_MEDCERT_3DAY
    const { getPriceIdForRequest } = await importModule()
    expect(() =>
      getPriceIdForRequest({
        category: "medical_certificate",
        subtype: "work",
        answers: { duration: "3" },
      }),
    ).toThrow("Missing STRIPE_PRICE_MEDCERT_3DAY environment variable")
  })

  it("throws when STRIPE_PRICE_REPEAT_SCRIPT is missing", async () => {
    delete process.env.STRIPE_PRICE_REPEAT_SCRIPT
    const { getPriceIdForRequest } = await importModule()
    expect(() =>
      getPriceIdForRequest({ category: "prescription", subtype: "repeat" }),
    ).toThrow("Missing STRIPE_PRICE_REPEAT_SCRIPT environment variable")
  })
})

// ===========================================================================
// getConsultSubtypePrice
// ===========================================================================

describe("getConsultSubtypePrice", () => {
  it("returns PRICING.CONSULT when no subtype", async () => {
    const { getConsultSubtypePrice } = await importModule()
    expect(getConsultSubtypePrice()).toBe(PRICING.CONSULT)
  })

  it("returns PRICING.CONSULT for undefined subtype", async () => {
    const { getConsultSubtypePrice } = await importModule()
    expect(getConsultSubtypePrice(undefined)).toBe(PRICING.CONSULT)
  })

  it.each([
    ["ed", PRICING.MENS_HEALTH],
    ["hair_loss", PRICING.HAIR_LOSS],
    ["womens_health", PRICING.WOMENS_HEALTH],
    ["weight_loss", PRICING.WEIGHT_LOSS],
    ["general", PRICING.CONSULT],
  ] as const)('returns correct default for "%s"', async (subtype, expected) => {
    const { getConsultSubtypePrice } = await importModule()
    expect(getConsultSubtypePrice(subtype)).toBe(expected)
  })

  it("uses env var override when set", async () => {
    process.env.NEXT_PUBLIC_PRICE_CONSULT_ED = "44.95"
    const { getConsultSubtypePrice } = await importModule()
    expect(getConsultSubtypePrice("ed")).toBe(44.95)
  })

  it("uses NEXT_PUBLIC_PRICE_CONSULT fallback for unknown subtype", async () => {
    process.env.NEXT_PUBLIC_PRICE_CONSULT = "55.00"
    const { getConsultSubtypePrice } = await importModule()
    expect(getConsultSubtypePrice("some_new_type")).toBe(55.0)
  })

  it("returns PRICING.CONSULT for unknown subtype without env fallback", async () => {
    const { getConsultSubtypePrice } = await importModule()
    expect(getConsultSubtypePrice("nonexistent")).toBe(PRICING.CONSULT)
  })
})

// ===========================================================================
// getDisplayPriceForCategory
// ===========================================================================

describe("getDisplayPriceForCategory", () => {
  it("returns 1-day med cert display price by default", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(getDisplayPriceForCategory("medical_certificate")).toBe(
      PRICING_DISPLAY.MED_CERT,
    )
  })

  it("returns 1-day med cert display price for absenceDays=1", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(
      getDisplayPriceForCategory("medical_certificate", { absenceDays: 1 }),
    ).toBe(PRICING_DISPLAY.MED_CERT)
  })

  it("returns 2-day med cert display price", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(
      getDisplayPriceForCategory("medical_certificate", { absenceDays: 2 }),
    ).toBe(PRICING_DISPLAY.MED_CERT_2DAY)
  })

  it("returns 3-day med cert display price", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(
      getDisplayPriceForCategory("medical_certificate", { absenceDays: 3 }),
    ).toBe(PRICING_DISPLAY.MED_CERT_3DAY)
  })

  it("returns prescription display price", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(getDisplayPriceForCategory("prescription")).toBe(
      PRICING_DISPLAY.REPEAT_SCRIPT,
    )
  })

  it("returns formatted consult price without subtype", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(getDisplayPriceForCategory("consult")).toBe(
      `$${PRICING.CONSULT.toFixed(2)}`,
    )
  })

  it("returns formatted consult price with ed subtype", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(
      getDisplayPriceForCategory("consult", { consultSubtype: "ed" }),
    ).toBe(`$${PRICING.MENS_HEALTH.toFixed(2)}`)
  })

  it("returns formatted consult price with weight_loss subtype", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(
      getDisplayPriceForCategory("consult", { consultSubtype: "weight_loss" }),
    ).toBe(`$${PRICING.WEIGHT_LOSS.toFixed(2)}`)
  })

  it("returns med cert display price for unknown category (default case)", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(getDisplayPriceForCategory("anything" as never)).toBe(
      PRICING_DISPLAY.MED_CERT,
    )
  })

  it("handles undefined options", async () => {
    const { getDisplayPriceForCategory } = await importModule()
    expect(
      getDisplayPriceForCategory("medical_certificate", undefined),
    ).toBe(PRICING_DISPLAY.MED_CERT)
  })
})

// ===========================================================================
// getBasePriceCents
// ===========================================================================

describe("getBasePriceCents", () => {
  it("returns 1-day med cert in cents (1995)", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("medical_certificate")).toBe(1995)
  })

  it("returns 1-day med cert in cents for absenceDays=1", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("medical_certificate", 1)).toBe(1995)
  })

  it("returns 2-day med cert in cents (2995)", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("medical_certificate", 2)).toBe(2995)
  })

  it("returns 3-day med cert in cents (3995)", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("medical_certificate", 3)).toBe(3995)
  })

  it("returns prescription in cents (2995)", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("prescription")).toBe(2995)
  })

  it("returns consult in cents (4995)", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("consult")).toBe(4995)
  })

  it("matches PRICING constants exactly (no floating point drift)", async () => {
    const { getBasePriceCents } = await importModule()
    expect(getBasePriceCents("medical_certificate")).toBe(
      Math.round(PRICING.MED_CERT * 100),
    )
    expect(getBasePriceCents("medical_certificate", 2)).toBe(
      Math.round(PRICING.MED_CERT_2DAY * 100),
    )
    expect(getBasePriceCents("medical_certificate", 3)).toBe(
      Math.round(PRICING.MED_CERT_3DAY * 100),
    )
    expect(getBasePriceCents("prescription")).toBe(
      Math.round(PRICING.REPEAT_SCRIPT * 100),
    )
    expect(getBasePriceCents("consult")).toBe(
      Math.round(PRICING.CONSULT * 100),
    )
  })
})

// ===========================================================================
// getAmountCentsForRequest
// ===========================================================================

describe("getAmountCentsForRequest", () => {
  it("stores tiered med cert amount from request answers", async () => {
    const { getAmountCentsForRequest } = await importModule()
    expect(getAmountCentsForRequest({
      category: "medical_certificate",
      subtype: "work",
      answers: { duration: "3" },
    })).toBe(3995)
  })

  it("stores repeat prescription amount independently of services.price_cents", async () => {
    const { getAmountCentsForRequest } = await importModule()
    expect(getAmountCentsForRequest({
      category: "prescription",
      subtype: "repeat",
      answers: {},
    })).toBe(2995)
  })

  it("stores consult subtype amount from the consult subtype", async () => {
    const { getAmountCentsForRequest } = await importModule()
    expect(getAmountCentsForRequest({
      category: "consult",
      subtype: "weight_loss",
      answers: {},
    })).toBe(8995)
  })

  it("stores consult subtype amount from answers when checkout subtype is generic", async () => {
    const { getAmountCentsForRequest } = await importModule()
    expect(getAmountCentsForRequest({
      category: "consult",
      subtype: "general",
      answers: { consultSubtype: "weight_loss" },
    })).toBe(8995)
  })
})
