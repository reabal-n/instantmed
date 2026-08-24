"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle, ChevronDown, Clipboard, ExternalLink, Loader2, RefreshCw, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { getPatientParchmentPrescribeUrlAction } from "@/app/actions/manual-patient"
import { resolveGenericMedicationNameAction } from "@/app/actions/medication-reference"
import { getParchmentPrescribeUrlAction } from "@/app/actions/parchment"
import type { ReloadReviewData } from "@/components/doctor/review/intake-review-context"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { computeKeyboardInset, type KeyboardInset } from "@/lib/browser/keyboard-inset"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import type { ParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"
import { backdropVariants, sheetVariants } from "@/lib/motion/panel-variants"
import { canEmbedParchmentForHost } from "@/lib/parchment/embed-policy"
import { cn } from "@/lib/utils"

type ParchmentPrescribePanelProps = {
  patientName: string
  patientProfileHref?: string
  prescriptionContext?: ParchmentPrescriptionContext | null
  onIntakeRefresh?: ReloadReviewData
  onClose?: () => void
  onScriptSent?: () => void
  onPrescriptionsRefresh?: () => void
  prescriptionsRefreshPending?: boolean
} & (
  | { intakeId: string; patientId?: never }
  | { patientId: string; intakeId?: never }
)

const PARCHMENT_IFRAME_SLOW_LOAD_MS = 8000

type GenericReferenceState =
  | { status: "idle" | "resolving" | "unresolved" }
  | {
      status: "resolved"
      genericName: string
      source: "request" | "previous_prescription"
      matchKind?: "exact" | "likely_typo"
    }

function getParchmentErrorCopy(error: string | null): { title: string; detail: string } {
  if (!error) {
    return {
      title: "Unable to load Parchment",
      detail: "Try again or open Parchment in a new tab.",
    }
  }

  if (error.startsWith("Missing prescribing details:")) {
    return {
      title: "Patient details incomplete",
      detail: `${error}. Edit the patient details, correct the listed fields, then retry.`,
    }
  }

  if (error.startsWith("Parchment's identity verification service failed")) {
    return {
      title: "Parchment identity service unavailable",
      detail: "Your InstantMed details are already saved. Retry later or open the linked patient directly in Parchment.",
    }
  }

  if (error.startsWith("Parchment is temporarily unavailable")) {
    return {
      title: "Parchment temporarily unavailable",
      detail: "Your InstantMed details are already saved. Retry later.",
    }
  }

  if (error.startsWith("Parchment rejected the patient details")) {
    return {
      title: "Parchment rejected patient details",
      detail: error,
    }
  }

  if (error.startsWith("Parchment integration validation failed")) {
    return {
      title: "Parchment account needs attention",
      detail: error,
    }
  }

  return {
    title: "Unable to load Parchment",
    detail: error,
  }
}

function canFixParchmentErrorFromPatientProfile(error: string | null): boolean {
  return Boolean(
    error?.startsWith("Missing prescribing details:") ||
    error?.startsWith("Parchment rejected the patient details"),
  )
}

/**
 * Embedded Parchment prescribing panel.
 *
 * Renders as a full-height sheet panel with its own overlay.
 * Loads the Parchment prescribing UI in an iframe via SSO.
 * The doctor writes the script directly inside InstantMed.
 * When complete, the Parchment webhook auto-marks the script sent.
 */
export function ParchmentPrescribePanel({
  intakeId,
  patientId,
  patientName,
  patientProfileHref,
  prescriptionContext,
  onIntakeRefresh,
  onClose,
  onScriptSent,
  onPrescriptionsRefresh,
  prescriptionsRefreshPending = false,
}: ParchmentPrescribePanelProps) {
  const { closePanel } = usePanel()
  const prefersReducedMotion = useReducedMotion()
  const [ssoUrl, setSsoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeSlowToLoad, setIframeSlowToLoad] = useState(false)
  const [canUseIframe, setCanUseIframe] = useState(true)
  const [keyboardInset, setKeyboardInset] = useState<KeyboardInset | null>(null)
  const [genericReference, setGenericReference] = useState<GenericReferenceState>({ status: "idle" })
  const errorCopy = getParchmentErrorCopy(error)
  const patientDetailsHref = patientProfileHref || (patientId ? buildStaffPatientHref(patientId) : null)
  const canEditPatientDetails = Boolean(patientDetailsHref && canFixParchmentErrorFromPatientProfile(error))
  const verifiedGenericName = prescriptionContext?.copyText || (
    genericReference.status === "resolved" ? genericReference.genericName : ""
  )
  const requestedNameCopyText = prescriptionContext?.requestedNameCopyText?.trim() || ""
  const copyableMedicationName = verifiedGenericName || requestedNameCopyText
  const patientRequestEntry = prescriptionContext?.medicationLabel?.trim() || ""
  const shouldShowPatientRequestEntry = Boolean(
    copyableMedicationName &&
    patientRequestEntry &&
    patientRequestEntry.localeCompare(copyableMedicationName, "en-AU", { sensitivity: "base" }) !== 0,
  )
  const matchedFromPreviousPrescription = genericReference.status === "resolved"
    && genericReference.source === "previous_prescription"
  const medicationMatchMessage = matchedFromPreviousPrescription
    ? genericReference.matchKind === "likely_typo"
      ? "Likely match from a previous prescription · confirm in Parchment"
      : "Matched from a previous prescription · confirm in Parchment"
    : genericReference.status === "resolving"
      ? "Checking the request and previous prescriptions…"
      : genericReference.status === "unresolved"
        ? requestedNameCopyText
          ? "Patient-entered name · confirm the match in Parchment"
          : "No verified match · search manually in Parchment"
        : null
  const displayedMedicationName = copyableMedicationName
    || patientRequestEntry
    || prescriptionContext?.presetLabel
    || "Medicine not recorded"
  const requestFrequency = prescriptionContext?.regimenSource === "patient_reported"
    ? prescriptionContext.patientReportedFrequency || null
    : null
  const directionsContext = prescriptionContext?.regimenSource === "template"
    ? prescriptionContext.directionsTemplate
    : null
  const hasAdditionalRequestDetails = Boolean(
    shouldShowPatientRequestEntry || prescriptionContext?.patientReportedDose || directionsContext,
  )

  useEffect(() => {
    const searchValue = prescriptionContext?.searchHint || prescriptionContext?.medicationLabel
    if (
      prescriptionContext?.copyText ||
      prescriptionContext?.regimenSource !== "patient_reported" ||
      !searchValue
    ) {
      setGenericReference({ status: "idle" })
      return
    }

    let active = true
    setGenericReference({ status: "resolving" })
    void resolveGenericMedicationNameAction(searchValue, intakeId)
      .then((result) => {
        if (!active) return
        if (result.success && result.data?.status === "resolved" && result.data.genericName) {
          setGenericReference({
            status: "resolved",
            genericName: result.data.genericName,
            source: result.data.source === "previous_prescription"
              ? "previous_prescription"
              : "request",
            matchKind: result.data.matchKind,
          })
          return
        }
        setGenericReference({ status: "unresolved" })
      })
      .catch(() => {
        if (active) setGenericReference({ status: "unresolved" })
      })

    return () => {
      active = false
    }
  }, [
    prescriptionContext?.copyText,
    prescriptionContext?.medicationLabel,
    prescriptionContext?.regimenSource,
    prescriptionContext?.searchHint,
    intakeId,
  ])

  const closeAndRefresh = useCallback(() => {
    if (intakeId) {
      void onIntakeRefresh?.({ background: true })
    }
    if (patientId && iframeLoaded && onPrescriptionsRefresh) {
      onPrescriptionsRefresh()
    }
    if (onClose) onClose()
    else closePanel()
  }, [closePanel, iframeLoaded, intakeId, onClose, onIntakeRefresh, onPrescriptionsRefresh, patientId])

  const loadFreshParchmentUrl = useCallback(async (): Promise<{ success: boolean; error?: string; ssoUrl?: string }> => {
    if (intakeId) return getParchmentPrescribeUrlAction(intakeId)
    if (patientId) return getPatientParchmentPrescribeUrlAction(patientId)
    return { success: false, error: "Missing patient context" }
  }, [intakeId, patientId])

  const openInNewTab = useCallback(async () => {
    const freshResult = await loadFreshParchmentUrl()
    if (freshResult.success && freshResult.ssoUrl) {
      window.open(freshResult.ssoUrl, "_blank", "noopener,noreferrer")
    } else {
      toast.error(freshResult.error || "Failed to generate new Parchment session")
    }
  }, [loadFreshParchmentUrl])

  const copyMedicationSearchName = useCallback(async () => {
    if (!copyableMedicationName) return
    try {
      await navigator.clipboard.writeText(copyableMedicationName)
      toast.success("Copied medicine name")
    } catch {
      toast.error("Could not copy medicine name")
    }
  }, [copyableMedicationName])

  const copyPatientReportedFrequency = useCallback(async () => {
    const patientReportedFrequency = prescriptionContext?.patientReportedFrequency?.trim()
    if (!patientReportedFrequency) return
    try {
      await navigator.clipboard.writeText(patientReportedFrequency)
      toast.success("Copied frequency")
    } catch {
      toast.error("Could not copy frequency")
    }
  }, [prescriptionContext?.patientReportedFrequency])

  const loadPrescribingUrl = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await loadFreshParchmentUrl()

    if (result.success && result.ssoUrl) {
      setSsoUrl(result.ssoUrl)
      setIframeLoaded(false)
      setIframeSlowToLoad(false)
    } else {
      setError(result.error || "Failed to load prescribing portal")
      toast.error(result.error || "Failed to load Parchment")
    }

    setLoading(false)
  }, [loadFreshParchmentUrl])

  // Mint one fresh SSO attempt when the panel opens. Once Parchment establishes
  // its session, never replace an in-progress prescription on a timer. Doctors
  // can explicitly retry or open a newly minted session in another tab.
  useEffect(() => {
    void loadPrescribingUrl()
  }, [loadPrescribingUrl])

  useEffect(() => {
    setCanUseIframe(canEmbedParchmentForHost(window.location.hostname))
  }, [])

  useEffect(() => {
    if (!ssoUrl || iframeLoaded || error || !canUseIframe) {
      setIframeSlowToLoad(false)
      return
    }

    const slowLoadTimer = setTimeout(() => {
      setIframeSlowToLoad(true)
    }, PARCHMENT_IFRAME_SLOW_LOAD_MS)

    return () => clearTimeout(slowLoadTimer)
  }, [canUseIframe, error, iframeLoaded, ssoUrl])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [])

  // Keep the sheet inside the visible viewport while the soft keyboard is up.
  // iOS Safari never shrinks the layout viewport (or 100dvh) for the keyboard,
  // so without this the bottom ~40% of the Parchment iframe — exactly where the
  // medicine search results render — sits underneath the keyboard with body
  // scroll locked and no way to reach it. Typing inside the cross-origin
  // iframe still resizes the top-level visualViewport, so the parent can track
  // it. Same rAF-throttled listener shape as the intake flow's
  // --keyboard-offset handling (components/request/request-flow.tsx).
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return

    const { visualViewport } = window
    let frameId: number | null = null

    const updateInset = () => {
      setKeyboardInset(
        computeKeyboardInset({
          innerHeight: window.innerHeight,
          offsetTop: visualViewport.offsetTop,
          height: visualViewport.height,
          scale: visualViewport.scale,
        }),
      )
    }

    const scheduleInsetUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateInset()
      })
    }

    scheduleInsetUpdate()
    visualViewport.addEventListener("resize", scheduleInsetUpdate)
    visualViewport.addEventListener("scroll", scheduleInsetUpdate)
    window.addEventListener("orientationchange", scheduleInsetUpdate)

    return () => {
      visualViewport.removeEventListener("resize", scheduleInsetUpdate)
      visualViewport.removeEventListener("scroll", scheduleInsetUpdate)
      window.removeEventListener("orientationchange", scheduleInsetUpdate)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndRefresh()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [closeAndRefresh])

  return (
    <div
      className="fixed inset-0 z-50"
      // While the keyboard is up, pin the overlay to the visible band above it.
      // Inline style only — with the keyboard closed the classes own layout.
      style={
        keyboardInset
          ? { top: keyboardInset.top, height: keyboardInset.height, bottom: "auto" }
          : undefined
      }
    >
      {/* Backdrop */}
      <motion.div
        variants={backdropVariants}
        initial={prefersReducedMotion ? {} : "hidden"}
        animate="visible"
        exit="hidden"
        className="absolute inset-0 bg-foreground/40"
        onClick={closeAndRefresh}
        aria-hidden="true"
      />

      {/* Sheet — §12 panel exception (drawers/sheets allowed) */}
      <motion.div
        variants={sheetVariants("right")}
        initial={prefersReducedMotion ? {} : "hidden"}
        animate="visible"
        exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
        className="absolute inset-0 flex h-[100dvh] w-full flex-col bg-background shadow-2xl shadow-primary/[0.12] sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(800px,100vw)]"
        // Beat the h-[100dvh] class while the keyboard is up so the iframe
        // (flex-1) shrinks to the reachable region and Parchment's own
        // scrolling works above the keyboard. sheetVariants only animates x,
        // so an inline height never fights the enter/exit motion.
        style={keyboardInset ? { height: keyboardInset.height } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parchment-sheet-title"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <h2 id="parchment-sheet-title" className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">
              Prescribe for {patientName}
            </h2>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {ssoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 px-0 text-xs text-muted-foreground sm:h-9 sm:w-auto sm:px-3"
                  onClick={openInNewTab}
                  aria-label="Open Parchment in a new tab"
                >
                  <ExternalLink className="h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Open in new tab</span>
                </Button>
              )}
              <button
                onClick={closeAndRefresh}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Close panel"
                type="button"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          {prescriptionContext && (
            <div
              className={cn(
                "mt-2 border-t border-border/60 pt-2",
                keyboardInset && "hidden",
              )}
              data-parchment-medication-context="compact"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Medicine to search</p>
                  <p className="select-text break-words text-sm font-semibold leading-5 text-foreground">
                    {displayedMedicationName}
                  </p>
                  {medicationMatchMessage ? (
                    <p
                      aria-live="polite"
                      className={cn(
                        "mt-0.5 text-xs",
                        genericReference.status === "unresolved"
                          ? "font-medium text-warning"
                          : "text-muted-foreground",
                      )}
                    >
                      {medicationMatchMessage}
                    </p>
                  ) : null}
                </div>
                {copyableMedicationName ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0 px-2.5 sm:min-h-9"
                    onClick={copyMedicationSearchName}
                    aria-label={verifiedGenericName
                      ? "Copy verified generic medicine name"
                      : "Copy patient-entered medicine name"}
                  >
                    <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                    Copy name
                  </Button>
                ) : null}
              </div>
              {requestFrequency ? (
                <div className="mt-2 flex flex-col items-start gap-2 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Frequency</p>
                    <p className="select-text break-words text-sm leading-5 text-foreground">
                      {requestFrequency}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0 px-2.5 sm:min-h-9"
                    onClick={copyPatientReportedFrequency}
                    aria-label="Copy patient-reported frequency"
                  >
                    <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                    Copy frequency
                  </Button>
                </div>
              ) : null}
              {hasAdditionalRequestDetails ? (
                <details className="group mt-1.5 text-xs text-muted-foreground">
                  <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-sm pr-2 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-9 [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                    <span>Request details</span>
                  </summary>
                  <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                    {shouldShowPatientRequestEntry ? (
                      <p className="break-words">
                        <span className="font-medium text-foreground">Patient entered:</span>{" "}
                        {patientRequestEntry}
                      </p>
                    ) : null}
                    {prescriptionContext.patientReportedDose ? (
                      <p className="break-words">
                        <span className="font-medium text-foreground">Current dose:</span>{" "}
                        {prescriptionContext.patientReportedDose}
                      </p>
                    ) : null}
                    {directionsContext ? (
                      <p className="break-words">
                        <span className="font-medium text-foreground">Directions context:</span>{" "}
                        {directionsContext}
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>

        {/* Content - iframe fills remaining space */}
        <div className="flex-1 min-h-0 relative">
          {/* Loading state */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading prescribing portal...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center space-y-4 max-w-sm px-6">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">{errorCopy.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{errorCopy.detail}</p>
                </div>
                <div className="flex gap-2 justify-center">
                  {canEditPatientDetails && patientDetailsHref ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={patientDetailsHref}>Edit patient details</Link>
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={loadPrescribingUrl}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Iframe */}
          {ssoUrl && (
            <>
              {canUseIframe ? (
                <>
                  {/* Overlay fades out instead of snapping away — prevents the
                      white-flash that happens when onLoad fires before Parchment's
                      React app has painted its first frame. opacity-0 + pointer-
                      events-none keeps it inert after the fade completes. */}
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center bg-background z-10 transition-opacity duration-300",
                      iframeLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
                    )}
                    aria-live="polite"
                  >
                    <div className="max-w-sm px-6 text-center space-y-3">
                      {!iframeLoaded && <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}
                      {iframeSlowToLoad ? (
                        <>
                          <p className="text-sm font-medium text-foreground">Parchment is taking a little longer</p>
                          <p className="text-sm text-muted-foreground">
                            {copyableMedicationName
                              ? "Keep waiting, open a new tab, or copy the medicine name and continue there."
                              : "Keep waiting or open Parchment in a new tab."}
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={loadPrescribingUrl}>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              Retry session
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={openInNewTab}>
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Open in new tab
                            </Button>
                            {copyableMedicationName && (
                              <Button type="button" variant="ghost" size="sm" onClick={copyMedicationSearchName}>
                                <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                                Copy name
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading Parchment...</p>
                      )}
                    </div>
                  </div>
                  <iframe
                    src={ssoUrl}
                    className={cn(
                      "w-full h-full border-0 transition-opacity duration-300",
                      iframeLoaded ? "opacity-100" : "opacity-0",
                    )}
                    onLoad={() => {
                      // Delay reveal so Parchment's React app finishes painting
                      // before the loading overlay fades out. onLoad fires on
                      // document-ready, not first-paint — without this delay the
                      // overlay snaps away to a white iframe for ~1s.
                      setTimeout(() => setIframeLoaded(true), 600)
                    }}
                    // Parchment's documented print/PDF flow opens a new tab. Permit
                    // that child context without allowing the frame to navigate this
                    // prescribing page or download files directly.
                    sandbox="allow-scripts allow-same-origin allow-forms allow-storage-access-by-user-activation allow-popups allow-popups-to-escape-sandbox"
                    allow="clipboard-write; publickey-credentials-get *; publickey-credentials-create *"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="Parchment Prescribing"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
                  <div className="text-center space-y-4 max-w-md px-6">
                    <ExternalLink className="h-10 w-10 text-primary mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Open Parchment in a new tab</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This host is not enabled for embedded prescribing.
                        The secure SSO session still works in a separate tab.
                      </p>
                    </div>
                    <Button size="sm" onClick={openInNewTab}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Parchment
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - manual fallback. Hidden while the keyboard is up: every
            visible point belongs to the iframe then, and the safe-area pad is
            meaningless above a keyboard. */}
        <div
          className={cn(
            "shrink-0 border-t border-border/50 bg-muted/30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3",
            keyboardInset && "hidden",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                {intakeId
                  ? "Confirmation unlocks Complete request automatically"
                  : "Prescription will sync back to the PMS via Parchment webhook"}
              </span>
            </div>
            {onScriptSent && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 self-start text-xs text-muted-foreground hover:text-foreground sm:min-h-9 sm:self-auto"
                onClick={onScriptSent}
                title="Use when the script was sent through a different channel and Parchment won't notify us"
              >
                Sent outside Parchment
              </Button>
            )}
            {patientId && onPrescriptionsRefresh && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 self-start text-xs sm:min-h-9 sm:self-auto"
                disabled={prescriptionsRefreshPending}
                onClick={onPrescriptionsRefresh}
              >
                {prescriptionsRefreshPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh prescriptions
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
