"use client"

/**
 * Unified Request Store - Zustand store for the unified /request flow
 * 
 * Manages state for all service types with a common interface.
 */

import { create } from 'zustand'
import { persist, type StorageValue } from 'zustand/middleware'

import { capture } from '@/lib/analytics/capture'
import { buildIntakeAnswerChangedEvent } from '@/lib/analytics/intake-events'
import {
  canonicalizeServiceType,
  type CanonicalServiceType,
  type DraftData,
  getAllDrafts,
  getDraft,
  migrateLegacyDraft,
  saveDraft,
} from '@/lib/request/draft-storage'
import type { ServerDraftRecord } from '@/lib/request/server-draft'
import { deriveRequestStepProgress } from '@/lib/request/step-progress'
import type { UnifiedServiceType, UnifiedStepId } from '@/lib/request/step-registry'
import {
  getNextStepId,
  getPreviousStepId,
  getStepDefinitionById,
  getStepsForService as _getStepsForService,
  isRequestStepId,
} from '@/lib/request/step-registry'

export interface RequestState {
  // Service
  serviceType: UnifiedServiceType | null
  
  // Navigation
  currentStepId: UnifiedStepId
  direction: 1 | -1
  furthestVisitedStepId: UnifiedStepId | null
  stepsNeedingRevalidation: UnifiedStepId[]
  
  // Safety
  safetyConfirmed: boolean
  safetyTimestamp: string | null
  
  // Form answers (generic key-value store)
  answers: Record<string, unknown>
  
  // Identity
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  
  // Auth context (for step skipping logic)
  authContext: {
    isAuthenticated: boolean
    hasProfile: boolean
    hasMedicare: boolean // Medicare+IRN or IHI is available for prescribing
    hasAddress: boolean
    hasSex?: boolean
  }
  
  // Consents
  agreedToTerms: boolean
  confirmedAccuracy: boolean
  telehealthConsent: boolean
  
  // Status
  isLoading: boolean
  error: string | null
  
  // Draft
  draftId: string | null
  lastSavedAt: string | null
}

export interface IdentityData {
  email?: string
  fullName?: string
  dateOfBirth?: string
  phone?: string
}

export interface AuthContext {
  isAuthenticated: boolean
  hasProfile: boolean
  /** True when profile has complete identity (incl. date_of_birth) - mirrors RequestFlow prop */
  hasCompleteIdentity?: boolean
  hasMedicare: boolean // Medicare+IRN or IHI is available for prescribing
  hasAddress: boolean
  /** True when profile has a phone number - required for prescriptions + consults */
  hasPhone?: boolean
  /** True when prescribing sex is already stored on profile - required for eScript patient sync */
  hasSex?: boolean
}

export interface RequestActions {
  // Service
  setServiceType: (type: UnifiedServiceType) => void
  
  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (stepId: UnifiedStepId) => void
  
  // Safety
  setSafetyConfirmed: (confirmed: boolean) => void
  
  // Answers
  // options.touch=false skips the lastSavedAt stamp — used by profile
  // PREFILL so opening the flow signed-in doesn't masquerade as a real draft.
  setAnswer: (key: string, value: unknown, options?: { touch?: boolean }) => void
  setAnswers: (answers: Record<string, unknown>) => void

  // Identity
  setIdentity: (
    data: Partial<Pick<RequestState, 'firstName' | 'lastName' | 'email' | 'phone' | 'dob'>>,
    options?: { touch?: boolean },
  ) => void
  getIdentity: () => IdentityData
  
  // Auth context for step navigation
  setAuthContext: (ctx: AuthContext) => void

  // Explicit cross-device recovery. Replaces local clinical answers atomically;
  // the caller must validate the bearer record and route before invoking it.
  restoreServerDraft: (
    record: ServerDraftRecord,
    serviceType: 'med-cert' | 'repeat-script' | 'consult',
  ) => void
  
  // Consents
  setConsent: (key: 'agreedToTerms' | 'confirmedAccuracy' | 'telehealthConsent', value: boolean) => void
  
  // Status
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Reset
  reset: () => void
}

const initialState: RequestState = {
  serviceType: null,
  currentStepId: 'certificate', // First step for med-cert (default)
  direction: 1,
  furthestVisitedStepId: null,
  stepsNeedingRevalidation: [],
  safetyConfirmed: false,
  safetyTimestamp: null,
  answers: {},
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  authContext: {
    isAuthenticated: false,
    hasProfile: false,
    hasMedicare: false,
    hasAddress: false,
  },
  agreedToTerms: false,
  confirmedAccuracy: false,
  telehealthConsent: false,
  isLoading: false,
  error: null,
  draftId: null,
  lastSavedAt: null,
}

