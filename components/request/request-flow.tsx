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
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AutoSaveIndicator } from "@/components/request/auto-save-indicator"
import { DraftRestorationBanner } from "@/components/request/draft-restoration-banner"
import { ProgressBar } from "@/components/request/progress-bar"
import { RequestButton } from "@/components/request/request-button"
import { requestCx } from "@/components/request/request-cx"
import { SubtypeMismatchBanner } from "@/components/request/subtype-mismatch-banner"
import { TimeRemaining } from "@/components/request/time-remaining"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { isValidCertCategory, isValidCertDuration } from "@/lib/marketing/med-cert-selector"
import {
  type ConsultSubtype,
  getStepDefinitionById,
  getStepsForService,
  isConsultSubtypeAvailable,
  type StepContext,
  type UnifiedServiceType,
  type UnifiedStepId,
} from "@/lib/request/step-registry"
import { type SafetyEvaluationResult } from "@/lib/safety/types"

import { FlowErrorScreen } from "./flow-error-screen"
import { useFlowAnalytics } from "./hooks/use-flow-analytics"
import { useFlowNavigation } from "./hooks/use-flow-navigation"
import { useSwipeNavigation } from "./hooks/use-swipe-navigation"
import { useUnsavedChanges } from "./hooks/use-unsaved-changes"
import { StepRouter } from "./step-router"
import { useRequestStore } from "./store"


interface HealthProfilePrefill {
  allergies?: string[]
  conditions?: string[]
  current_medications?: string[]
}

interface MobilePrimaryActionState {
  available: boolean
  disabled: boolean
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

type ConnectionBannerComponent = ComponentType

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

function LazyConnectionBanner() {
  const [ConnectionBanner, setConnectionBanner] = useState<ConnectionBannerComponent | null>(null)

  useEffect(() => {
    let mounted = true
    const load = () => {
      import("./connection-banner")
        .then((mod) => {
          if (mounted) setConnectionBanner(() => mod.ConnectionBanner)
        })
        .catch(() => {})
    }

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(load, { timeout: 1200 })
      return () => {
        mounted = false
        cancelIdleCallback(id)
      }
    }

    const id = setTimeout(load, 0)
    return () => {
      mounted = false
      clearTimeout(id)
    }
  }, [])

  if (!ConnectionBanner) return null
  return <ConnectionBanner />
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

