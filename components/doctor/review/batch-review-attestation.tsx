"use client"

import { Loader2, RotateCcw, ShieldCheck } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { markBatchReviewed } from "@/app/actions/batch-review-cert"
import { revokeAIApproval } from "@/app/actions/revoke-ai-approval"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { type BatchReviewCandidate, isBatchReviewEligible } from "@/lib/clinical/batch-review-policy"

type BatchReviewIntake = BatchReviewCandidate & { id: string }

interface BatchReviewAttestationProps {
  intake: BatchReviewIntake
  onResolved: (intakeId: string) => void
}

export function BatchReviewAttestation({ intake, onResolved }: BatchReviewAttestationProps) {
  const [attested, setAttested] = useState(false)
  const [showRevocation, setShowRevocation] = useState(false)
  const [reason, setReason] = useState("")
  const [resolved, setResolved] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!isBatchReviewEligible(intake) || resolved) return null

  const handleAttest = () => {
    if (!attested || isPending) return
    startTransition(async () => {
      const result = await markBatchReviewed(intake.id)
      if (!result.success) {
        toast.error(result.error || "Could not record this review")
        return
      }
      toast.success("Post-approval review recorded")
      setResolved(true)
      onResolved(intake.id)
    })
  }

  const handleRevoke = () => {
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 5 || isPending) return
    startTransition(async () => {
      const result = await revokeAIApproval({ intakeId: intake.id, reason: trimmedReason })
      if (!result.success) {
        toast.error(result.error || "Could not revoke this certificate")
        return
      }
      toast.success("Certificate revoked and returned to manual review")
      setResolved(true)
      onResolved(intake.id)
    })
  }

  return (
    <section
      className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3"
      aria-labelledby="batch-review-attestation-title"
      data-testid="batch-review-attestation"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id="batch-review-attestation-title" className="text-sm font-semibold text-foreground">
            Complete post-approval review
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Review the certificate and clinical record, then record one outcome.
          </p>

          {!showRevocation ? (
            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-foreground">
                <Checkbox
                  checked={attested}
                  onCheckedChange={(checked) => setAttested(checked === true)}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <span>I reviewed the intake and issued certificate.</span>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowRevocation(true)}
                  disabled={isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Revoke certificate
                </Button>
                <Button type="button" size="sm" onClick={handleAttest} disabled={!attested || isPending}>
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  Confirm reviewed
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              <label htmlFor="batch-review-revocation-reason" className="text-xs font-semibold text-foreground">
                Why does this certificate need manual review?
              </label>
              <Textarea
                id="batch-review-revocation-reason"
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
                    setShowRevocation(false)
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
                  disabled={reason.trim().length < 5 || isPending}
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  Revoke and return to review
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
