"use client"

import { Check, Copy, Hash, Shield } from "lucide-react"
import { useState } from "react"

import { capture } from "@/lib/analytics/capture"
import { cn } from "@/lib/utils"

interface CertificateCredentialsProps {
  /** Certificate verification code (e.g. IM-XXXXXX) */
  verificationCode?: string | null
  /** Reference / intake short ID (8-char uppercase) */
  referenceId?: string | null
  /** Optional muted variant for use inside cards. Default solid. */
  tone?: "solid" | "muted"
  className?: string
}

/**
 * CertificateCredentials
 *
 * Promotes the verification code + reference ID to a first-class display
 * surface. Used on the intake detail page, the dashboard "ready" hero,
 * the documents tab, and (eventually) the email template.
 *
 * The verification code is the legitimacy signal employers and HR teams
 * actually check. Burying it in inline `<code>` was a missed trust
 * moment. Here it's anchored, copyable, and sized for scan.
 */
export function CertificateCredentials({
  verificationCode,
  referenceId,
  tone = "solid",
  className,
}: CertificateCredentialsProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  const wrapperClass = cn(
    "grid gap-3 sm:grid-cols-2",
    tone === "solid"
      ? "rounded-xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none p-4"
      : "rounded-xl border border-border/40 bg-muted/40 p-4",
    className,
  )

  const copy = async (value: string, kind: "code" | "ref") => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard unavailable; ignore
    }
    if (kind === "code") {
      setCopiedCode(true)
      capture("verification_code_copied", { code: value })
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedRef(true)
      capture("reference_id_copied", { ref: value })
      setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  if (!verificationCode && !referenceId) return null

  return (
    <div className={wrapperClass}>
      {verificationCode && (
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 p-1.5">
            <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-muted-foreground">
              Verification code
            </p>
            <button
              type="button"
              onClick={() => copy(verificationCode, "code")}
              className="mt-0.5 inline-flex items-center gap-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              aria-label={copiedCode ? "Verification code copied" : "Copy verification code"}
            >
              <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
                {verificationCode}
              </span>
              {copiedCode ? (
                <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
      {referenceId && (
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 p-1.5">
            <Hash className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-muted-foreground">
              Reference
            </p>
            <button
              type="button"
              onClick={() => copy(referenceId, "ref")}
              className="mt-0.5 inline-flex items-center gap-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              aria-label={copiedRef ? "Reference copied" : "Copy reference"}
            >
              <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
                {referenceId}
              </span>
              {copiedRef ? (
                <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