const invalidatedAttestationState = {
  safetyConfirmed: false,
  safetyTimestamp: null,
  agreedToTerms: false,
  confirmedAccuracy: false,
  telehealthConsent: false,
} as const

const identityFields = ['firstName', 'lastName', 'email', 'phone', 'dob'] as const

// UTI and new/switch-pill answers are mutually exclusive. When the patient
// changes pathway, remove every hidden branch field so stale clinical answers
// cannot be submitted or evaluated against the newly visible assessment.
const WOMENS_HEALTH_BRANCH_ANSWER_KEYS = [
  'utiSymptoms',
  'utiRedFlags',
  'utiPregnant',
  'utiDetails',
  'contraceptionType',
  'contraceptionCurrent',
  'pregnancyStatus',
  'lastPeriod',
  'contraceptionDetails',
  'womens_migraine_aura',
  'womens_blood_clot_history',
  'womens_smoker',
] as const

function applyAnswerChange(
  answers: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const nextAnswers = { ...answers }
  if (key === 'womensHealthOption') {
    for (const branchKey of WOMENS_HEALTH_BRANCH_ANSWER_KEYS) {
      delete nextAnswers[branchKey]
    }
  }
  nextAnswers[key] = value
  return nextAnswers
}

function draftIdentityMatchesCurrentState(draft: DraftData, state: RequestState): boolean {
  return identityFields.every((field) => (draft[field] ?? '') === state[field])
}

type PersistedRequestState = Partial<RequestState> & {
  answers?: unknown
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// --- Debounced draft persistence (see storage.setItem below) ---------------

const DRAFT_WRITE_DEBOUNCE_MS = 400

let pendingDraftWrite: { name: string; value: StorageValue<Partial<RequestState>> } | null = null
let draftWriteTimer: ReturnType<typeof setTimeout> | null = null
// Latest persisted snapshot, captured on every mutation so the pagehide beacon
// can send the current state without a lazy import that would never resolve
// during unload.
let latestPersistedDraftState: Partial<RequestState> | null = null
let draftHydrationSavedBefore: number | null = null
let draftHydrationCutoffToken = 0

type ServerDraftFlush = (payload: {
  serviceType: CanonicalServiceType
  currentStepId?: string
  answers?: Record<string, unknown>
  identity?: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    dob?: string
  }
}) => void

type RequestWindow = Window & {
  __instantmedFlushServerDraft?: ServerDraftFlush
}

export function beginRequestDraftHydrationCutoff(savedBefore: number): number {
  draftHydrationCutoffToken += 1
  draftHydrationSavedBefore = savedBefore
  return draftHydrationCutoffToken
}

export function clearRequestDraftHydrationCutoff(token: number): void {
  if (token !== draftHydrationCutoffToken) return
  draftHydrationSavedBefore = null
}

function writeDraftToStorage(name: string, value: StorageValue<Partial<RequestState>>): void {
  try {
    // Write to legacy key (for backward compatibility)
    localStorage.setItem(name, JSON.stringify(value))
  } catch {
    // QuotaExceededError or SecurityError - silently ignore (private mode, full storage)
    return
  }

  // Dual-write to new service-scoped key
  const state = value.state
  if (state?.serviceType) {
    const canonical = canonicalizeServiceType(state.serviceType)
    if (canonical) {
      saveDraft(canonical, {
        currentStepId: state.currentStepId || 'certificate',
        furthestVisitedStepId: state.furthestVisitedStepId,
        stepsNeedingRevalidation: state.stepsNeedingRevalidation,
        answers: state.answers || {},
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
        dob: state.dob,
        safetyConfirmed: state.safetyConfirmed,
        safetyTimestamp: state.safetyTimestamp,
      })
    }
  }
}

function flushPendingDraftWrite(): void {
  if (draftWriteTimer !== null) {
    clearTimeout(draftWriteTimer)
    draftWriteTimer = null
  }
  if (!pendingDraftWrite || typeof localStorage === 'undefined') return
  const { name, value } = pendingDraftWrite
  pendingDraftWrite = null
  writeDraftToStorage(name, value)
}

