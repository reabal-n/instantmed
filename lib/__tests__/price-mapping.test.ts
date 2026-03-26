/**
 * Price Mapping — Comprehensive Unit Tests
 *
 * Tests the exported functions from lib/stripe/price-mapping.ts:
 *   getAbsenceDays, getConsultPriceId, getPriceIdForRequest,
 *   getConsultSubtypePrice, getDisplayPriceForCategory, getBasePriceCents
 *
 * Existing coverage (NOT duplicated here):
 *   - consult-subtype-pricing.test.ts: getPriceIdForRequest for consult subtypes, fallback, missing subtype env vars
 *   - tiered-pricing.test.ts: getAbsenceDays legacy flow (local helper copy), PRICING constant values
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PRICING, PRICING_DISPLAY } from '@/lib/constants'

const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = {
    ...originalEnv,
    STRIPE_PRICE_MEDCERT: 'price_medcert',
    STRIPE_PRICE_MEDCERT_2DAY: 'price_medcert_2day',
    STRIPE_PRICE_MEDCERT_3DAY: 'price_medcert_3day',
    STRIPE_PRICE_PRESCRIPTION: 'price_prescription',
    STRIPE_PRICE_REPEAT_SCRIPT: 'price_repeat_script',
    STRIPE_PRICE_CONSULT: 'price_consult_general',
    STRIPE_PRICE_CONSULT_ED: 'price_consult_ed',
    STRIPE_PRICE_CONSULT_HAIR_LOSS: 'price_consult_hair_loss',
    STRIPE_PRICE_CONSULT_WOMENS_HEALTH: 'price_consult_womens_health',
    STRIPE_PRICE_CONSULT_WEIGHT_LOSS: 'price_consult_weight_loss',
  }
})

afterEach(() => {
  process.env = originalEnv
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// getAbsenceDays — unified "duration" flow (not covered by tiered-pricing.test.ts)
// ---------------------------------------------------------------------------
describe('getAbsenceDays — unified duration flow', () => {
  it('returns 1 for duration "1"', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    expect(getAbsenceDays({ duration: '1' })).toBe(1)
  })

  it('returns 2 for duration "2"', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    expect(getAbsenceDays({ duration: '2' })).toBe(2)
  })

  it('returns 3 for duration "3"', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    expect(getAbsenceDays({ duration: '3' })).toBe(3)
  })

  it('duration takes precedence over legacy absence_dates', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    // If both duration and absence_dates are present, duration wins (checked first)
    expect(getAbsenceDays({ duration: '2', absence_dates: 'today' })).toBe(2)
  })

  it('falls through to legacy flow when duration is not "1"/"2"/"3"', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    // duration is some unexpected value, absence_dates = 'today' => 1
    expect(getAbsenceDays({ duration: '5', absence_dates: 'today' })).toBe(1)
  })

  it('returns 1 for undefined answers', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    expect(getAbsenceDays(undefined)).toBe(1)
  })

  it('returns 1 for empty answers object', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    expect(getAbsenceDays({})).toBe(1)
  })

  it('handles multi_day with only end_date (missing start_date)', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    expect(getAbsenceDays({ absence_dates: 'multi_day', end_date: '2024-06-10' })).toBe(1)
  })

  it('handles multi_day with reversed dates (end before start)', async () => {
    const { getAbsenceDays } = await import('@/lib/stripe/price-mapping')
    // Math.abs ensures order doesn't matter
    expect(getAbsenceDays({
      absence_dates: 'multi_day',
      start_date: '2024-01-17',
      end_date: '2024-01-15',
    })).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// getConsultPriceId — direct function tests
// ---------------------------------------------------------------------------
describe('getConsultPriceId', () => {
  it('returns ed price ID for "ed" subtype', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('ed')).toBe('price_consult_ed')
  })

  it('returns hair_loss price ID for "hair_loss" subtype', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('hair_loss')).toBe('price_consult_hair_loss')
  })

  it('returns womens_health price ID for "womens_health" subtype', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('womens_health')).toBe('price_consult_womens_health')
  })

  it('returns weight_loss price ID for "weight_loss" subtype', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('weight_loss')).toBe('price_consult_weight_loss')
  })

  it('returns default consult price for "general" subtype', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('general')).toBe('price_consult_general')
  })

  it('uses consultSubtype from answers when subtype has no specific price', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('something', { consultSubtype: 'weight_loss' })).toBe('price_consult_weight_loss')
  })

  it('falls back to default for unknown subtype without answers fallback', async () => {
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(getConsultPriceId('some_future_type')).toBe('price_consult_general')
  })

  it('throws when STRIPE_PRICE_CONSULT is missing and subtype unknown', async () => {
    delete process.env.STRIPE_PRICE_CONSULT
    const { getConsultPriceId } = await import('@/lib/stripe/price-mapping')
    expect(() => getConsultPriceId('general')).toThrow('Missing STRIPE_PRICE_CONSULT environment variable')
  })
})

// ---------------------------------------------------------------------------
// getPriceIdForRequest — missing env var throws & 3-day tier
// ---------------------------------------------------------------------------
describe('getPriceIdForRequest — error paths', () => {
  it('throws for unknown category', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(() =>
      getPriceIdForRequest({ category: 'unknown' as never, subtype: '' })
    ).toThrow('Unknown category: unknown')
  })

  it('throws when STRIPE_PRICE_MEDCERT is missing', async () => {
    delete process.env.STRIPE_PRICE_MEDCERT
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(() =>
      getPriceIdForRequest({ category: 'medical_certificate', subtype: 'work', answers: { duration: '1' } })
    ).toThrow('Missing STRIPE_PRICE_MEDCERT environment variable')
  })

  it('throws when STRIPE_PRICE_MEDCERT_2DAY is missing for 2-day cert', async () => {
    delete process.env.STRIPE_PRICE_MEDCERT_2DAY
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(() =>
      getPriceIdForRequest({ category: 'medical_certificate', subtype: 'work', answers: { duration: '2' } })
    ).toThrow('Missing STRIPE_PRICE_MEDCERT_2DAY environment variable')
  })

  it('throws when STRIPE_PRICE_MEDCERT_3DAY is missing for 3-day cert', async () => {
    delete process.env.STRIPE_PRICE_MEDCERT_3DAY
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(() =>
      getPriceIdForRequest({ category: 'medical_certificate', subtype: 'work', answers: { duration: '3' } })
    ).toThrow('Missing STRIPE_PRICE_MEDCERT_3DAY environment variable')
  })

  it('throws when STRIPE_PRICE_REPEAT_SCRIPT is missing', async () => {
    delete process.env.STRIPE_PRICE_REPEAT_SCRIPT
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(() =>
      getPriceIdForRequest({ category: 'prescription', subtype: 'repeat' })
    ).toThrow('Missing STRIPE_PRICE_REPEAT_SCRIPT environment variable')
  })
})

describe('getPriceIdForRequest — 3-day tier', () => {
  it('returns 3-day price for duration "3"', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(getPriceIdForRequest({
      category: 'medical_certificate',
      subtype: 'work',
      answers: { duration: '3' },
    })).toBe('price_medcert_3day')
  })

  it('returns 3-day price for multi_day spanning 3 days', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    expect(getPriceIdForRequest({
      category: 'medical_certificate',
      subtype: 'study',
      answers: {
        absence_dates: 'multi_day',
        start_date: '2024-03-01',
        end_date: '2024-03-03',
      },
    })).toBe('price_medcert_3day')
  })
})

// ---------------------------------------------------------------------------
// getConsultSubtypePrice — display prices and env overrides
// ---------------------------------------------------------------------------
describe('getConsultSubtypePrice', () => {
  it('returns PRICING.CONSULT when no subtype provided', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice()).toBe(PRICING.CONSULT)
  })

  it('returns PRICING.CONSULT for undefined subtype', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice(undefined)).toBe(PRICING.CONSULT)
  })

  it('returns PRICING.MENS_HEALTH default for "ed" without env override', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    // No NEXT_PUBLIC_PRICE_CONSULT_ED set, should use constant default
    expect(getConsultSubtypePrice('ed')).toBe(PRICING.MENS_HEALTH)
  })

  it('returns PRICING.HAIR_LOSS default for "hair_loss"', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('hair_loss')).toBe(PRICING.HAIR_LOSS)
  })

  it('returns PRICING.WOMENS_HEALTH default for "womens_health"', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('womens_health')).toBe(PRICING.WOMENS_HEALTH)
  })

  it('returns PRICING.WEIGHT_LOSS default for "weight_loss"', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('weight_loss')).toBe(PRICING.WEIGHT_LOSS)
  })

  it('returns PRICING.CONSULT default for "general"', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('general')).toBe(PRICING.CONSULT)
  })

  it('uses env var override when NEXT_PUBLIC_PRICE_CONSULT_ED is set', async () => {
    process.env.NEXT_PUBLIC_PRICE_CONSULT_ED = '44.95'
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('ed')).toBe(44.95)
  })

  it('uses NEXT_PUBLIC_PRICE_CONSULT fallback for unknown subtype', async () => {
    process.env.NEXT_PUBLIC_PRICE_CONSULT = '55.00'
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('some_new_type')).toBe(55.00)
  })

  it('returns PRICING.CONSULT for completely unknown subtype without env fallback', async () => {
    const { getConsultSubtypePrice } = await import('@/lib/stripe/price-mapping')
    expect(getConsultSubtypePrice('nonexistent')).toBe(PRICING.CONSULT)
  })
})

// ---------------------------------------------------------------------------
// getDisplayPriceForCategory
// ---------------------------------------------------------------------------
describe('getDisplayPriceForCategory', () => {
  it('returns 1-day med cert display price by default', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('medical_certificate')).toBe(PRICING_DISPLAY.MED_CERT)
  })

  it('returns 2-day med cert display price', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('medical_certificate', { absenceDays: 2 })).toBe(PRICING_DISPLAY.MED_CERT_2DAY)
  })

  it('returns 3-day med cert display price', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('medical_certificate', { absenceDays: 3 })).toBe(PRICING_DISPLAY.MED_CERT_3DAY)
  })

  it('returns 1-day med cert display price for absenceDays=1', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('medical_certificate', { absenceDays: 1 })).toBe(PRICING_DISPLAY.MED_CERT)
  })

  it('returns prescription display price', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('prescription')).toBe(PRICING_DISPLAY.REPEAT_SCRIPT)
  })

  it('returns general consult display price without subtype', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('consult')).toBe(`$${PRICING.CONSULT.toFixed(2)}`)
  })

  it('returns ed consult display price with subtype', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('consult', { consultSubtype: 'ed' })).toBe(`$${PRICING.MENS_HEALTH.toFixed(2)}`)
  })

  it('returns weight_loss consult display price with subtype', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('consult', { consultSubtype: 'weight_loss' })).toBe(`$${PRICING.WEIGHT_LOSS.toFixed(2)}`)
  })

  it('returns med cert display price for unknown category (default case)', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('anything' as never)).toBe(PRICING_DISPLAY.MED_CERT)
  })

  it('returns med cert display price when options is undefined', async () => {
    const { getDisplayPriceForCategory } = await import('@/lib/stripe/price-mapping')
    expect(getDisplayPriceForCategory('medical_certificate', undefined)).toBe(PRICING_DISPLAY.MED_CERT)
  })
})

// ---------------------------------------------------------------------------
// getBasePriceCents
// ---------------------------------------------------------------------------
describe('getBasePriceCents', () => {
  it('returns 1-day med cert price in cents', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    expect(getBasePriceCents('medical_certificate')).toBe(Math.round(PRICING.MED_CERT * 100))
  })

  it('returns 1-day med cert price in cents for absenceDays=1', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    expect(getBasePriceCents('medical_certificate', 1)).toBe(Math.round(PRICING.MED_CERT * 100))
  })

  it('returns 2-day med cert price in cents', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    expect(getBasePriceCents('medical_certificate', 2)).toBe(Math.round(PRICING.MED_CERT_2DAY * 100))
  })

  it('returns 3-day med cert price in cents', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    expect(getBasePriceCents('medical_certificate', 3)).toBe(Math.round(PRICING.MED_CERT_3DAY * 100))
  })

  it('returns prescription price in cents', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    expect(getBasePriceCents('prescription')).toBe(Math.round(PRICING.REPEAT_SCRIPT * 100))
  })

  it('returns general consult price in cents', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    expect(getBasePriceCents('consult')).toBe(Math.round(PRICING.CONSULT * 100))
  })

  it('returns correct cent values (no floating point errors)', async () => {
    const { getBasePriceCents } = await import('@/lib/stripe/price-mapping')
    // 19.95 * 100 = 1995 exactly (Math.round handles float edge cases)
    expect(getBasePriceCents('medical_certificate')).toBe(1995)
    expect(getBasePriceCents('medical_certificate', 2)).toBe(2995)
    expect(getBasePriceCents('medical_certificate', 3)).toBe(3995)
    expect(getBasePriceCents('prescription')).toBe(2995)
    expect(getBasePriceCents('consult')).toBe(4995)
  })
})
