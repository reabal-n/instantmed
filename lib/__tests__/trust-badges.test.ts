import { describe, it, expect } from 'vitest'
import { BADGE_REGISTRY, BADGE_PRESETS, resolveEntry, type BadgeId } from '@/lib/marketing/trust-badges'

const HERO_BADGE_MAX = 4 // hero CTA area layout constraint - more than 4 pills looks cluttered

describe('BADGE_REGISTRY', () => {
  it('contains all expected badge IDs', () => {
    const expected: BadgeId[] = [
      'ahpra','tga','racgp','medical_director','refund','privacy',
      'stripe','ssl','pci','au_data',
      'no_call','no_speaking','form_only','no_waiting_room','no_appointment',
      'from_your_phone','no_face_to_face','fast_form','same_day',
      'legally_valid','no_medicare','real_gp','instant_pdf',
      'social_proof','legitscript','google_pharmacy',
    ]
    expect(Object.keys(BADGE_REGISTRY)).toEqual(expect.arrayContaining(expected))
    expect(Object.keys(BADGE_REGISTRY)).toHaveLength(expected.length)
  })

  it('every badge has required fields', () => {
    for (const [id, config] of Object.entries(BADGE_REGISTRY)) {
      expect(config.id).toBe(id)
      expect(typeof config.label).toBe('string')
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.icon).toBeDefined()
      expect(typeof config.tooltip).toBe('string')
    }
  })

  it('hasStyledTier is true only for badges with known styled implementations', () => {
    const styledIds: BadgeId[] = [
      'ahpra','refund','stripe','au_data',
      'no_call','no_speaking','form_only','no_waiting_room','no_appointment',
      'from_your_phone','same_day',
      'legally_valid','no_medicare','real_gp','instant_pdf',
      'social_proof',
    ]
    for (const id of styledIds) {
      expect(BADGE_REGISTRY[id].hasStyledTier).toBe(true)
      expect(BADGE_REGISTRY[id].pillClass).not.toBeNull()
      expect(typeof BADGE_REGISTRY[id].pillClass).toBe('string')
    }
    const plainOnly: BadgeId[] = ['tga','racgp','medical_director','privacy','ssl','pci','no_face_to_face','fast_form']
    for (const id of plainOnly) {
      expect(BADGE_REGISTRY[id].hasStyledTier).toBe(false)
      expect(BADGE_REGISTRY[id].pillClass).toBeNull()
    }
  })
})

describe('BADGE_PRESETS', () => {
  it('all preset entries reference valid badge IDs', () => {
    const validIds = new Set(Object.keys(BADGE_REGISTRY))
    for (const [_presetName, entries] of Object.entries(BADGE_PRESETS)) {
      for (const entry of entries) {
        const id = typeof entry === 'string' ? entry : entry.id
        expect([...validIds]).toContain(id)
      }
    }
  })

  it('hero presets have no more than 4 badges', () => {
    expect(BADGE_PRESETS.hero_medcert.length).toBeLessThanOrEqual(HERO_BADGE_MAX)
    expect(BADGE_PRESETS.hero_rx.length).toBeLessThanOrEqual(HERO_BADGE_MAX)
    expect(BADGE_PRESETS.hero_consult.length).toBeLessThanOrEqual(HERO_BADGE_MAX)
    expect(BADGE_PRESETS.hero_generic.length).toBeLessThanOrEqual(HERO_BADGE_MAX)
  })

  it('no preset has both no_call and no_speaking', () => {
    for (const [name, entries] of Object.entries(BADGE_PRESETS)) {
      const ids = entries.map((e: string | { id: string }) => typeof e === 'string' ? e : e.id)
      const hasBoth = ids.includes('no_call') && ids.includes('no_speaking')
      expect(hasBoth, `preset "${name}" contains both no_call and no_speaking`).toBe(false)
    }
  })

  it('required presets exist', () => {
    const required = ['hero_medcert','hero_rx','hero_consult','hero_generic',
      'doctor_credibility','pre_cta','medcert_pricing','medcert_outcome',
      'checkout','footer','float']
    for (const name of required) {
      expect(BADGE_PRESETS[name]).toBeDefined()
      expect(Array.isArray(BADGE_PRESETS[name])).toBe(true)
    }
  })

  it('at least one preset uses a styled object entry', () => {
    const allEntries = Object.values(BADGE_PRESETS).flat()
    const hasStyledEntry = allEntries.some(
      (e) => typeof e === 'object' && e.variant === 'styled'
    )
    expect(hasStyledEntry).toBe(true)
  })
})

describe('resolveEntry', () => {
  it('resolves string entries to plain variant', () => {
    const result = resolveEntry('ahpra')
    expect(result).toEqual({ id: 'ahpra', variant: 'plain' })
  })

  it('resolves object entries preserving variant', () => {
    const result = resolveEntry({ id: 'no_call', variant: 'styled' })
    expect(result).toEqual({ id: 'no_call', variant: 'styled' })
  })
})