function queueDraftStorageWrite(
  name: string,
  value: StorageValue<Partial<RequestState>>,
): void {
  if (typeof localStorage === 'undefined') return
  pendingDraftWrite = { name, value }
  // Capture the latest state so the pagehide beacon can send it — covers BOTH
  // the persist-middleware setItem and the explicit-snapshot write paths.
  latestPersistedDraftState = value.state
  if (draftWriteTimer !== null) clearTimeout(draftWriteTimer)
  draftWriteTimer = setTimeout(() => {
    draftWriteTimer = null
    flushPendingDraftWrite()
  }, DRAFT_WRITE_DEBOUNCE_MS)
}

function persistedRequestState(state: Partial<RequestState>): Partial<RequestState> {
  return {
    serviceType: state.serviceType,
    currentStepId: state.currentStepId,
    furthestVisitedStepId: state.furthestVisitedStepId,
    stepsNeedingRevalidation: state.stepsNeedingRevalidation,
    safetyConfirmed: state.safetyConfirmed,
    safetyTimestamp: state.safetyTimestamp,
    answers: state.answers,
    firstName: state.firstName,
    lastName: state.lastName,
    email: state.email,
    phone: state.phone,
    dob: state.dob,
    // Carry the store's own stamp instead of minting one at persist time.
    // Stamping here meant EVERY set() (including setAuthContext on mount)
    // refreshed lastSavedAt, so the "24h draft expiry" never expired for a
    // returning visitor and empty just-opened flows looked like real drafts.
    // lastSavedAt is now written only by meaningful mutations (answers,
    // identity, step progression) — see touchLastSavedAt callers.
    lastSavedAt: state.lastSavedAt ?? null,
  }
}

function queueLatestDraftSnapshot(state: Partial<RequestState>): void {
  queueDraftStorageWrite('instantmed-request-draft', {
    state: persistedRequestState(state),
    version: 0,
  })
}

function queueLatestDraftSnapshotAfterMutation(readState: () => Partial<RequestState>): void {
  const queue =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (callback: () => void) => setTimeout(callback, 0)

  queue(() => queueLatestDraftSnapshot(readState()))
}

// A killed/backgrounded tab must not lose the trailing debounce window OR the
// final server mirror. flushPendingDraftWrite persists localStorage; the server
// mirror is debounced (1500ms) and would die with the page, so beacon the
// current state immediately (see flushServerDraft).
function flushDraftImmediately(): void {
  flushPendingDraftWrite()

  const state = latestPersistedDraftState
  if (!state?.serviceType) return
  // Never mirror a zero-answer "draft" to the server: it creates a
  // partial_intakes row (and eventually a recovery email) for a visitor who
  // opened the flow and left without answering anything.
  if (countMeaningfulAnswers(state.answers) === 0) return
  const canonical = canonicalizeServiceType(state.serviceType)
  if (!canonical) return
  const flush = (window as RequestWindow).__instantmedFlushServerDraft
  if (!flush) return

  try {
    flush({
      serviceType: canonical,
      currentStepId: state.currentStepId || undefined,
      answers: isPlainRecord(state.answers) ? state.answers : {},
      identity: {
        email: state.email,
        firstName: state.firstName,
        lastName: state.lastName,
        phone: state.phone,
        dob: state.dob,
      },
    })
  } catch {
    // best effort — localStorage above already persisted for same-device resume.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushDraftImmediately)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDraftImmediately()
  })
}

/**
 * Escape hatch for edit mode on a SKIPPED step: when the current step is not
 * in the active sequence (e.g. 'details' filtered out by canSkip for an authed
 * complete-profile user), next/prev resolution returns null and navigation
 * dies. The only sensible destination is the final review/pay step the patient
 * came from. Returns null when the current step IS active, so a normal
 * end-of-flow null (review's own Continue) is never overridden.
 */
function getLastActiveStepId(
  serviceType: UnifiedServiceType,
  currentStepId: UnifiedStepId,
  context: Parameters<typeof _getStepsForService>[1],
): UnifiedStepId | null {
  try {
    const steps = _getStepsForService(serviceType, context)
    if (steps.length === 0) return null
    if (steps.some((s) => s.id === currentStepId)) return null
    return steps[steps.length - 1].id as UnifiedStepId
  } catch {
    return null
  }
}

/**
 * Map a service-scoped DraftData onto the exact shape `partialize` persists,
 * so hydration semantics stay identical whether the payload came from the
 * legacy envelope, the just-migrated legacy draft, or the Phase 2.3
 * scoped-key read fallback below.
 */
