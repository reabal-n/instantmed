/**
 * Consult Subtype Pricing Unit Tests
 * 
 * Verifies that the correct Stripe price ID is used for each consult subtype.
 * This is a critical business invariant - wrong price = billing issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock process.env before importing the module
const originalEnv = process.env

describe('Consult Subtype → Stripe Price ID Mapping', () => {
  beforeEach(() => {
    // Reset modules to pick up new env vars
    vi.resetModules()
    
    // Set up mock price IDs
    process.env = {
      ...originalEnv,
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

  it('maps "general" subtype to STRIPE_PRICE_CONSULT', async () => {
    // Import from price-mapping (no server-only restriction)
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'general',
    })
    
    expect(priceId).toBe('price_consult_general')
  })

  it('maps "new_medication" subtype to STRIPE_PRICE_CONSULT (default)', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'new_medication',
    })
    
    expect(priceId).toBe('price_consult_general')
  })

  it('maps "ed" subtype to STRIPE_PRICE_CONSULT_ED', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'ed',
    })
    
    expect(priceId).toBe('price_consult_ed')
  })

  it('maps "hair_loss" subtype to STRIPE_PRICE_CONSULT_HAIR_LOSS', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'hair_loss',
    })
    
    expect(priceId).toBe('price_consult_hair_loss')
  })

  it('maps "womens_health" subtype to STRIPE_PRICE_CONSULT_WOMENS_HEALTH', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'womens_health',
    })
    
    expect(priceId).toBe('price_consult_womens_health')
  })

  it('maps "weight_loss" subtype to STRIPE_PRICE_CONSULT_WEIGHT_LOSS', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'weight_loss',
    })
    
    expect(priceId).toBe('price_consult_weight_loss')
  })

  it('falls back to consultSubtype from answers when subtype not specific', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'unknown',
      answers: { consultSubtype: 'ed' },
    })
    
    expect(priceId).toBe('price_consult_ed')
  })

  it('uses default STRIPE_PRICE_CONSULT for unknown subtypes', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'unknown_subtype',
    })
    
    expect(priceId).toBe('price_consult_general')
  })
})

describe('Consult Subtype Price Mapping - Missing Env Vars', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      // Only set the default consult price
      STRIPE_PRICE_CONSULT: 'price_consult_default',
      // Don't set subtype-specific prices
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('falls back to default when subtype-specific env var missing', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    // ED price env var is not set, should fall back to default
    const priceId = getPriceIdForRequest({
      category: 'consult',
      subtype: 'ed',
    })
    
    expect(priceId).toBe('price_consult_default')
  })
})

describe('Non-Consult Categories Unchanged', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      STRIPE_PRICE_MEDCERT: 'price_medcert',
      STRIPE_PRICE_MEDCERT_2DAY: 'price_medcert_2day',
      STRIPE_PRICE_PRESCRIPTION: 'price_prescription',
      STRIPE_PRICE_CONSULT: 'price_consult',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('medical_certificate still uses STRIPE_PRICE_MEDCERT', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'medical_certificate',
      subtype: 'work',
    })
    
    expect(priceId).toBe('price_medcert')
  })

  it('prescription still uses STRIPE_PRICE_PRESCRIPTION', async () => {
    const { getPriceIdForRequest } = await import('@/lib/stripe/price-mapping')
    
    const priceId = getPriceIdForRequest({
      category: 'prescription',
      subtype: 'repeat',
    })
    
    expect(priceId).toBe('price_prescription')
  })
})
