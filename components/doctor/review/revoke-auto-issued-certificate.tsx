"use client"

import { Loader2, RotateCcw } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { revokeAIApproval } from "@/app/actions/revoke-ai-approval"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const MIN_REASON_LENGTH = 5

export interface AutoIssuedCertificateCandidate {
  ai_approved?: boolean | null
  category?: string | null
  status?: string | null
}

/**
 * True when a request is a delivered, auto-issued medical certificate — the only
 * shape that can be revoked back into manual review.
 *
 * Med certs terminate at `approved`. `completed` is written only by the script
 * flow and is a DB terminal state, so a revoke from there could never reopen the
 * intake; including it would strand the case with a revoked certificate and a
 * rejected status update.
 *
 * Deliberately carries no enforcement cutover. The retired 24h attestation had a
 * grandfather boundary because it was an *obligation* that older certificates
 * never had a way to discharge. Correcting a certificate is not an obligation,
 * so an auto-issued certificate from any date stays revocable.
 */
export function isRevocableAutoIssuedCertificate(intake: AutoIssuedCertificateCandidate): boolean {
  return (
    intake.ai_approved === true &&
    intake.category === "medical_certificate" &&
    intake.status === "approved"
  )
}

/**
 * Correction path for an auto-issued medical certificate.
 *
 * The post-approval attestation obligation was removed on 2026-08-04 because
 * risk is gated BEFORE issuance by `DETERMINISTIC_FAILURE_PREFIXES`. What
 * survives is this: an operator scanning the day's auto-issued certificates can
 * revoke one that looks wrong.
 *
 * It is a spot-check affordance, not an obligation — no deadline, no alert, no
 * sign-off. It stays collapsed until asked for so a correct certificate costs
 * the operator nothing to scan past.
 */
export function RevokeAutoIssuedCertificate({
  intakeId,
  onRevoked,
}: {
  intakeId: string
  onRevoked?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const trimmedReason = reason.trim()
  const canSubmit = trimmedReason.length >= MIN_REASON_LENGTH && !isPending

  const handleRevoke = () => {
    if (!canSubmit) return
    startTransition(async () => {
      const result = await revokeAIApproval({ intakeId, reason: trimmedReason })
      if (!result.success) {
        toast.error(result.error || "Could not revoke this certificate")
        return
      }
      toast.success("Certificate revoked and returned to manual review")
      setExpanded(false)
      setReason("")
      onRevoked?.()
    })
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setExpanded(true)}
        data-testid="revoke-auto-issued-trigger"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Revoke certificate
      </Button>
    )
  }

  return (
    <section
      className="space-y-2.5 rounded-xl border border-border/50 p-3"
      aria-labelledby="revoke-auto-issued-title"
      data-testid="revoke-auto-issued"
    >
      <label id="revoke-auto-issued-title" htmlFor="revoke-auto-issued-reason" className="text-xs font-semibold text-foreground">
        Why does this certificate need manual review?
      </label>
      <Textarea
        id="revoke-auto-issued-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Record the clinical concern or correction needed."
        rows={3}
        disabled={isPending}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpanded(false)
            setReason("")
          }}
          disabled={isPending}
        >
          Keep certificate
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleRevoke}
          disabled={!canSubmit}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          Revoke and return to review
        </Button>
      </div>
    </section>
  )
}
