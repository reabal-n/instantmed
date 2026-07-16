"use client"

/**
 * Request Flow - Main orchestration component for unified /request
 * 
 * Handles:
 * - Service type initialization
 * - Step navigation with auth context
 * - Progress tracking with checkmarks
 * - Animated transitions between steps
 * - Swipe gestures for mobile navigation
 * - Auto-save indicator
 * - Unsaved changes warning
 * - PostHog analytics
 * - Draft restoration
 * - Error boundaries
 * - Flow completion
 */

import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ComponentType, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AutoSaveIndicator } from "@/components/request/auto-save-indicator"
import { ProgressBar } from "@/components/request/progress-bar"
import { INTAKE_PRIMARY_ACTION_CHANGE_EVENT, RequestButton } from "@/components/request/request-button"
import { requestCx } from "@/components/request/request-cx"
import { TimeRemaining } from "@/components/request/time-remaining"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import {
  getStoredDraftRestoreCandidate,
  shouldOfferDraftRestore,
} from "@/lib/request/draft-restore"
import {
  getInitialRequestUrlDecision,
} from "@/lib/request/initial-url-seeding"
import {
  adoptServerDraftSession,
  getServerDraftById,
} from "@/lib/request/server-draft"
import {
  getServerDraftRecoveryDecision,
  stripDraftSessionFromUrl,
} from "@/lib/request/server-draft-recovery"
import { deriveRequestStepProgress } from "@/lib/request/step-progress"
import {
  getStepDefinitionById,
  getStepsForService,
  type StepContext,
  type UnifiedServiceType,
  type UnifiedStepId,
} from "@/lib/request/step-registry"
import { type SafetyEvaluationResult } from "@/lib/safety/types"

import { useFlowAnalytics } from "./hooks/use-flow-analytics"
import { useFlowNavigation } from "./hooks/use-flow-navigation"
import { useSwipeNavigation } from "./hooks/use-swipe-navigation"
import { useUnsavedChanges } from "./hooks/use-unsaved-changes"
import { preloadStepComponent } from "./step-loaders"
import { StepRouter } from "./step-router"
import {
  beginRequestDraftHydrationCutoff,
  clearRequestDraftHydrationCutoff,
  useRequestStore,
} from "./store"

const FlowErrorScreen = lazy(() =>
  import("./flow-error-screen").then(({ FlowErrorScreen: component }) => ({ default: component }))
)
const DraftRestorationBanner = lazy(() =>
  import("./draft-restoration-banner").then(({ DraftRestorationBanner: component }) => ({ default: component }))
)
const SubtypeMismatchBanner = lazy(() =>
  import("./subtype-mismatch-banner").then(({ SubtypeMismatchBanner: component }) => ({ default: component }))
)

// Kick off the FIRST step's chunk fetch as soon as this client module
// evaluates — in parallel with hydration — instead of waiting for the full
// RequestFlow tree to hydrate and StepRouter's effect to flush. On the paid
// mobile entry (/request?service=med-cert) that serialized waterfall was the
// biggest lever on time-to-interactive for the certificate form. The preload
// cache dedupes against StepRouter's own load, and a draft resuming on a
// later step just wastes one small prefetch.
if (typeof window !== "undefined") {
  queueMicrotask(() => {
    try {
      const search = new URLSearchParams(window.location.search)
      const service = search.get("service")
      const subtype = search.get("subtype")
      const firstStepComponent =
        service === "med-cert"
          ? "certificate-step"
          : service === "repeat-script" || service === "prescription"
            ? "medication-step"
            : service === "consult"
              ? subtype === "hair_loss"
                ? "hair-loss-goals-step"
                : subtype === "womens_health"
                  ? "womens-health-type-step"
                  : subtype === "ed"
                    ? "ed-goals-step"
                    : null
              : null
      if (firstStepComponent) void preloadStepComponent(firstStepComponent)
    } catch {
      // Never let the prefetch interfere with hydration.
    }
  })
}

export function DraftSessionUrlScrubber({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return
    window.history.replaceState(
      window.history.state,
      "",
      stripDraftSessionFromUrl(window.location.href),
    )
  }, [active])

  return null
}


interface HealthProfilePrefill {
  allergies?: string[]
  conditions?: string[]
  current_medications?: string[]
}

interface MobilePrimaryActionState {
  available: boolean
  disabled: boolean
  ready: boolean
  label: string
}

const PRIMARY_ACTION_SELECTOR = "[data-intake-primary-action='true']"

type ServiceHubComponent = ComponentType<{
  onSelectService: (service: UnifiedServiceType, consultSubtype?: string) => void
}>

type ExitConfirmDialogComponent = ComponentType<{
  open: boolean
  onClose: () => void
  onConfirmExit: () => void
}>

type SafetyBlockDialogComponent = ComponentType<{
  safetyBlock: SafetyEvaluationResult | null
  onDismiss: () => void
  onReturnHome: () => void
  onContactUs: () => void
}>

function ServiceHubLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="mx-auto h-5 w-56 rounded-full bg-muted" />
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-3 border-b border-border/40 px-4 py-3.5 last:border-0">
              <div className="h-11 w-11 rounded-2xl bg-muted/70" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded-full bg-muted" />
                <div className="h-3 w-4/5 rounded-full bg-muted/60" />
              </div>
              <div className="h-4 w-12 rounded-full bg-muted/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LazyServiceHub({ onSelectService }: { onSelectService: (service: UnifiedServiceType, consultSubtype?: string) => void }) {
  const [ServiceHubScreen, setServiceHubScreen] = useState<ServiceHubComponent | null>(null)

  useEffect(() => {
    let mounted = true
    import("./service-hub-screen")
      .then((mod) => {
        if (mounted) setServiceHubScreen(() => mod.ServiceHubScreen)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  if (!ServiceHubScreen) return <ServiceHubLoading />
  return <ServiceHubScreen onSelectService={onSelectService} />
}

function LazyExitConfirmDialog({
  open,
  onClose,
  onConfirmExit,
}: {
  open: boolean
  onClose: () => void
  onConfirmExit: () => void
}) {
  const [DialogComponent, setDialogComponent] = useState<ExitConfirmDialogComponent | null>(null)

  useEffect(() => {
    if (!open || DialogComponent) return

    let mounted = true
    import("./exit-confirm-dialog")
      .then((mod) => {
        if (mounted) setDialogComponent(() => mod.ExitConfirmDialog)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [DialogComponent, open])

  if (!open || !DialogComponent) return null
  return <DialogComponent open={open} onClose={onClose} onConfirmExit={onConfirmExit} />
}

function LazySafetyBlockDialog({
  safetyBlock,
  onDismiss,
  onReturnHome,
  onContactUs,
}: {
  safetyBlock: SafetyEvaluationResult | null
  onDismiss: () => void
  onReturnHome: () => void
  onContactUs: () => void
}) {
  const [DialogComponent, setDialogComponent] = useState<SafetyBlockDialogComponent | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!safetyBlock || DialogComponent) return

    let mounted = true
    setLoadFailed(false)
    import("./safety-block-dialog")
      .then((mod) => {
        if (mounted) setDialogComponent(() => mod.SafetyBlockDialog)
      })
      .catch(() => {
        // Chunk load failed (e.g. ChunkLoadError on a flaky connection). A safety
        // block MUST still show a message — a DECLINE'd / REQUIRES_CALL patient
        // cannot be left on an unchanged step with no explanation. Fall back to a
        // non-lazy render below (same patient copy, no second chunk fetch).
        if (mounted) setLoadFailed(true)
      })

    return () => {
      mounted = false
    }
  }, [DialogComponent, safetyBlock])

  if (!safetyBlock) return null

  if (DialogComponent) {
    return (
      <DialogComponent
        safetyBlock={safetyBlock}
        onDismiss={onDismiss}
        onReturnHome={onReturnHome}
        onContactUs={onContactUs}
      />
    )
  }

  // Non-lazy fallback: only when the dialog chunk failed. Uses the same patient
  // copy and same-bundle RequestButton so it can never itself fail on a second
  // chunk fetch — the block message is always visible.
  if (loadFailed) {
    const isRequiresCall = safetyBlock.outcome === "REQUIRES_CALL"
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        role="alertdialog"
        aria-modal="true"
        aria-label={safetyBlock.patientTitle}
      >
        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-destructive">
            {safetyBlock.patientTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {safetyBlock.patientMessage}
          </p>
          <RequestButton className="mt-5 w-full" onClick={isRequiresCall ? onContactUs : onDismiss}>
            {isRequiresCall ? "Contact us" : "Go back"}
          </RequestButton>
        </div>
      </div>
    )
  }

  return null
}

function getMobilePrimaryAction() {
  if (typeof document === "undefined") return null
  return document.querySelector<HTMLButtonElement>(PRIMARY_ACTION_SELECTOR)
}

function getPrimaryActionLabel(action: HTMLButtonElement | null) {
  if (!action) return "Continue"
  const label = action.dataset.intakePrimaryLabel || action.textContent || "Continue"
  return label.replace(/\s+/g, " ").trim()
}

function getPrimaryActionReady(action: HTMLButtonElement | null) {
  if (!action || action.disabled) return false
  if (action.dataset.intakePrimaryReady === "true") return true
  if (action.dataset.intakePrimaryReady === "false") return false
  return true
}

interface RequestFlowProps {
  /** Service from URL param. null = invalid param was provided */
  initialService: UnifiedServiceType | null
  /** Raw service param from URL (for error messages) */
  rawServiceParam?: string
  /** Canonical consult subtype from URL, already normalized by app/request/page.tsx */
  initialSubtype?: string
  /** Validated women’s-health child-page intent; preselects but never skips the type step */
  initialIntent?: string
  /** Certificate type from URL (pre-seeded from landing page selector) */
  initialCertType?: string
  /** Certificate duration from URL (pre-seeded from landing page selector) */
  initialDuration?: string
  /** Validated explicit server-draft token. null means a malformed token was supplied. */
  initialDraftId?: string | null
  isAuthenticated: boolean
  hasProfile: boolean
  /** Profile has complete identity (incl. date_of_birth) - details step can be skipped */
  hasCompleteIdentity?: boolean
  hasMedicare: boolean // Medicare+IRN or IHI is available for prescribing
  hasAddress: boolean
  /** Profile has a phone number - required for prescriptions + consults */
  hasPhone?: boolean
  /** Profile has prescribing sex - required for prescription details skipping */
  hasSex?: boolean
  /** User email for pre-filling */
  userEmail?: string
  /** User name for pre-filling */
  userName?: string
  /** User phone for pre-filling */
  userPhone?: string
  /** Profile date of birth for pre-filling (decrypted) */
  profileDateOfBirth?: string
  /** Profile Medicare number for pre-filling */
  profileMedicare?: string
  /** Profile Medicare IRN for pre-filling */
  profileMedicareIrn?: number | string
  /** Profile IHI for pre-filling when patient has no Medicare */
  profileIhi?: string
  /** Profile prescribing sex for pre-filling */
  profileSex?: string
  /** Profile address for pre-filling */
  profileAddress?: { addressLine1: string; suburb: string; state: string; postcode: string }
  /** Health profile data for pre-filling medical history steps */
  healthProfile?: HealthProfilePrefill | null
}


export function RequestFlow({
  initialService,
  rawServiceParam,
  initialSubtype,
  initialIntent,
  initialCertType,
  initialDuration,
  initialDraftId,
  isAuthenticated,
  hasProfile,
  hasCompleteIdentity,
  hasMedicare,
  hasAddress,
  hasPhone,
  hasSex,
  userEmail,
  userName,
  userPhone,
  profileDateOfBirth,
  profileMedicare,
  profileMedicareIrn,
  profileIhi,
  profileSex,
  profileAddress,
  healthProfile,
}: RequestFlowProps) {
  const router = useRouter()
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [showSubtypeMismatch, setShowSubtypeMismatch] = useState(false)
  const [draftSubtype, setDraftSubtype] = useState<string | null>(null)
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false)
  const [safetyBlock, setSafetyBlock] = useState<SafetyEvaluationResult | null>(null)
  const [mobilePrimaryAction, setMobilePrimaryAction] = useState<MobilePrimaryActionState>({
    available: false,
    disabled: true,
    ready: false,
    label: "Continue",
  })
  const contentRef = useRef<HTMLDivElement>(null)
  
  const {
    serviceType,
    currentStepId,
    furthestVisitedStepId,
    stepsNeedingRevalidation,
    setServiceType,
    prevStep,
    goToStep,
    answers,
    setAnswer,
    setIdentity,
    setAuthContext,
    lastSavedAt,
  } = useRequestStore()
  const hasExplicitRecovery = initialDraftId !== undefined

  // Hydration status for effects that must read the RESTORED store, not the
  // empty pre-hydration snapshot. The store uses skipHydration:true, so any
  // value read during the first render predates the persisted draft — the old
  // render-time URL-context snapshot here made every draft-protection guard
  // (subtype mismatch, certType/duration stomp checks) permanently dead on
  // fresh page loads.
  const [hydrated, setHydrated] = useState(false)

  const initialDebugContextRef = useRef({
    initialService,
    rawServiceParam,
    storeServiceType: serviceType,
    currentStepId,
  })
  const clientSessionStartedAtRef = useRef<number | null>(null)
  if (clientSessionStartedAtRef.current === null && typeof window !== "undefined") {
    clientSessionStartedAtRef.current = Date.now()
  }
  const storedDraftAtEntryRef = useRef<ReturnType<typeof getStoredDraftRestoreCandidate> | null | undefined>(undefined)
  if (storedDraftAtEntryRef.current === undefined) {
    storedDraftAtEntryRef.current = getStoredDraftRestoreCandidate(initialService)
  }
  
  // Rehydrate persisted store after mount (SSR-safe pattern).
  // The store uses skipHydration:true to avoid a server/client mismatch on first render.
  useEffect(() => {
    let cancelled = false
    const entryDraft = storedDraftAtEntryRef.current
    const savedBefore = clientSessionStartedAtRef.current ?? Date.now()

    const offerExistingDraft = () => {
      if (cancelled || !entryDraft) return

      const hydratedState = useRequestStore.getState()
      if (
        shouldOfferDraftRestore({
          ...entryDraft,
          savedBefore,
        }) &&
        shouldOfferDraftRestore({
          lastSavedAt: hydratedState.lastSavedAt,
          serviceType: hydratedState.serviceType,
          currentStepId: hydratedState.currentStepId,
          savedBefore,
        })
      ) {
        setShowDraftBanner(true)
      }
    }

    const hydrationCutoffToken = beginRequestDraftHydrationCutoff(savedBefore)

    // Decide URL-vs-draft AFTER hydration, from the store's real restored
    // values. Runs once per mount.
    const applyUrlDecision = () => {
      const hydratedState = useRequestStore.getState()
      const decision = getInitialRequestUrlDecision({
        initialService,
        initialSubtype,
        initialIntent,
        initialCertType,
        initialDuration,
        storedConsultSubtype: hydratedState.answers?.consultSubtype,
        storedWomensHealthOption: hydratedState.answers?.womensHealthOption,
        storedCertType: hydratedState.answers?.certType,
        storedDuration: hydratedState.answers?.duration,
        lastSavedAt: hydratedState.lastSavedAt,
      })

      if (decision.subtypeMismatch) {
        setDraftSubtype(decision.subtypeMismatch.draftSubtype)
        setShowSubtypeMismatch(true)
      }

      for (const seed of decision.answerSeeds) {
        // URL seeds are navigation context, not patient work — never let them
        // make an untouched flow look like a saved draft.
        hydratedState.setAnswer(seed.key, seed.value, { touch: false })
      }

      if (decision.redirectPath) {
        router.replace(decision.redirectPath)
      }
    }

    const finishHydration = async () => {
      clearRequestDraftHydrationCutoff(hydrationCutoffToken)

      if (hasExplicitRecovery) {
        if (!initialDraftId) {
          if (!cancelled) setRecoveryUnavailable(true)
          return
        }

        const record = await getServerDraftById(initialDraftId)
        if (cancelled) return
        if (!record) {
          setRecoveryUnavailable(true)
          return
        }

        const decision = getServerDraftRecoveryDecision({
          draft: record,
          initialService,
          initialSubtype,
        })
        if (!decision.ok) {
          setRecoveryUnavailable(true)
          return
        }

        if (!adoptServerDraftSession(record)) {
          setRecoveryUnavailable(true)
          return
        }

        const restoredState = useRequestStore.getState()
        restoredState.setAuthContext({
          isAuthenticated,
          hasProfile,
          hasCompleteIdentity: hasCompleteIdentity ?? hasProfile,
          hasMedicare,
          hasAddress,
          hasPhone,
          hasSex,
        })
        restoredState.restoreServerDraft(record, decision.serviceType)
        setShowDraftBanner(false)
        setHydrated(true)
        return
      }

      applyUrlDecision()
      setHydrated(true)
      offerExistingDraft()
    }

    const rehydrateResult = useRequestStore.persist.rehydrate()
    if (rehydrateResult && typeof rehydrateResult.then === "function") {
      void rehydrateResult.then(
        () => finishHydration(),
        () => finishHydration(),
      ).catch(() => {
        clearRequestDraftHydrationCutoff(hydrationCutoffToken)
        if (cancelled) return
        if (hasExplicitRecovery) {
          setRecoveryUnavailable(true)
          return
        }
        // Local hydration failed: unblock a fresh flow without pretending a
        // stale or unrelated draft was restored.
        applyUrlDecision()
        setHydrated(true)
      })
    } else {
      void finishHydration().catch(() => {
        clearRequestDraftHydrationCutoff(hydrationCutoffToken)
        if (!cancelled) setRecoveryUnavailable(true)
      })
    }

    return () => {
      cancelled = true
      clearRequestDraftHydrationCutoff(hydrationCutoffToken)
    }
    // Mount-only by design: URL params are re-checked by the hydration-gated
    // sync effect below; re-running rehydrate on prop change would re-fight
    // the live store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize auth context in store for step navigation
  useEffect(() => {
    setAuthContext({ isAuthenticated, hasProfile, hasCompleteIdentity: hasCompleteIdentity ?? hasProfile, hasMedicare, hasAddress, hasPhone, hasSex })
  }, [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, hasSex, setAuthContext])

  // Pre-fill identity from the profile: ONCE, post-hydration, blanks only.
  // The previous version re-ran on every answers.* keystroke (deps included
  // medicareNumber etc.) and had no already-set guards on name/dob — so a
  // signed-in patient who corrected their name or DOB on the details step had
  // it snap back to profile values the moment they typed their Medicare
  // number, and the wrong identity then flowed into the cert PDF and the
  // Parchment patient sync. Prefill is a seed, not a leash.
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hydrated || hasExplicitRecovery || prefillAppliedRef.current) return
    prefillAppliedRef.current = true

    const state = useRequestStore.getState()
    const prefillIdentity: Parameters<typeof setIdentity>[0] = {}
    if (userEmail && !state.email) prefillIdentity.email = userEmail
    if (userName && !state.firstName && !state.lastName) {
      const [firstName, ...lastParts] = userName.split(' ')
      prefillIdentity.firstName = firstName || ''
      prefillIdentity.lastName = lastParts.join(' ') || ''
    }
    if (userPhone && !state.phone) prefillIdentity.phone = userPhone
    if (profileDateOfBirth && !state.dob) prefillIdentity.dob = profileDateOfBirth
    if (Object.keys(prefillIdentity).length > 0) {
      // touch:false — opening the flow signed-in is not patient work and must
      // not create a restorable "draft".
      setIdentity(prefillIdentity, { touch: false })
    }

    const storedAnswers = state.answers ?? {}
    if (profileMedicare && !storedAnswers.medicareNumber) {
      setAnswer('medicareNumber', profileMedicare, { touch: false })
    }
    if (profileMedicareIrn && !storedAnswers.medicareIrn) {
      setAnswer('medicareIrn', String(profileMedicareIrn), { touch: false })
    }
    if (profileIhi && !storedAnswers.ihiNumber) {
      setAnswer('ihiNumber', profileIhi, { touch: false })
    }
    if (profileSex && !storedAnswers.sex) {
      setAnswer('sex', profileSex, { touch: false })
    }
    if (profileAddress && !storedAnswers.addressLine1) {
      setAnswer('addressLine1', profileAddress.addressLine1, { touch: false })
      setAnswer('suburb', profileAddress.suburb, { touch: false })
      setAnswer('state', profileAddress.state, { touch: false })
      setAnswer('postcode', profileAddress.postcode, { touch: false })
    }
  }, [hydrated, hasExplicitRecovery, userEmail, userName, userPhone, profileDateOfBirth, profileMedicare, profileMedicareIrn, profileIhi, profileSex, profileAddress, setIdentity, setAnswer])

  // Pre-fill medical history from health profile (post-hydration, blanks
  // only, non-stamping — same rules as identity prefill above).
  const healthPrefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hydrated || hasExplicitRecovery || !healthProfile || healthPrefillAppliedRef.current) return
    healthPrefillAppliedRef.current = true
    const storedAnswers = useRequestStore.getState().answers ?? {}
    if (healthProfile.allergies?.length && !storedAnswers.known_allergies) {
      setAnswer('known_allergies', healthProfile.allergies.join(', '), { touch: false })
      setAnswer('has_allergies', 'yes', { touch: false })
    }
    if (healthProfile.conditions?.length && !storedAnswers.existing_conditions) {
      setAnswer('existing_conditions', healthProfile.conditions.join(', '), { touch: false })
      setAnswer('has_conditions', 'yes', { touch: false })
    }
    if (healthProfile.current_medications?.length && !storedAnswers.current_medications) {
      setAnswer('current_medications', healthProfile.current_medications.join(', '), { touch: false })
      setAnswer('takes_medications', 'yes', { touch: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, healthProfile])

  // Initialize service type from URL param
  // IMPORTANT: URL param is the source of truth for which service to show.
  // Gated on hydration: setting the service pre-hydration raced the async
  // rehydrate (whose merge could restore a different last-touched service) and
  // meant setServiceType's scoped-draft switch ran against pre-draft state.
  // Switching now loads the target service's OWN scoped draft (see store).
  useEffect(() => {
    if (!hydrated || hasExplicitRecovery) return
    if (initialService && serviceType !== initialService) {
      setServiceType(initialService)
    }
  }, [hydrated, hasExplicitRecovery, initialService, serviceType, setServiceType])

  // (URL answer seeds + subtype-mismatch detection now run post-hydration in
  // applyUrlDecision inside the rehydrate effect above.)

  // Use initialService as fallback during hydration
  const effectiveService = serviceType || initialService
  
  // Build step context with auth state
  const stepContext: StepContext = useMemo(() => ({
    isAuthenticated,
    hasProfile,
    hasCompleteIdentity: hasCompleteIdentity ?? hasProfile,
    hasMedicare,
    hasAddress,
    hasPhone,
    hasSex,
    serviceType: effectiveService || 'med-cert',
    answers,
  }), [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, hasSex, effectiveService, answers])

  // Get active steps for current service
  const activeSteps = useMemo(() => {
    if (!effectiveService) return []
    return getStepsForService(effectiveService, stepContext)
  }, [effectiveService, stepContext])

  const stepProgress = useMemo(() => deriveRequestStepProgress({
    stepIds: activeSteps.map((step) => step.id),
    currentStepId,
    furthestVisitedStepId,
    stepsNeedingRevalidation,
  }), [activeSteps, currentStepId, furthestVisitedStepId, stepsNeedingRevalidation])
  const currentStepIndex = stepProgress.currentIndex

  // When currentStepId is not in activeSteps, check if it's a skipped step we can render for editing
  // (e.g. user clicked "Edit" on Your Details when details was skipped)
  const editModeStep = useMemo(() => {
    if (activeSteps.some(s => s.id === currentStepId)) return null
    return getStepDefinitionById(effectiveService || 'med-cert', currentStepId as UnifiedStepId, stepContext)
  }, [activeSteps, currentStepId, effectiveService, stepContext])

  // Sync store's currentStepId when it doesn't exist in the active steps list.
  // Exception: when editModeStep exists, user explicitly navigated to edit a skipped step - don't redirect
  useEffect(() => {
    if (editModeStep) return
    if (activeSteps.length > 0 && !activeSteps.some(s => s.id === currentStepId)) {
      goToStep(activeSteps[0].id as UnifiedStepId)
    }
  }, [activeSteps, currentStepId, goToStep, editModeStep])

  // Structural dead-end escape: a consult flow with no resolvable subtype has
  // ZERO steps, so the render below falls into the spinner branch forever
  // (reachable via draft discard pre-fix, a cleared store, or any client nav
  // that lands on service=consult without a subtype). Seed the URL's subtype
  // when we have one; otherwise return the patient to the service hub.
  useEffect(() => {
    if (!hydrated || effectiveService !== 'consult' || activeSteps.length > 0) return
    if (initialSubtype && answers.consultSubtype !== initialSubtype) {
      setAnswer('consultSubtype', initialSubtype, { touch: false })
    } else {
      router.replace('/request')
    }
  }, [hydrated, effectiveService, activeSteps.length, initialSubtype, answers.consultSubtype, setAnswer, router])

  // Get current step definition - use editModeStep when editing a skipped step
  const currentStep = editModeStep ?? (activeSteps.length > 0 ? activeSteps[currentStepIndex] : null)

  // --- Extracted hooks ---

  const { analyticsServiceType, patientEmail, posthog, trackStepCompleted } = useFlowAnalytics({
    serviceType,
    currentStep,
    currentStepId,
    currentStepIndex,
    totalSteps: activeSteps.length,
    answers,
    userEmail,
  })

  const didCaptureDebugMountRef = useRef(false)
  useEffect(() => {
    if (didCaptureDebugMountRef.current) return
    didCaptureDebugMountRef.current = true

    if (process.env.NODE_ENV === 'development') {
      posthog?.capture('$debug_request_flow_mount', initialDebugContextRef.current)
    }
  }, [posthog])

  const { hasUnsavedChanges, showExitConfirm, setShowExitConfirm } = useUnsavedChanges({
    answers,
    currentStepIndex,
    serviceType,
    analyticsServiceType,
    currentStepId,
    posthog,
  })

  const { handleTouchStart, handleTouchEnd } = useSwipeNavigation({
    onSwipeBack: () => {
      if (currentStepIndex > 0) prevStep()
    },
    canGoBack: currentStepIndex > 0,
  })

  const {
    handleBack,
    handleNext,
    handleComplete,
    handleExit: _handleExit,
    handleRestoreDraft,
    handleDiscardDraft,
    handleResumeDraft,
    handleStartFreshSubtype,
    handleStepClick,
    handleExitWithConfirm,
    confirmExit,
    handleSelectService,
  } = useFlowNavigation({
    initialService,
    initialSubtype,
    posthog,
    analyticsServiceType,
    patientEmail,
    trackStepCompleted,
    currentStepId,
    currentStepIndex,
    effectiveService,
    answers,
    activeSteps,
    isAuthenticated,
    hasUnsavedChanges,
    setShowExitConfirm,
    setSafetyBlock,
    draftSubtype,
    setShowDraftBanner,
    setShowSubtypeMismatch,
  })

  // Keyboard navigation: Escape to go back
  // Note: Enter to continue is handled by individual step components
  // to respect their validation state
  useKeyboardNavigation({
    onBack: handleBack,
    enabled: !showExitConfirm,
  })

  useEffect(() => {
    // Every step — including the unified review+pay step — drives this shared
    // mobile primary-action bar via data-intake-primary-action. (Before the
    // 2026-06-28 unification the 'checkout' step was excluded because the retired
    // checkout-step had its own sticky CTA; review-step relies on this bar.)
    const syncPrimaryAction = () => {
      const action = getMobilePrimaryAction()
      setMobilePrimaryAction({
        available: Boolean(action),
        disabled: action ? action.disabled : true,
        ready: getPrimaryActionReady(action),
        label: getPrimaryActionLabel(action),
      })
    }

    const isMobileViewport =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 640px)").matches
    if (!isMobileViewport) {
      syncPrimaryAction()
      return
    }

    let frameId: number | null = null
    const schedulePrimaryActionSync = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        syncPrimaryAction()
      })
    }

    // Performance: the old implementation used a broad subtree observer here
    // and it showed up directly in the /request mobile Lighthouse TBT gate. The
    // step's primary RequestButton now announces mount/disabled/ready changes,
    // so the mobile sticky CTA can mirror it without watching the whole step DOM.
    window.addEventListener(INTAKE_PRIMARY_ACTION_CHANGE_EVENT, schedulePrimaryActionSync)
    syncPrimaryAction()

    return () => {
      window.removeEventListener(INTAKE_PRIMARY_ACTION_CHANGE_EVENT, schedulePrimaryActionSync)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [currentStepId])

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return

    const { visualViewport } = window
    const root = document.documentElement
    let frameId: number | null = null

    const updateKeyboardOffset = () => {
      const viewportBottom = visualViewport.offsetTop + visualViewport.height
      const rawOffset = Math.max(0, window.innerHeight - viewportBottom)
      root.style.setProperty("--keyboard-offset", `${Math.round(rawOffset)}px`)
    }

    const scheduleKeyboardOffsetUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateKeyboardOffset()
      })
    }

    scheduleKeyboardOffsetUpdate()
    visualViewport.addEventListener("resize", scheduleKeyboardOffsetUpdate)
    visualViewport.addEventListener("scroll", scheduleKeyboardOffsetUpdate)
    window.addEventListener("orientationchange", scheduleKeyboardOffsetUpdate)

    return () => {
      visualViewport.removeEventListener("resize", scheduleKeyboardOffsetUpdate)
      visualViewport.removeEventListener("scroll", scheduleKeyboardOffsetUpdate)
      window.removeEventListener("orientationchange", scheduleKeyboardOffsetUpdate)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      root.style.removeProperty("--keyboard-offset")
    }
  }, [])

  // Scroll to top + move screen-reader focus to the new step's heading on step
  // change (2026-06-11 a11y/UX review). Sighted users who scrolled deep into a
  // long step otherwise land mid-page; SR users got no announcement of the new
  // step at all. Skips the first mount so resuming a saved flow doesn't yank
  // the page or steal focus; respects prefers-reduced-motion.
  const stepScrollInitialized = useRef(false)
  useEffect(() => {
    if (!stepScrollInitialized.current) {
      stepScrollInitialized.current = true
      return
    }
    if (typeof window === "undefined") return
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" })

    // Focus the step heading so screen readers announce the new step. The
    // heading isn't a normal tab stop, so make it programmatically focusable
    // for this one focus; preventScroll keeps it from fighting the scrollTo.
    const heading = contentRef.current?.querySelector<HTMLElement>("h1, h2")
    if (heading) {
      heading.setAttribute("tabindex", "-1")
      heading.focus({ preventScroll: true })
    }
  }, [currentStepId])

  const handleMobilePrimaryAction = useCallback(() => {
    getMobilePrimaryAction()?.click()
  }, [])

  const mobileActionClickable = mobilePrimaryAction.available && !mobilePrimaryAction.disabled
  const mobileActionReady = mobileActionClickable && mobilePrimaryAction.ready
  const showMobileSavedCue = mobileActionReady && Boolean(lastSavedAt) && !hasUnsavedChanges

  // Service name for display
  const serviceName = useMemo(() => {
    const names: Record<UnifiedServiceType, string> = {
      'med-cert': 'medical certificate',
      'prescription': 'prescription',
      'repeat-script': 'repeat prescription',
      'consult': 'consultation',
    }
    return serviceType ? names[serviceType] : 'request'
  }, [serviceType])

  if (recoveryUnavailable) {
    return (
      <main className="min-h-screen bg-background px-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-white p-6 text-center shadow-md shadow-primary/[0.06] dark:bg-card sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Saved request unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This link may have expired or the request may already have been completed. Start a new request to continue.
          </p>
          <a
            href="/request"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Start a new request
          </a>
        </div>
      </main>
    )
  }

  if (hasExplicitRecovery && !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Restoring saved request">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // No service param provided - show service hub
  if (initialService === null && !rawServiceParam) {
    return <LazyServiceHub onSelectService={handleSelectService} />
  }

  // Consult without subtype: redirect to service hub (no general consult).
  // Active subtypes: ed, hair_loss, womens_health. Coming soon: weight_loss.
  if (initialService === 'consult' && !initialSubtype) {
    return <LazyServiceHub onSelectService={handleSelectService} />
  }

  // Invalid service param provided - show error screen
  if (initialService === null && rawServiceParam) {
    return (
      <Suspense fallback={null}>
        <FlowErrorScreen invalidService={rawServiceParam} />
      </Suspense>
    )
  }

  // Show loading only if we truly have no service type
  if (!effectiveService || !currentStep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div data-patient-flow="true" className="min-h-screen bg-background">
      {/* Exit confirmation dialog */}
      <LazyExitConfirmDialog
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirmExit={confirmExit}
      />

      {/* Safety pre-check block dialog */}
      <LazySafetyBlockDialog
        safetyBlock={safetyBlock}
        onDismiss={() => setSafetyBlock(null)}
        onReturnHome={() => {
          setSafetyBlock(null)
          router.push('/')
        }}
        onContactUs={() => {
          setSafetyBlock(null)
          router.push('/contact')
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="max-w-lg mx-auto px-4 h-12 sm:h-14 flex items-center justify-between">
          <RequestButton
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            aria-label="Go back"
            className="h-12 w-12 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </RequestButton>
          
          {/* Center: Step label + count */}
          <div className="flex flex-col items-center">
            <h1 className="font-semibold text-sm">
              {currentStep.label}
            </h1>
            <span className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {activeSteps.length}
            </span>
          </div>
          
          <RequestButton
            variant="ghost" 
            size="icon" 
            onClick={handleExitWithConfirm}
            aria-label="Exit"
            className="h-12 w-12 sm:h-10 sm:w-10"
          >
            <X className="w-5 h-5" />
          </RequestButton>
        </div>
        
        {/* Progress bar + indicators row */}
        <div className="max-w-lg mx-auto px-4 pb-2 sm:pb-3">
          {/* Time remaining + Auto-save indicator */}
          <div className="hidden sm:flex items-center justify-between mb-2">
            <TimeRemaining 
              steps={activeSteps.map(s => ({ id: s.id }))} 
              currentIndex={currentStepIndex} 
            />
            <AutoSaveIndicator 
              lastSavedAt={lastSavedAt} 
              hasUnsavedChanges={hasUnsavedChanges} 
            />
          </div>
          
          <ProgressBar 
            steps={activeSteps.map(s => ({ id: s.id, shortLabel: s.shortLabel }))} 
            currentIndex={currentStepIndex}
            furthestVisitedIndex={stepProgress.furthestVisitedIndex}
            maxReachableIndex={stepProgress.maxReachableIndex}
            stepsNeedingRevalidation={stepsNeedingRevalidation}
            onStepClick={handleStepClick}
          />
        </div>
      </header>

      {/* Content with swipe gestures */}
      <main
        ref={contentRef}
        className="max-w-lg mx-auto px-4 py-4 sm:py-6 sm:pb-6 touch-pan-y pb-[calc(4.25rem+env(safe-area-inset-bottom))]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Draft restoration banner */}
        {showDraftBanner && (
          <Suspense fallback={null}>
            <DraftRestorationBanner
              serviceName={serviceName}
              onRestore={handleRestoreDraft}
              onDiscard={handleDiscardDraft}
            />
          </Suspense>
        )}

        {/* Consult subtype mismatch banner */}
        {showSubtypeMismatch && draftSubtype && initialSubtype && (
          <Suspense fallback={null}>
            <SubtypeMismatchBanner
              draftSubtype={draftSubtype}
              urlSubtype={initialSubtype}
              onResumeDraft={handleResumeDraft}
              onStartFresh={handleStartFreshSubtype}
            />
          </Suspense>
        )}

        {/* Step content */}
        <div key={currentStepId}>
          <StepRouter
            serviceType={effectiveService}
            currentStepId={currentStepId}
            componentPath={currentStep.componentPath}
            nextComponentPath={activeSteps[currentStepIndex + 1]?.componentPath}
            initialDuration={initialDuration}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        </div>
      </main>

      {/* Mirror the current step action on mobile, including review+pay. Safety
          terminal states intentionally expose no primary action, so the bar
          disappears with the in-step button instead of showing a stale CTA. */}
      {mobilePrimaryAction.available && (
        <div
          data-intake-mobile-action-bar="true"
          className="fixed inset-x-0 z-40 bg-background/95 backdrop-blur border-t px-4 pt-2.5 pb-3 sm:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--keyboard-offset, 0px))" }}
        >
          <div className={`max-w-lg mx-auto grid items-center gap-3 ${
            currentStepIndex > 0 ? "grid-cols-[3rem_minmax(0,1fr)]" : "grid-cols-1"
          }`}>
            {currentStepIndex > 0 && (
              <RequestButton
                variant="outline"
                size="icon"
                onClick={handleBack}
                className="h-12 w-12"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </RequestButton>
            )}
            <RequestButton
              variant={mobileActionReady ? "default" : "secondary"}
              size="lg"
              onClick={handleMobilePrimaryAction}
              disabled={!mobileActionClickable}
              data-intake-mobile-action-ready={mobileActionReady ? "true" : "false"}
              className={requestCx(
                "h-12 min-w-0 gap-2 text-base font-medium transition-[transform,box-shadow,background-color,opacity] duration-200 ease-out active:scale-[0.98]",
                mobileActionReady && "shadow-md shadow-primary/20",
                !mobileActionReady && "shadow-none",
              )}
            >
              {showMobileSavedCue && (
                <span aria-hidden="true" className="flex shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
              <span className="truncate">{mobilePrimaryAction.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </RequestButton>
          </div>
        </div>
      )}
    </div>
  )
}