function draftToPersistedState(draft: DraftData): Partial<RequestState> {
  return {
    serviceType: draft.serviceType,
    currentStepId: draft.currentStepId,
    furthestVisitedStepId: draft.furthestVisitedStepId ?? draft.currentStepId,
    stepsNeedingRevalidation: draft.stepsNeedingRevalidation ?? [],
    safetyConfirmed: draft.safetyConfirmed,
    safetyTimestamp: draft.safetyTimestamp,
    answers: draft.answers,
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email,
    phone: draft.phone,
    dob: draft.dob,
    lastSavedAt: draft.lastSavedAt,
  }
}

/**
 * Phase 2.3 read path: hydrate from the service-scoped keys when the legacy
 * key is empty. Two real populations land here: (a) drafts whose legacy key
 * was deleted by the pre-#248 fire-and-forget migration — for those patients
 * the scoped copy is the ONLY surviving copy; (b) any future state where the
 * scoped keys become primary. Prefers the draft matching the URL's
 * ?service= so a patient with drafts in two services resumes the one they
 * opened; otherwise falls back to the most recently saved draft.
 * getDraft/getAllDrafts already enforce the 24h expiry.
 *
 * Limitation: scoped drafts store the CANONICAL service (repeat-script is
 * stored under prescription); request-flow's URL-service effect re-asserts
 * the exact service after hydration, so answers survive and the flow
 * self-corrects.
 */
function readServiceScopedDraftFallback(): DraftData | null {
  try {
    if (typeof window !== 'undefined') {
      const urlService = canonicalizeServiceType(
        new URLSearchParams(window.location.search).get('service'),
      )
      if (urlService) {
        const urlDraft = getDraft(urlService)
        if (urlDraft) return urlDraft
      }
    }
    return getAllDrafts()[0] ?? null
  } catch {
    return null
  }
}

function normalizePersistedState(state: Partial<RequestState> | undefined): Partial<RequestState> {
  if (!state) return {}

  const persisted = state as PersistedRequestState

  return {
    ...state,
    answers: isPlainRecord(persisted.answers) ? persisted.answers : {},
    firstName: typeof state.firstName === 'string' ? state.firstName : '',
    lastName: typeof state.lastName === 'string' ? state.lastName : '',
    email: typeof state.email === 'string' ? state.email : '',
    phone: typeof state.phone === 'string' ? state.phone : '',
    dob: typeof state.dob === 'string' ? state.dob : '',
    safetyConfirmed: typeof state.safetyConfirmed === 'boolean' ? state.safetyConfirmed : false,
    safetyTimestamp: typeof state.safetyTimestamp === 'string' ? state.safetyTimestamp : null,
    furthestVisitedStepId: isRequestStepId(state.furthestVisitedStepId)
      ? state.furthestVisitedStepId
      : state.currentStepId ?? null,
    stepsNeedingRevalidation: Array.isArray(state.stepsNeedingRevalidation)
      ? state.stepsNeedingRevalidation.filter(isRequestStepId)
      : [],
    agreedToTerms: typeof state.agreedToTerms === 'boolean' ? state.agreedToTerms : false,
    confirmedAccuracy: typeof state.confirmedAccuracy === 'boolean' ? state.confirmedAccuracy : false,
    telehealthConsent: typeof state.telehealthConsent === 'boolean' ? state.telehealthConsent : false,
  }
}

function hasMeaningfulAnswerValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

function countMeaningfulAnswers(answers: unknown): number {
  if (!isPlainRecord(answers)) return 0
  return Object.values(answers).filter(hasMeaningfulAnswerValue).length
}

function shouldKeepCurrentStateDuringHydration(
  persistedState: Partial<RequestState>,
  currentState: RequestState & RequestActions,
): boolean {
  if (!persistedState.serviceType || !currentState.serviceType) return false
  if (persistedState.serviceType !== currentState.serviceType) return false
  if (persistedState.currentStepId !== currentState.currentStepId) return false

  return countMeaningfulAnswers(currentState.answers) > countMeaningfulAnswers(persistedState.answers)
}