  useEffect(() => {
    if (!safetyBlock || DialogComponent) return

    let mounted = true
    import("./safety-block-dialog")
      .then((mod) => {
        if (mounted) setDialogComponent(() => mod.SafetyBlockDialog)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [DialogComponent, safetyBlock])

  if (!safetyBlock || !DialogComponent) return null
  return (
    <DialogComponent
      safetyBlock={safetyBlock}
      onDismiss={onDismiss}
      onReturnHome={onReturnHome}
      onContactUs={onContactUs}
    />
  )
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

interface RequestFlowProps {
  /** Service from URL param. null = invalid param was provided */
  initialService: UnifiedServiceType | null
  /** Raw service param from URL (for error messages) */
  rawServiceParam?: string
  /** Canonical consult subtype from URL, already normalized by app/request/page.tsx */
  initialSubtype?: string
  /** Certificate type from URL (pre-seeded from landing page selector) */
  initialCertType?: string
  /** Certificate duration from URL (pre-seeded from landing page selector) */
  initialDuration?: string
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
  initialCertType,
  initialDuration,
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
  const [safetyBlock, setSafetyBlock] = useState<SafetyEvaluationResult | null>(null)
  const [mobilePrimaryAction, setMobilePrimaryAction] = useState<MobilePrimaryActionState>({
    available: false,
    disabled: true,
    label: "Continue",
  })
  const contentRef = useRef<HTMLDivElement>(null)
  
  const {
    serviceType,
    currentStepId,
    setServiceType,
    prevStep,
    goToStep,
    answers,
    phone,
    setAnswer,
    setIdentity,
    setAuthContext,
    lastSavedAt,
  } = useRequestStore()
  
  // Rehydrate persisted store after mount (SSR-safe pattern).
  // The store uses skipHydration:true to avoid a server/client mismatch on first render.
  useEffect(() => {
    useRequestStore.persist.rehydrate()
  }, [])

  // Initialize auth context in store for step navigation
  useEffect(() => {
    setAuthContext({ isAuthenticated, hasProfile, hasCompleteIdentity: hasCompleteIdentity ?? hasProfile, hasMedicare, hasAddress, hasPhone, hasSex })
  }, [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, hasSex, setAuthContext])

  // Pre-fill identity from auth if available
  useEffect(() => {
    if (userEmail && !answers.email) {
      setIdentity({ email: userEmail })
    }
    if (userName) {
      const [firstName, ...lastParts] = userName.split(' ')
      setIdentity({ 
        firstName: firstName || '',
        lastName: lastParts.join(' ') || '',
      })
    }
    if (userPhone && !phone) {
      setIdentity({ phone: userPhone })
    }
    if (profileDateOfBirth) {
      setIdentity({ dob: profileDateOfBirth })
    }
    // Pre-fill Medicare from profile
    if (profileMedicare && !answers.medicareNumber) {
      setAnswer('medicareNumber', profileMedicare)
    }
    if (profileMedicareIrn && !answers.medicareIrn) {
      setAnswer('medicareIrn', String(profileMedicareIrn))
    }
    if (profileIhi && !answers.ihiNumber) {
      setAnswer('ihiNumber', profileIhi)
    }
    if (profileSex && !answers.sex) {
      setAnswer('sex', profileSex)
    }
    // Pre-fill address from profile
    if (profileAddress && !answers.addressLine1) {
      setAnswer('addressLine1', profileAddress.addressLine1)
      setAnswer('suburb', profileAddress.suburb)
      setAnswer('state', profileAddress.state)
      setAnswer('postcode', profileAddress.postcode)
    }
  }, [userEmail, userName, userPhone, profileDateOfBirth, profileMedicare, profileMedicareIrn, profileIhi, profileSex, profileAddress, answers.email, answers.medicareNumber, answers.medicareIrn, answers.ihiNumber, answers.sex, answers.addressLine1, phone, setIdentity, setAnswer])

  // Pre-fill medical history from health profile
  useEffect(() => {
    if (!healthProfile) return
    // Only pre-fill if the fields haven't been filled yet
    if (healthProfile.allergies?.length && !answers.known_allergies) {
      setAnswer('known_allergies', healthProfile.allergies.join(', '))
      setAnswer('has_allergies', 'yes')
    }
    if (healthProfile.conditions?.length && !answers.existing_conditions) {
      setAnswer('existing_conditions', healthProfile.conditions.join(', '))
      setAnswer('has_conditions', 'yes')
    }
    if (healthProfile.current_medications?.length && !answers.current_medications) {
      setAnswer('current_medications', healthProfile.current_medications.join(', '))
      setAnswer('takes_medications', 'yes')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthProfile])

  // Initialize service type from URL param
  // IMPORTANT: URL param is the source of truth for which service to show
  // We do NOT reset other service drafts - they are preserved in service-scoped storage
  useEffect(() => {
    if (initialService && serviceType !== initialService) {
      // Set the service type to match URL - drafts for THIS service will be loaded
      // from service-scoped storage. Other service drafts remain untouched.
      setServiceType(initialService)
    }
  }, [initialService, serviceType, setServiceType])

  // Apply URL context params for consult handoff (survives refresh)
  // Also detect subtype mismatch between draft and URL
  useEffect(() => {
    if (initialService === 'consult' && initialSubtype) {
      const storedSubtype = answers.consultSubtype as string | undefined
      
      // Check for subtype mismatch - draft has different subtype than URL
      if (storedSubtype && storedSubtype !== initialSubtype && lastSavedAt) {
        // Show mismatch banner instead of silently overwriting
        setDraftSubtype(storedSubtype)
        setShowSubtypeMismatch(true)
        return // Don't auto-apply URL subtype - let user decide
      }
      
      // No mismatch or no existing draft - apply URL subtype
      setAnswer('consultSubtype', initialSubtype)
      
    }
  // Only run on mount - URL params are the source of truth
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Block Coming Soon subtypes - redirect to landing page
  useEffect(() => {
    if (initialService === 'consult' && initialSubtype) {
      if (!isConsultSubtypeAvailable(initialSubtype as ConsultSubtype)) {
        const redirectMap: Record<string, string> = {
          womens_health: '/request',
          weight_loss: '/weight-loss',
        }
        router.replace(redirectMap[initialSubtype] || '/')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-seed cert type from URL param (from landing page selector)
  useEffect(() => {
    if (initialService === 'med-cert' && initialCertType && !answers.certType) {
      if (isValidCertCategory(initialCertType)) {
        setAnswer('certType', initialCertType)
      }
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-seed certificate duration from URL param when a landing CTA displays
  // a specific price. Direct /request entries still keep the flow default.
  useEffect(() => {
    if (initialService === 'med-cert' && initialDuration && !answers.duration) {
      if (isValidCertDuration(initialDuration)) {
        setAnswer('duration', initialDuration)
      }
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dev sanity check: trace service routing on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      posthog?.capture('$debug_request_flow_mount', {
        initialService,
        rawServiceParam,
        storeServiceType: serviceType,
        currentStepId,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check for existing draft on mount
  useEffect(() => {
    if (lastSavedAt && serviceType) {
      const savedTime = new Date(lastSavedAt).getTime()
      const now = Date.now()
      const hoursSinceSave = (now - savedTime) / (1000 * 60 * 60)
      
      // Show banner if draft is less than 24 hours old
      if (hoursSinceSave < 24 && currentStepId !== 'review') {
        setShowDraftBanner(true)
      }
    }
  }, [lastSavedAt, serviceType, currentStepId])

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

  // Find current step index - default to first step if current step not found
  const currentStepIndex = useMemo(() => {
    const index = activeSteps.findIndex(s => s.id === currentStepId)
    return index >= 0 ? index : 0
  }, [activeSteps, currentStepId])

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
    if (currentStepId === 'checkout') {
      setMobilePrimaryAction({
        available: false,
        disabled: true,
        label: "Continue",
      })
      return
    }

    const syncPrimaryAction = () => {
      const action = getMobilePrimaryAction()
      setMobilePrimaryAction({
        available: Boolean(action),
        disabled: action ? action.disabled : true,
        label: getPrimaryActionLabel(action),
      })
    }

    syncPrimaryAction()

    // Performance: this observer is the single biggest contributor to
    // the /request route's mobile Lighthouse Total Blocking Time. PR #63
    // scoped it to mobile-only + the step content container (was over
    // budget at 301ms vs 200ms target, came down to 282ms). The mobile
    // primary-action bar only renders on viewports below sm: (640px),
    // and only the step content's primary action button needs to be
    // tracked — not the whole document.
    //
    // Three scoping reductions:
    //   1. Skip the observer entirely on desktop where the bar doesn't
    //      render. Saves the whole DOM-watch on the majority of
    //      sessions.
    //   2. On mobile, narrow the target from document.body to the
    //      step content container (contentRef). Cuts the surface area
    //      that fires the callback by orders of magnitude — framer-
    //      motion frames in the sticky CTA, nav button hover states,
    //      Sentry/PostHog DOM injections etc. no longer trigger
    //      syncPrimaryAction.
    //   3. Drop `characterData: true`. The button's label is driven by
    //      the `data-intake-primary-label` attribute (already in
    //      attributeFilter), not by textContent — so every form-field
    //      validation message change, every framer-motion text
    //      interpolation, and every inline-input keystroke was firing
    //      a no-op syncPrimaryAction. Pure overhead.
    const isMobileViewport =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 640px)").matches
    if (!isMobileViewport) {
      return
    }

    const observerTarget = contentRef.current ?? document.body
    const observer = new MutationObserver(syncPrimaryAction)
    observer.observe(observerTarget, {
      attributes: true,
      attributeFilter: ["disabled", "data-intake-primary-label"],
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [currentStepId])

  // Scroll to top on step change (2026-06-11 a11y/UX review): a user who
  // scrolled deep into a long step (e.g. medical history) otherwise lands
  // mid-page on the next step. Skips the first mount so resuming a saved flow
  // doesn't yank the page; respects prefers-reduced-motion.
  const stepScrollInitialized = useRef(false)
  useEffect(() => {
    if (!stepScrollInitialized.current) {
      stepScrollInitialized.current = true
      return
    }
    if (typeof window === "undefined") return
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" })
  }, [currentStepId])

  const handleMobilePrimaryAction = useCallback(() => {
    getMobilePrimaryAction()?.click()
  }, [])

  const mobileActionReady = mobilePrimaryAction.available && !mobilePrimaryAction.disabled
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

  // No service param provided - show service hub
  if (initialService === null && !rawServiceParam) {
    return <LazyServiceHub onSelectService={handleSelectService} />
  }

  // Consult without subtype → redirect to service hub (no general consult)
  // Active subtypes: ed, hair_loss. Coming soon: womens_health, weight_loss.
  if (initialService === 'consult' && !initialSubtype) {
    return <LazyServiceHub onSelectService={handleSelectService} />
  }

  // Invalid service param provided - show error screen
  if (initialService === null && rawServiceParam) {
    return <FlowErrorScreen invalidService={rawServiceParam} />
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
    <div className="min-h-screen bg-background">
      {/* Connection status banner */}
      <LazyConnectionBanner />

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
            className="h-11 w-11 sm:h-10 sm:w-10"
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
            className="h-11 w-11 sm:h-10 sm:w-10"
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
            onStepClick={handleStepClick}
          />
        </div>
      </header>

      {/* Content with swipe gestures */}
      <main
        ref={contentRef}
        className={`max-w-lg mx-auto px-4 py-4 sm:py-6 sm:pb-6 touch-pan-y ${
          currentStepId === 'checkout' ? 'pb-6' : 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Draft restoration banner */}
        {showDraftBanner && (
          <DraftRestorationBanner
            serviceName={serviceName}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Consult subtype mismatch banner */}
        {showSubtypeMismatch && draftSubtype && initialSubtype && (
          <SubtypeMismatchBanner
            draftSubtype={draftSubtype}
            urlSubtype={initialSubtype}
            onResumeDraft={handleResumeDraft}
            onStartFresh={handleStartFreshSubtype}
          />
        )}

        {/* Step content */}
        <div key={currentStepId}>
          <StepRouter
            serviceType={effectiveService}
            currentStepId={currentStepId}
            componentPath={currentStep.componentPath}
            initialDuration={initialDuration}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        </div>
      </main>

      {/* Sticky bottom CTA bar for mobile */}
      {currentStepId !== 'checkout' && (
        <div
          data-intake-mobile-action-bar="true"
          className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
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
              size="lg"
              onClick={handleMobilePrimaryAction}
              disabled={!mobileActionReady}
              data-intake-mobile-action-ready={mobileActionReady ? "true" : "false"}
              className={requestCx(
                "h-12 min-w-0 gap-2 text-base font-medium transition-[transform,box-shadow,background-color,opacity] duration-200 ease-out active:scale-[0.98]",
                mobileActionReady && "shadow-md shadow-primary/20",
                !mobileActionReady && "shadow-none opacity-70",
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
