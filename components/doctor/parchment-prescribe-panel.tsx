"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle, ExternalLink, Loader2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getParchmentPrescribeUrlAction } from "@/app/actions/parchment"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { backdropVariants, sheetVariants } from "@/lib/motion/panel-variants"
import { canEmbedParchmentForHost } from "@/lib/parchment/embed-policy"

interface ParchmentPrescribePanelProps {
  intakeId: string
  patientName: string
  onScriptSent?: () => void
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
  patientName,
  onScriptSent,
}: ParchmentPrescribePanelProps) {
  const { closePanel } = usePanel()
  const prefersReducedMotion = useReducedMotion()
  const [ssoUrl, setSsoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [canUseIframe, setCanUseIframe] = useState(true)
  const [_ssoExpired, setSsoExpired] = useState(false)
  const ssoExpiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openInNewTab = useCallback(async () => {
    const freshResult = await getParchmentPrescribeUrlAction(intakeId)
    if (freshResult.success && freshResult.ssoUrl) {
      window.open(freshResult.ssoUrl, "_blank", "noopener,noreferrer")
    } else {
      toast.error(freshResult.error || "Failed to generate new Parchment session")
    }
  }, [intakeId])

  const loadPrescribingUrl = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSsoExpired(false)

    const result = await getParchmentPrescribeUrlAction(intakeId)

    if (result.success && result.ssoUrl) {
      setSsoUrl(result.ssoUrl)
      setIframeLoaded(false)

      // SSO tokens expire in 300s - auto-refresh at 270s (30s safety margin)
      if (ssoExpiryTimer.current) clearTimeout(ssoExpiryTimer.current)
      ssoExpiryTimer.current = setTimeout(() => {
        setSsoExpired(true)
        toast.warning("Parchment session expiring - refreshing...", { duration: 3000 })
        loadPrescribingUrl()
      }, 270_000) // 4.5 minutes
    } else {
      setError(result.error || "Failed to load prescribing portal")
      toast.error(result.error || "Failed to load Parchment")
    }

    setLoading(false)
  }, [intakeId])

  // Auto-load on mount + cleanup timer
  useEffect(() => {
    loadPrescribingUrl()
    return () => {
      if (ssoExpiryTimer.current) clearTimeout(ssoExpiryTimer.current)
    }
  }, [loadPrescribingUrl])

  useEffect(() => {
    setCanUseIframe(canEmbedParchmentForHost(window.location.hostname))
  }, [])

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
      if (e.key === "Escape") closePanel()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [closePanel])

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        variants={backdropVariants}
        initial={prefersReducedMotion ? {} : "hidden"}
        animate="visible"
        exit="hidden"
        className="absolute inset-0 bg-foreground/40"
        onClick={closePanel}
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
                Write the prescription in Parchment below. It will be confirmed automatically.
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
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
                onClick={closePanel}
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
                  <p className="text-sm font-medium text-foreground">Unable to load Parchment</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <div className="flex gap-2 justify-center">
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
              {canUseIframe && !iframeLoaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading Parchment...</p>
                  </div>
                </div>
              )}
              {canUseIframe ? (
                <iframe
                  src={ssoUrl}
                  className="w-full h-full border-0"
                  onLoad={() => setIframeLoaded(true)}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  allow="clipboard-write; publickey-credentials-get *; publickey-credentials-create *"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Parchment Prescribing"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
                  <div className="text-center space-y-4 max-w-md px-6">
                    <ExternalLink className="h-10 w-10 text-primary mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Open Parchment in a new tab</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Parchment has not whitelisted this domain for embedded sandbox prescribing yet.
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
              <span>Script will be confirmed automatically via webhook when completed in Parchment</span>
            </div>
            {onScriptSent && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onScriptSent}
              >
                Mark sent manually
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