export const useRequestStore = create<RequestState & RequestActions>()(
  persist<RequestState & RequestActions, [], [], Partial<RequestState>>(
    (set, get) => ({
      ...initialState,

      setServiceType: (type) => {
        const currentState = get()
        const { serviceType: previousServiceType, currentStepId, authContext, answers } = currentState

        // SWITCHING services loads the TARGET service's own scoped draft (or a
        // fresh slate) instead of carrying the previous service's answers.
        // Before 2026-07-10 the whole answers blob rode along, so a stale
        // med-cert symptomDetails ("chest pain since Tuesday") was submitted
        // inside an unrelated consult's intake_answers and could set
        // emergency_symptoms on it via deriveEmergencySymptomsFromText —
        // a false safety decline at pay. Identity fields (name/email/dob/
        // phone) are deliberately cross-service and are kept.
        if (previousServiceType && previousServiceType !== type) {
          // Mirror the outgoing service's latest state to its scoped key so
          // switching never loses work (the debounced write may still be
          // pending).
          flushPendingDraftWrite()

          const canonical = canonicalizeServiceType(type)
          const scopedDraft = canonical ? getDraft(canonical) : null
          const restoreConfirmedAttestation = Boolean(
            scopedDraft?.safetyConfirmed && draftIdentityMatchesCurrentState(scopedDraft, currentState),
          )

          const restoredAnswers = isPlainRecord(scopedDraft?.answers) ? scopedDraft.answers : {}
          const context = { ...authContext, serviceType: type, answers: restoredAnswers }
          let steps: { id: string }[]
          try {
            steps = _getStepsForService(type, context)
          } catch {
            steps = []
          }
          const restoredStepId = scopedDraft?.currentStepId
          const stepExists = restoredStepId ? steps.some(s => s.id === restoredStepId) : false

          set({
            serviceType: type,
            answers: restoredAnswers,
            currentStepId: (stepExists
              ? restoredStepId
              : steps[0]?.id || 'certificate') as UnifiedStepId,
            furthestVisitedStepId: isRequestStepId(scopedDraft?.furthestVisitedStepId)
              ? scopedDraft.furthestVisitedStepId
              : restoredStepId ?? (steps[0]?.id || 'certificate') as UnifiedStepId,
            stepsNeedingRevalidation: (scopedDraft?.stepsNeedingRevalidation ?? []).filter(isRequestStepId),
            safetyConfirmed: restoreConfirmedAttestation,
            safetyTimestamp: restoreConfirmedAttestation ? scopedDraft?.safetyTimestamp ?? null : null,
            agreedToTerms: restoreConfirmedAttestation,
            confirmedAccuracy: restoreConfirmedAttestation,
            telehealthConsent: restoreConfirmedAttestation,
            lastSavedAt: scopedDraft?.lastSavedAt ?? null,
          })
          queueLatestDraftSnapshotAfterMutation(get)
          return
        }

        // Same service (or first selection with no previous service): keep
        // answers; only ensure the current step exists in the service's list.
        const context = { ...authContext, serviceType: type, answers }
        let steps: { id: string }[]
        try {
          steps = _getStepsForService(type, context)
        } catch {
          steps = []
        }
        const stepExists = steps.some(s => s.id === currentStepId)
        if (stepExists) {
          set({ serviceType: type })
        } else {
          set({ serviceType: type, currentStepId: (steps[0]?.id || 'certificate') as UnifiedStepId })
        }
      },

      nextStep: () => {
        const { serviceType, currentStepId, authContext, answers, stepsNeedingRevalidation } = get()
        if (!serviceType) return

        const context = {
          ...authContext,
          serviceType,
          answers,
        }

        const nextId = getNextStepId(serviceType, currentStepId, context)
        if (nextId) {
          const steps = _getStepsForService(serviceType, context)
          const furthestVisitedIndex = steps.findIndex((step) => step.id === get().furthestVisitedStepId)
          const nextIndex = steps.findIndex((step) => step.id === nextId)
          set({
            currentStepId: nextId,
            direction: 1,
            stepsNeedingRevalidation: stepsNeedingRevalidation.filter((stepId) => stepId !== currentStepId),
            ...(nextIndex > furthestVisitedIndex ? { furthestVisitedStepId: nextId } : {}),
          })
          flushPendingDraftWrite()
          return
        }

        // Edit mode on a SKIPPED step (e.g. an authed complete-profile user
        // clicked "Edit" on Your Details from the pay step): the step isn't in
        // the active sequence, so getNextStepId returns null and Continue
        // would silently do nothing — an inescapable dead-end at the moment
        // of payment. Return the patient to the final review/pay step instead.
        const lastActiveId = getLastActiveStepId(serviceType, currentStepId, context)
        if (lastActiveId) {
          set({
            currentStepId: lastActiveId,
            direction: 1,
            stepsNeedingRevalidation: stepsNeedingRevalidation.filter((stepId) => stepId !== currentStepId),
          })
          flushPendingDraftWrite()
        }
      },

      prevStep: () => {
        const { serviceType, currentStepId, authContext, answers, stepsNeedingRevalidation } = get()
        if (!serviceType) return

        const context = {
          ...authContext,
          serviceType,
          answers,
        }

        const prevId = getPreviousStepId(serviceType, currentStepId, context)
        if (prevId) {
          set({ currentStepId: prevId, direction: -1 })
          flushPendingDraftWrite()
          return
        }

        // Same edit-mode escape as nextStep: Back from a skipped step returns
        // to the review/pay step the patient came from (not a dead button).
        const lastActiveId = getLastActiveStepId(serviceType, currentStepId, context)
        if (lastActiveId) {
          if (stepsNeedingRevalidation.includes(currentStepId)) return
          set({ currentStepId: lastActiveId, direction: -1 })
          flushPendingDraftWrite()
        }
      },

      goToStep: (stepId) => {
        const {
          currentStepId,
          serviceType,
          authContext,
          answers,
          furthestVisitedStepId,
          stepsNeedingRevalidation,
        } = get()

        // Use the step registry to get the actual active steps for this service
        // This ensures subtype-specific steps (ed-assessment, hair-loss-assessment, etc.) are included
        let activeSteps: UnifiedStepId[]
        try {
          const context = { ...authContext, serviceType: serviceType || 'med-cert', answers }
          activeSteps = _getStepsForService(serviceType || 'med-cert', context).map(s => s.id)
        } catch {
          // Step registry threw - allow navigation to proceed without blocking
          activeSteps = []
        }

        const currentIndex = activeSteps.indexOf(currentStepId)
        const targetIndex = activeSteps.indexOf(stepId)

        // An authenticated patient can explicitly edit Details even when that
        // step is skipped by the active sequence. Once its identity changes,
        // only the step's validated Continue path may clear the work and
        // return to review; progress clicks must not bypass that validation.
        if (currentIndex === -1 && stepsNeedingRevalidation.includes(currentStepId)) {
          return
        }

        // If target step isn't in active steps, allow navigation (step may be transitioning)
        if (targetIndex === -1) {
          set({ currentStepId: stepId, direction: 1 })
          return
        }

        // Block jumping to checkout without required data
        if (targetIndex > currentIndex) {
          const progress = deriveRequestStepProgress({
            stepIds: activeSteps,
            currentStepId,
            furthestVisitedStepId,
            stepsNeedingRevalidation,
          })

          if (targetIndex > progress.maxReachableIndex) {
            return
          }

          if (stepId === 'checkout' || stepId === 'review') {
            const hasRequiredAnswers = Object.keys(answers).length > 0
            if (!hasRequiredAnswers) {
              return // Block navigation - no answers provided
            }
          }
        }

        const direction = targetIndex > currentIndex ? 1 : -1
        set({ currentStepId: stepId, direction: direction as 1 | -1 })
        flushPendingDraftWrite()
      },

      setSafetyConfirmed: (confirmed) => set({ 
        safetyConfirmed: confirmed,
        safetyTimestamp: confirmed ? new Date().toISOString() : null,
      }),

      setAnswer: (key, value, options) => {
        const state = get()
        const answers = isPlainRecord(state.answers) ? state.answers : {}
        const previousValue = answers[key]
        if (Object.is(previousValue, value)) return
        const nextAnswers = applyAnswerChange(answers, key, value)
        const tracksProgress = options?.touch !== false
        const resetsConsultBranch = tracksProgress && key === 'consultSubtype'
        const invalidatedDependentSteps = state.serviceType
          ? getStepDefinitionById(state.serviceType, state.currentStepId, {
              ...state.authContext,
              serviceType: state.serviceType,
              answers: nextAnswers,
            })?.invalidatesSteps ?? []
          : []

        set({
          answers: nextAnswers,
          ...(options?.touch === false ? {} : { lastSavedAt: new Date().toISOString() }),
          ...(tracksProgress
            ? resetsConsultBranch
              ? {
                  furthestVisitedStepId: null,
                  stepsNeedingRevalidation: [],
                }
              : {
                  stepsNeedingRevalidation: Array.from(new Set([
                    ...state.stepsNeedingRevalidation,
                    state.currentStepId,
                    ...invalidatedDependentSteps,
                  ])),
                }
            : {}),
          ...invalidatedAttestationState,
        })
        queueLatestDraftSnapshotAfterMutation(get)

        const event = buildIntakeAnswerChangedEvent({
          serviceType: state.serviceType,
          subtype: typeof nextAnswers.consultSubtype === "string"
            ? nextAnswers.consultSubtype
            : undefined,
          stepId: state.currentStepId,
          answerKey: key,
          previousValue,
          nextValue: value,
        })
        if (event) capture(event.event, event.properties)
      },

      setAnswers: (nextAnswers) => {
        let changed = false
        set((state) => {
          const answers = isPlainRecord(state.answers) ? state.answers : {}
          const entries = Object.entries(nextAnswers)
          const hasChanged = entries.some(([key, value]) => !Object.is(answers[key], value))
          if (!hasChanged) {
            return state
          }

          changed = true
          const mergedAnswers = { ...answers, ...nextAnswers }
          const invalidatedDependentSteps = state.serviceType
            ? getStepDefinitionById(state.serviceType, state.currentStepId, {
                ...state.authContext,
                serviceType: state.serviceType,
                answers: mergedAnswers,
              })?.invalidatesSteps ?? []
            : []
          return {
            answers: mergedAnswers,
            lastSavedAt: new Date().toISOString(),
            stepsNeedingRevalidation: Array.from(new Set([
              ...state.stepsNeedingRevalidation,
              state.currentStepId,
              ...invalidatedDependentSteps,
            ])),
            ...invalidatedAttestationState,
          }
        })
        if (changed) queueLatestDraftSnapshotAfterMutation(get)
      },

      setIdentity: (data, options) => {
        set((state) => {
          const changed = (Object.keys(data) as Array<keyof typeof data>)
            .some((key) => !Object.is(state[key], data[key]))

          return {
            ...state,
            ...data,
            ...(options?.touch === false ? {} : { lastSavedAt: new Date().toISOString() }),
            ...(changed ? invalidatedAttestationState : {}),
            ...(changed && options?.touch !== false ? {
              stepsNeedingRevalidation: Array.from(new Set([
                ...state.stepsNeedingRevalidation,
                state.currentStepId,
              ])),
            } : {}),
          }
        })
        queueLatestDraftSnapshotAfterMutation(get)
      },

      getIdentity: () => {
        const { firstName, lastName, email, phone, dob } = get()
        return {
          email: email || undefined,
          fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || undefined,
          dateOfBirth: dob || undefined,
          phone: phone || undefined,
        }
      },

      setAuthContext: (ctx) => set({ authContext: ctx }),

      restoreServerDraft: (record, serviceType) => {
        const state = get()
        const answers = isPlainRecord(record.answers) ? record.answers : {}
        const context = {
          ...state.authContext,
          serviceType,
          answers,
        }
        let steps: { id: UnifiedStepId }[]
        try {
          steps = _getStepsForService(serviceType, context)
        } catch {
          steps = []
        }

        const requestedStep = isRequestStepId(record.currentStepId)
          ? record.currentStepId
          : null
        const currentStepId = (
          requestedStep && steps.some((step) => step.id === requestedStep)
            ? requestedStep
            : steps[0]?.id ?? 'certificate'
        ) as UnifiedStepId
        const identity = record.identity ?? {
          email: null,
          firstName: null,
          lastName: null,
          phone: null,
          dob: null,
        }

        set({
          serviceType,
          currentStepId,
          direction: 1,
          furthestVisitedStepId: currentStepId,
          stepsNeedingRevalidation: [],
          answers,
          firstName: typeof identity.firstName === 'string' ? identity.firstName : '',
          lastName: typeof identity.lastName === 'string' ? identity.lastName : '',
          email: typeof identity.email === 'string' ? identity.email : '',
          phone: typeof identity.phone === 'string' ? identity.phone : '',
          dob: typeof identity.dob === 'string' ? identity.dob : '',
          lastSavedAt: Number.isFinite(Date.parse(record.updatedAt)) ? record.updatedAt : null,
          draftId: null,
          error: null,
          ...invalidatedAttestationState,
        })
        queueLatestDraftSnapshotAfterMutation(get)
      },

      setConsent: (key, value) => set({ [key]: value }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      reset: () => {
        // Clear service-scoped draft storage keys
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('instantmed-draft-med-cert')
            window.localStorage.removeItem('instantmed-draft-prescription')
            window.localStorage.removeItem('instantmed-draft-consult')
            window.localStorage.removeItem('instantmed-request-draft')
          } catch {
            // Ignore localStorage errors (SSR, privacy mode)
          }
        }
        set(initialState)
      },
    }),
    {
      name: 'instantmed-request-draft',
      partialize: persistedRequestState,
      // Custom storage with dual-write to new service-scoped keys
      storage: {
        getItem: (name: string): StorageValue<Partial<RequestState>> | null => {
          if (typeof localStorage === 'undefined') return null

          // Migrate the legacy key AND use the migrated draft as the hydration
          // payload. This used to be a fire-and-forget call, but a successful
          // migration DELETES the legacy key — the very key this getItem reads
          // next — so every rehydrate that triggered a migration returned null:
          // the in-progress draft silently vanished from the store, the
          // debounced default write then recreated the key with empty answers,
          // and the patient's restored selections (cert type, a 2–3 day
          // duration and its price) were stomped back to defaults on reload.
          const migrated = migrateLegacyDraft()

          // Read from the legacy key, falling back to the service-scoped
          // keys (Phase 2.3) when it is empty — see
          // readServiceScopedDraftFallback for who lands there.
          const stored = migrated ? null : localStorage.getItem(name)
          const scopedDraft = migrated || stored ? null : readServiceScopedDraftFallback()
          const sourceDraft = migrated ?? scopedDraft
          if (!sourceDraft && !stored) return null

          try {
            const parsed: StorageValue<Partial<RequestState>> = sourceDraft
              ? { state: draftToPersistedState(sourceDraft) }
              : (JSON.parse(stored as string) as StorageValue<Partial<RequestState>>)
            parsed.state = normalizePersistedState(parsed.state)

            // Enforce 24h expiry before hydration — mirrors request-flow.tsx banner logic.
            // If the draft is stale, discard it so the form starts fresh rather than
            // silently pre-filling with old illness dates.
            const lastSavedAt = parsed.state?.lastSavedAt
            if (lastSavedAt) {
              const savedTime = new Date(lastSavedAt).getTime()
              if (draftHydrationSavedBefore !== null && savedTime >= draftHydrationSavedBefore) {
                return null
              }

              const hoursSinceSave = (Date.now() - savedTime) / (1000 * 60 * 60)
              if (hoursSinceSave >= 24) {
                localStorage.removeItem(name)
                return null
              }
            }

            // Validate currentStepId against the actual step list BEFORE hydration.
            // Subtypes (e.g. ED, hair loss) change the step sequence, so a persisted
            // currentStepId (e.g. "consult-reason") may not exist in the subtype's
            // step list - causing silent navigation failures when nextStep() is called.
            const st = parsed.state
            if (st?.serviceType && st.currentStepId) {
              try {
                const context = {
                  isAuthenticated: false,
                  hasProfile: false,
                  hasMedicare: false,
                  hasAddress: false,
                  serviceType: st.serviceType,
                  answers: isPlainRecord(st.answers) ? st.answers : {},
                }
                const steps = _getStepsForService(st.serviceType, context)
                if (steps.length > 0 && !steps.some(s => s.id === st.currentStepId)) {
                  st.currentStepId = steps[0].id as UnifiedStepId
                }
              } catch {
                // Step registry threw - leave currentStepId as-is
              }
            }

            return parsed
          } catch {
            return null
          }
        },
        // Persist writes are debounced: every keystroke otherwise runs THREE
        // synchronous JSON.stringify passes + two localStorage.setItem calls
        // on the main thread (legacy key + service-scoped key), which shows up
        // directly in the /request mobile typing latency. State stays live in
        // Zustand — only the storage mirror trails by up to 400ms, with a
        // flush on pagehide/hidden so a tab kill loses at most that window.
        setItem: (name: string, value: StorageValue<Partial<RequestState>>): void => {
          queueDraftStorageWrite(name, value)
        },
        removeItem: (name: string): void => {
          if (typeof localStorage === 'undefined') return
          // Cancel any trailing write so a reset cannot be resurrected by a
          // stale pending flush.
          pendingDraftWrite = null
          if (draftWriteTimer !== null) {
            clearTimeout(draftWriteTimer)
            draftWriteTimer = null
          }
          try {
            localStorage.removeItem(name)
          } catch {
            // Ignore storage errors
          }
          // Note: We don't clear service-scoped keys here
          // They are cleared explicitly via clearDraft()
        },
      },
      // Prevent Zustand from rehydrating during SSR/first render.
      // Without this, the store reads localStorage synchronously on first client render,
      // producing HTML that differs from the server render → React hydration error.
      // We call useRequestStore.persist.rehydrate() in a useEffect instead.
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<RequestState>
        if (shouldKeepCurrentStateDuringHydration(persisted, currentState)) {
          return currentState
        }
        return {
          ...currentState,
          ...persisted,
        }
      },
    }
  )
)
