/**
 * Unit tests for service-scoped draft storage
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DRAFT_FLOW_RETIRED_EVENT,
  retireDraftFlow,
} from '../request/draft-retirement'
import {
  canonicalizeServiceType,
  clearDraft,
  type DraftData,
  getAllDrafts,
  getDraft,
  migrateLegacyDraft,
  saveDraft,
} from '../request/draft-storage'

const FLOW_INSTANCE_ID = '55555555-5555-4555-8555-555555555555'
const FRESH_FLOW_INSTANCE_ID = '66666666-6666-4666-8666-666666666666'

// Mock localStorage with proper store management
let mockStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => { mockStore[key] = value },
  removeItem: (key: string) => { delete mockStore[key] },
  clear: () => { mockStore = {} },
}

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('canonicalizeServiceType', () => {
  it('returns null for null/undefined input', () => {
    expect(canonicalizeServiceType(null)).toBeNull()
    expect(canonicalizeServiceType(undefined)).toBeNull()
    expect(canonicalizeServiceType('')).toBeNull()
  })

  it('normalizes med-cert aliases', () => {
    expect(canonicalizeServiceType('med-cert')).toBe('med-cert')
    expect(canonicalizeServiceType('medcert')).toBe('med-cert')
    expect(canonicalizeServiceType('medical-certificate')).toBe('med-cert')
    expect(canonicalizeServiceType('MED-CERT')).toBe('med-cert')
  })

  it('normalizes prescription aliases to single canonical type', () => {
    expect(canonicalizeServiceType('prescription')).toBe('prescription')
    expect(canonicalizeServiceType('repeat-script')).toBe('prescription')
    expect(canonicalizeServiceType('repeat-rx')).toBe('prescription')
    expect(canonicalizeServiceType('repeat-prescription')).toBe('prescription')
    expect(canonicalizeServiceType('PRESCRIPTION')).toBe('prescription')
  })

  it('normalizes consult aliases', () => {
    expect(canonicalizeServiceType('consult')).toBe('consult')
    expect(canonicalizeServiceType('consultation')).toBe('consult')
    expect(canonicalizeServiceType('general-consult')).toBe('consult')
    expect(canonicalizeServiceType('CONSULT')).toBe('consult')
  })

  it('returns null for unknown service types', () => {
    expect(canonicalizeServiceType('unknown')).toBeNull()
    expect(canonicalizeServiceType('invalid-service')).toBeNull()
  })
})

describe('getDraft', () => {
  beforeEach(() => {
    mockStore = {}
  })

  it('returns null when no draft exists', () => {
    expect(getDraft('med-cert')).toBeNull()
  })

  it('returns draft data when valid draft exists', () => {
    const draft: DraftData = {
      serviceType: 'med-cert',
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
      lastSavedAt: new Date().toISOString(),
    }
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify(draft))

    const result = getDraft('med-cert')
    expect(result).not.toBeNull()
    expect(result?.serviceType).toBe('med-cert')
    expect(result?.answers.certType).toBe('work')
  })

  it('returns null for expired drafts and removes them', () => {
    const expiredDate = new Date()
    expiredDate.setHours(expiredDate.getHours() - 25) // 25 hours ago
    
    const draft: DraftData = {
      serviceType: 'med-cert',
      currentStepId: 'symptoms',
      answers: {},
      lastSavedAt: expiredDate.toISOString(),
    }
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify(draft))

    expect(getDraft('med-cert')).toBeNull()
    expect(localStorageMock.getItem('instantmed-draft-med-cert')).toBeNull()
  })

  it('removes a stale-tab draft whose opaque flow was explicitly retired', () => {
    expect(retireDraftFlow('med-cert', FLOW_INSTANCE_ID)).toBe(true)
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify({
      serviceType: 'med-cert',
      flowInstanceId: FLOW_INSTANCE_ID,
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
      lastSavedAt: new Date().toISOString(),
    }))

    expect(getDraft('med-cert')).toBeNull()
    expect(localStorageMock.getItem('instantmed-draft-med-cert')).toBeNull()
  })

  it('isolates drafts by service type', () => {
    const medCertDraft: DraftData = {
      serviceType: 'med-cert',
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
      lastSavedAt: new Date().toISOString(),
    }
    const prescriptionDraft: DraftData = {
      serviceType: 'prescription',
      currentStepId: 'medication',
      answers: { medicationName: 'Test Med' },
      lastSavedAt: new Date().toISOString(),
    }
    
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify(medCertDraft))
    localStorageMock.setItem('instantmed-draft-prescription', JSON.stringify(prescriptionDraft))

    const medCert = getDraft('med-cert')
    const prescription = getDraft('prescription')
    
    expect(medCert?.answers.certType).toBe('work')
    expect(prescription?.answers.medicationName).toBe('Test Med')
  })
})

describe('draft retirement notification', () => {
  beforeEach(() => {
    mockStore = {}
    vi.unstubAllGlobals()
  })

  it('notifies the current document after a flow is durably retired', async () => {
    const eventTarget = new EventTarget()
    const retired = vi.fn()
    eventTarget.addEventListener(DRAFT_FLOW_RETIRED_EVENT, retired)
    vi.stubGlobal('window', {
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    })

    expect(retireDraftFlow('med-cert', FLOW_INSTANCE_ID)).toBe(true)
    expect(retired).not.toHaveBeenCalled()

    await new Promise<void>((resolve) => queueMicrotask(resolve))

    expect(retired).toHaveBeenCalledOnce()
  })
})

describe('saveDraft', () => {
  beforeEach(() => {
    mockStore = {}
  })

  it('saves draft with correct key and timestamp', () => {
    saveDraft('med-cert', {
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
      flowInstanceId: "11111111-1111-4111-8111-111111111111",
    })

    const stored = localStorageMock.getItem('instantmed-draft-med-cert')
    expect(stored).not.toBeNull()
    
    const parsed = JSON.parse(stored!) as DraftData
    expect(parsed.serviceType).toBe('med-cert')
    expect(parsed.currentStepId).toBe('symptoms')
    expect(parsed.flowInstanceId).toBe("11111111-1111-4111-8111-111111111111")
    expect(parsed.lastSavedAt).toBeDefined()
  })

  it('does not affect other service drafts', () => {
    const existingDraft: DraftData = {
      serviceType: 'prescription',
      currentStepId: 'medication',
      answers: { medicationName: 'Test Med' },
      lastSavedAt: new Date().toISOString(),
    }
    localStorageMock.setItem('instantmed-draft-prescription', JSON.stringify(existingDraft))

    saveDraft('med-cert', {
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
    })

    // Prescription draft should be untouched
    const prescription = getDraft('prescription')
    expect(prescription?.answers.medicationName).toBe('Test Med')
  })

  it('refuses to rewrite local or server state for a retired flow', () => {
    expect(retireDraftFlow('med-cert', FLOW_INSTANCE_ID)).toBe(true)

    saveDraft('med-cert', {
      flowInstanceId: FLOW_INSTANCE_ID,
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
    })

    expect(localStorageMock.getItem('instantmed-draft-med-cert')).toBeNull()
  })
})

describe('clearDraft', () => {
  beforeEach(() => {
    mockStore = {}
  })

  it('clears only the specified service draft', () => {
    const medCertDraft: DraftData = {
      serviceType: 'med-cert',
      currentStepId: 'symptoms',
      answers: {},
      lastSavedAt: new Date().toISOString(),
    }
    const prescriptionDraft: DraftData = {
      serviceType: 'prescription',
      currentStepId: 'medication',
      answers: {},
      lastSavedAt: new Date().toISOString(),
    }
    
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify(medCertDraft))
    localStorageMock.setItem('instantmed-draft-prescription', JSON.stringify(prescriptionDraft))
    localStorageMock.setItem(
      'instantmed-request-draft',
      JSON.stringify({ state: medCertDraft, version: 0 }),
    )

    clearDraft('med-cert')

    expect(getDraft('med-cert')).toBeNull()
    expect(getDraft('prescription')).not.toBeNull()
    expect(localStorageMock.getItem('instantmed-request-draft')).toBeNull()
  })

  it("keeps a legacy envelope that belongs to another service", () => {
    localStorageMock.setItem(
      'instantmed-request-draft',
      JSON.stringify({
        state: {
          serviceType: 'consult',
          currentStepId: 'ed-goals',
          answers: { consultSubtype: 'ed' },
          lastSavedAt: new Date().toISOString(),
        },
        version: 0,
      }),
    )

    clearDraft('med-cert')

    expect(localStorageMock.getItem('instantmed-request-draft')).not.toBeNull()
  })

  it('retires the captured flow before removing its local draft', () => {
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify({
      serviceType: 'med-cert',
      flowInstanceId: FLOW_INSTANCE_ID,
      currentStepId: 'symptoms',
      answers: { certType: 'work' },
      lastSavedAt: new Date().toISOString(),
    }))

    clearDraft('med-cert')

    expect(localStorageMock.getItem('instantmed-draft-med-cert')).toBeNull()
    expect(localStorageMock.getItem(
      `instantmed-draft-retired-flow-v1:${FLOW_INSTANCE_ID}`,
    )).not.toBeNull()
  })

  it('still clears a malformed scoped draft when flow capture cannot parse it', () => {
    localStorageMock.setItem('instantmed-draft-med-cert', '{not-json')

    clearDraft('med-cert')

    expect(localStorageMock.getItem('instantmed-draft-med-cert')).toBeNull()
  })

  it("retires a stale tab's flow without clearing a fresh same-service draft", () => {
    const freshDraft: DraftData = {
      serviceType: 'med-cert',
      flowInstanceId: FRESH_FLOW_INSTANCE_ID,
      currentStepId: 'symptoms',
      answers: { certType: 'carer' },
      lastSavedAt: new Date().toISOString(),
    }
    localStorageMock.setItem(
      'instantmed-draft-med-cert',
      JSON.stringify(freshDraft),
    )
    localStorageMock.setItem(
      'instantmed-request-draft',
      JSON.stringify({ state: freshDraft, version: 0 }),
    )

    clearDraft('med-cert', FLOW_INSTANCE_ID)

    expect(JSON.parse(localStorageMock.getItem('instantmed-draft-med-cert')!))
      .toMatchObject({ flowInstanceId: FRESH_FLOW_INSTANCE_ID })
    expect(JSON.parse(localStorageMock.getItem('instantmed-request-draft')!))
      .toMatchObject({ state: { flowInstanceId: FRESH_FLOW_INSTANCE_ID } })
    expect(localStorageMock.getItem(
      `instantmed-draft-retired-flow-v1:${FLOW_INSTANCE_ID}`,
    )).not.toBeNull()
  })
})

describe('getAllDrafts', () => {
  beforeEach(() => {
    mockStore = {}
  })

  it('returns empty array when no drafts exist', () => {
    expect(getAllDrafts()).toEqual([])
  })

  it('returns all valid drafts sorted by recency', () => {
    const olderDate = new Date()
    olderDate.setHours(olderDate.getHours() - 2)
    
    const newerDate = new Date()
    
    const medCertDraft: DraftData = {
      serviceType: 'med-cert',
      currentStepId: 'symptoms',
      answers: {},
      lastSavedAt: olderDate.toISOString(),
    }
    const prescriptionDraft: DraftData = {
      serviceType: 'prescription',
      currentStepId: 'medication',
      answers: {},
      lastSavedAt: newerDate.toISOString(),
    }
    
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify(medCertDraft))
    localStorageMock.setItem('instantmed-draft-prescription', JSON.stringify(prescriptionDraft))

    const drafts = getAllDrafts()
    
    expect(drafts).toHaveLength(2)
    expect(drafts[0].serviceType).toBe('prescription') // More recent
    expect(drafts[1].serviceType).toBe('med-cert')
  })

  it('excludes expired drafts', () => {
    const expiredDate = new Date()
    expiredDate.setHours(expiredDate.getHours() - 25)
    
    const validDate = new Date()
    
    const expiredDraft: DraftData = {
      serviceType: 'med-cert',
      currentStepId: 'symptoms',
      answers: {},
      lastSavedAt: expiredDate.toISOString(),
    }
    const validDraft: DraftData = {
      serviceType: 'prescription',
      currentStepId: 'medication',
      answers: {},
      lastSavedAt: validDate.toISOString(),
    }
    
    localStorageMock.setItem('instantmed-draft-med-cert', JSON.stringify(expiredDraft))
    localStorageMock.setItem('instantmed-draft-prescription', JSON.stringify(validDraft))

    const drafts = getAllDrafts()
    
    expect(drafts).toHaveLength(1)
    expect(drafts[0].serviceType).toBe('prescription')
  })
})

describe('migrateLegacyDraft', () => {
  beforeEach(() => {
    mockStore = {}
  })

  it('returns null when no legacy draft exists', () => {
    expect(migrateLegacyDraft()).toBeNull()
  })

  it('migrates valid legacy draft to new key and deletes legacy', () => {
    const legacyDraft = {
      state: {
        serviceType: 'med-cert',
        currentStepId: 'symptoms',
        answers: { certType: 'work' },
        lastSavedAt: new Date().toISOString(),
        firstName: 'Test',
      },
    }
    localStorageMock.setItem('instantmed-request-draft', JSON.stringify(legacyDraft))

    const result = migrateLegacyDraft()

    expect(result).not.toBeNull()
    expect(result?.serviceType).toBe('med-cert')
    expect(result?.firstName).toBe('Test')
    
    // Legacy should be deleted
    expect(localStorageMock.getItem('instantmed-request-draft')).toBeNull()
    
    // New key should exist
    expect(localStorageMock.getItem('instantmed-draft-med-cert')).not.toBeNull()
  })

  it('normalizes service type aliases during migration', () => {
    const legacyDraft = {
      state: {
        serviceType: 'repeat-script', // Alias
        currentStepId: 'medication',
        answers: {},
        lastSavedAt: new Date().toISOString(),
      },
    }
    localStorageMock.setItem('instantmed-request-draft', JSON.stringify(legacyDraft))

    const result = migrateLegacyDraft()

    expect(result?.serviceType).toBe('prescription') // Canonical
    expect(localStorageMock.getItem('instantmed-draft-prescription')).not.toBeNull()
  })

  it('ignores and clears expired legacy drafts', () => {
    const expiredDate = new Date()
    expiredDate.setHours(expiredDate.getHours() - 25)
    
    const legacyDraft = {
      state: {
        serviceType: 'med-cert',
        currentStepId: 'symptoms',
        answers: {},
        lastSavedAt: expiredDate.toISOString(),
      },
    }
    localStorageMock.setItem('instantmed-request-draft', JSON.stringify(legacyDraft))

    const result = migrateLegacyDraft()

    expect(result).toBeNull()
    expect(localStorageMock.getItem('instantmed-request-draft')).toBeNull()
    expect(localStorageMock.getItem('instantmed-draft-med-cert')).toBeNull()
  })

  it('clears invalid legacy drafts without serviceType', () => {
    const invalidDraft = {
      state: {
        currentStepId: 'symptoms',
        answers: {},
      },
    }
    localStorageMock.setItem('instantmed-request-draft', JSON.stringify(invalidDraft))

    expect(migrateLegacyDraft()).toBeNull()
    expect(localStorageMock.getItem('instantmed-request-draft')).toBeNull()
  })
})
