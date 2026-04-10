"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react"
import { getParchmentPrescribeUrlAction } from "@/app/actions/parchment"
import { toast } from "sonner"

interface ParchmentPrescribePanelProps {
  intakeId: string
  patientName: string
  onScriptSent?: () => void
}

/**
 * Embedded Parchment prescribing panel.
 *
 * Loads the Parchment prescribing UI in an iframe via SSO.
 * The doctor writes the script directly inside InstantMed.
 * When complete, the Parchment webhook auto-marks the script sent.
 */
export function ParchmentPrescribePanel({
  intakeId,
  patientName,
  onScriptSent,
}: ParchmentPrescribePanelProps) {
  const [ssoUrl, setSsoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const loadPrescribingUrl = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getParchmentPrescribeUrlAction(intakeId)

    if (result.success && result.ssoUrl) {
      setSsoUrl(result.ssoUrl)
    } else {
      setError(result.error || "Failed to load prescribing portal")
      toast.error(result.error || "Failed to load Parchment")
    }

    setLoading(false)
  }, [intakeId])

  // Auto-load on mount
  if (!ssoUrl && !loading && !error) {
    loadPrescribingUrl()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Prescribe for {patientName}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Write the prescription in Parchment below. It will be confirmed automatically.
            </p>
          </div>
          {ssoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => window.open(ssoUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in new tab
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
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
            {!iframeLoaded && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading Parchment...</p>
                </div>
              </div>
            )}
            <iframe
              src={ssoUrl}
              className="w-full h-full border-0"
              onLoad={() => setIframeLoaded(true)}
              allow="clipboard-write; publickey-credentials-get *; publickey-credentials-create *"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Parchment Prescribing"
            />
          </>
        )}
      </div>

      {/* Footer — manual fallback */}
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
    </div>
  )
}
