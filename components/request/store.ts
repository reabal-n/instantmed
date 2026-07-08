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
  type DraftData,
  getAllDrafts,
  getDraft,
  migrateLegacyDraft,
  saveDraft,
} from '@/lib/request/draft-storage'
import { flushServerDraft } from '@/lib/request/server-draft'
import type { UnifiedServiceType, UnifiedStepId } from '@/lib/request/step-registry'
import { getNextStepId, getPreviousStepId,getStepsForService as _getStepsForService } from '@/lib/request/step-registry'

export interface RequestState {
  // Service
  serviceType: UnifiedServiceType | null
  
  // Navigation
  currentStepId: UnifiedStepId
  direction: 1 | -1
  
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
  setAnswer: (key: string, value: unknown) => void
  setAnswers: (answers: Record<string, unknown>) => void
  
  // Identity
  setIdentity: (data: Partial<Pick<RequestState, 'firstName' | 'lastName' | 'email' | 'phone' | 'dob'>>) => void
  getIdentity: () => IdentityData
  
  // Auth context for step navigation
  setAuthContext: (ctx: AuthContext) => void
  
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
    safetyConfirmed: state.safetyConfirmed,
    safetyTimestamp: state.safetyTimestamp,
    answers: state.answers,
    firstName: state.firstName,
    lastName: state.lastName,
    email: state.email,
    phone: state.phone,
    dob: state.dob,
    lastSavedAt: new Date().toISOString(),
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
  const canonical = canonicalizeServiceType(state.serviceType)
  if (!canonical) return

  try {
    flushServerDraft({
      serviceType: canonical,
      currentStepId: state.currentStepId || undefined,
      answers: isPlainRecord(state.answers) ? state.answers : {},
      identity: {
        email: state.email,
        firstName: state.firstName,
        lastName: state.lastName,
        phone: state.phone,
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
        const { currentStepId, authContext, answers } = get()
        // When switching service type, check if current step exists in the new service.
        // If not, reset to the first step of the new service to prevent navigation failures.
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
        const { serviceType, currentStepId, authContext, answers } = get()
        if (!serviceType) return

        const context = {
          ...authContext,
          serviceType,
          answers,
        }

        const nextId = getNextStepId(serviceType, currentStepId, context)
        if (nextId) {
          set({ currentStepId: nextId, direction: 1 })
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
          set({ currentStepId: lastActiveId, direction: 1 })
          flushPendingDraftWrite()
        }
      },

      prevStep: () => {
        const { serviceType, currentStepId, authContext, answers } = get()
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
          set({ currentStepId: lastActiveId, direction: -1 })
          flushPendingDraftWrite()
        }
      },

      goToStep: (stepId) => {
        const { currentStepId, serviceType, authContext, answers } = get()

        // Use the step registry to get the actual active steps for this service
        // This ensures subtype-specific steps (ed-assessment, hair-loss-assessment, etc.) are included
        let activeSteps: string[]
        try {
          const context = { ...authContext, serviceType: serviceType || 'med-cert', answers }
          activeSteps = _getStepsForService(serviceType || 'med-cert', context).map(s => s.id)
        } catch {
          // Step registry threw - allow navigation to proceed without blocking
          activeSteps = []
        }

        const currentIndex = activeSteps.indexOf(currentStepId)
        const targetIndex = activeSteps.indexOf(stepId)

        // If target step isn't in active steps, allow navigation (step may be transitioning)
        if (targetIndex === -1) {
          set({ currentStepId: stepId, direction: 1 })
          return
        }

        // Block jumping to checkout without required data
        if (targetIndex > currentIndex) {
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

      setAnswer: (key, value) => {
        const state = get()
        const answers = isPlainRecord(state.answers) ? state.answers : {}
        const previousValue = answers[key]
        if (Object.is(previousValue, value)) return

        set({
          answers: { ...answers, [key]: value },
        })
        queueLatestDraftSnapshotAfterMutation(get)

        const event = buildIntakeAnswerChangedEvent({
          serviceType: state.serviceType,
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
          return {
            answers: { ...answers, ...nextAnswers },
          }
        })
        if (changed) queueLatestDraftSnapshotAfterMutation(get)
      },

      setIdentity: (data) => {
        set((state) => ({
          ...state,
          ...data,
        }))
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
        const persisted = persistedState as Partial<RequestState>
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
