"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle, Clipboard, ExternalLink, Loader2, RefreshCw, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getPatientParchmentPrescribeUrlAction } from "@/app/actions/manual-patient"
import { getParchmentPrescribeUrlAction } from "@/app/actions/parchment"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import type { ParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"
import { backdropVariants, sheetVariants } from "@/lib/motion/panel-variants"
import { canEmbedParchmentForHost } from "@/lib/parchment/embed-policy"
import { cn } from "@/lib/utils"

type ParchmentPrescribePanelProps = {
  patientName: string
  patientProfileHref?: string
  prescriptionContext?: ParchmentPrescriptionContext | null
  onIntakeRefresh?: () => void
  onScriptSent?: () => void
  onPrescriptionsRefresh?: () => void
  prescriptionsRefreshPending?: boolean
} & (
  | { intakeId: string; patientId?: never }
  | { patientId: string; intakeId?: never }
)

const PARCHMENT_IFRAME_SLOW_LOAD_MS = 8000

function getCopiedMedicineLabel(context: ParchmentPrescriptionContext | null | undefined): string {
  return context?.medicationLabel || context?.presetLabel || "medicine"
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
      title: "Prescribing identity incomplete",
      detail: `${error}. Edit the patient details, collect a valid Medicare number or IHI, then retry.`,
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
  const [iframeReloadKey, setIframeReloadKey] = useState(0)
  const [canUseIframe, setCanUseIframe] = useState(true)
  const [sessionRefreshing, setSessionRefreshing] = useState(false)
  const ssoExpiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ssoWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorCopy = getParchmentErrorCopy(error)
  const patientDetailsHref = patientProfileHref || (patientId ? buildStaffPatientHref(patientId) : null)
  const canEditPatientDetails = Boolean(patientDetailsHref && canFixParchmentErrorFromPatientProfile(error))

  const closeAndRefresh = useCallback(() => {
    if (intakeId) {
      onIntakeRefresh?.()
    }
    if (patientId && iframeLoaded && onPrescriptionsRefresh) {
      onPrescriptionsRefresh()
    }
    closePanel()
  }, [closePanel, iframeLoaded, intakeId, onIntakeRefresh, onPrescriptionsRefresh, patientId])

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

  const copyPrescriptionContext = useCallback(async () => {
    if (!prescriptionContext?.copyText) return
    try {
      await navigator.clipboard.writeText(prescriptionContext.copyText)
      toast.success(`Copied ${getCopiedMedicineLabel(prescriptionContext)} to Parchment`)
    } catch {
      toast.error("Could not copy prescription details")
    }
  }, [prescriptionContext])

  const copyPrescriptionSearchHint = useCallback(async () => {
    if (!prescriptionContext?.searchHint) return
    try {
      await navigator.clipboard.writeText(prescriptionContext.searchHint)
      toast.success("Copied Parchment search term")
    } catch {
      toast.error("Could not copy search term")
    }
  }, [prescriptionContext])

  const retryIframeOnly = useCallback(() => {
    setIframeLoaded(false)
    setIframeSlowToLoad(false)
    setIframeReloadKey((key) => key + 1)
  }, [])

  const loadPrescribingUrl = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSessionRefreshing(false)

    const result = await loadFreshParchmentUrl()

    if (result.success && result.ssoUrl) {
      setSsoUrl(result.ssoUrl)
      setIframeLoaded(false)
      setIframeSlowToLoad(false)

      // SSO tokens expire in 300s. Surface a subtle "Session refreshing..."
      // banner at 240s so the doctor knows a refresh is coming before the
      // iframe blinks. Fire the actual refresh at 270s (30s safety margin).
      if (ssoExpiryTimer.current) clearTimeout(ssoExpiryTimer.current)
      if (ssoWarningTimer.current) clearTimeout(ssoWarningTimer.current)
      ssoWarningTimer.current = setTimeout(() => {
        setSessionRefreshing(true)
      }, 240_000) // 4 minutes
      ssoExpiryTimer.current = setTimeout(() => {
        loadPrescribingUrl()
      }, 270_000) // 4.5 minutes
    } else {
      setError(result.error || "Failed to load prescribing portal")
      toast.error(result.error || "Failed to load Parchment")
    }

    setLoading(false)
  }, [loadFreshParchmentUrl])

  // Auto-load on mount + cleanup timers
  useEffect(() => {
    loadPrescribingUrl()
    return () => {
      if (ssoExpiryTimer.current) clearTimeout(ssoExpiryTimer.current)
      if (ssoWarningTimer.current) clearTimeout(ssoWarningTimer.current)
    }
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndRefresh()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [closeAndRefresh])

  return (
    <div className="fixed inset-0 z-50">
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
        className="absolute top-0 right-0 h-full bg-background shadow-2xl shadow-primary/[0.12] flex flex-col"
        style={{ width: "800px", maxWidth: "100vw" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parchment-sheet-title"
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 id="parchment-sheet-title" className="text-lg font-semibold text-foreground">
                Prescribe for {patientName}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {intakeId
                  ? "Write the prescription in Parchment below. When it is confirmed, close this panel and press Approve."
                  : "Write the prescription in Parchment below. It will sync back to this patient profile."}
              </p>
              {prescriptionContext && (
                <div className="mt-3 rounded-md border border-border bg-muted/35 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Requested medicine
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">
                        {prescriptionContext.medicationLabel || prescriptionContext.presetLabel}
                      </p>
                      {prescriptionContext.searchHint && (
                        <div className="mt-0.5 flex min-w-0 items-center gap-2">
                          <p className="truncate text-xs text-muted-foreground">
                            Search in Parchment: {prescriptionContext.searchHint}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 px-2 text-[11px]"
                            onClick={copyPrescriptionSearchHint}
                          >
                            <Clipboard className="mr-1 h-3 w-3" />
                            Copy search
                          </Button>
                        </div>
                      )}
                    </div>
                    {prescriptionContext.copyText && (
                      <Button type="button" variant="outline" size="sm" onClick={copyPrescriptionContext}>
                        <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Directions context: {prescriptionContext.directionsTemplate}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirm medicine, dose and all prescribing details in Parchment.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {sessionRefreshing && !error && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                  aria-live="polite"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                  Session refreshing
                </span>
              )}
              {ssoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={openInNewTab}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open in new tab
                </Button>
              )}
              <button
                onClick={closeAndRefresh}
                className="p-2 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Close panel"
                type="button"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
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
                            You can keep waiting, open it in a new tab, or copy the requested medicine and continue there.
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={retryIframeOnly}>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              Retry iframe
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={openInNewTab}>
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Open in new tab
                            </Button>
                            {prescriptionContext?.copyText && (
                              <Button type="button" variant="ghost" size="sm" onClick={copyPrescriptionContext}>
                                <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                                Copy medicine
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
                    key={iframeReloadKey}
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
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
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

        {/* Footer - manual fallback */}
        <div className="shrink-0 px-6 py-3 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                {intakeId
                  ? "Webhook confirmation unlocks the separate Approve step after refresh"
                  : "Prescription will sync back to the PMS via Parchment webhook"}
              </span>
            </div>
            {onScriptSent && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
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
                className="text-xs"
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
