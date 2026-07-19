import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const dispatcherSource = read("lib/email/email-dispatcher.ts")
const legacyRecoverySource = read("lib/email/recover-legacy-quiet-failures.ts")
const outboxDispositionSource = read("lib/email/outbox-disposition.ts")
const partialRecoverySource = read("lib/email/partial-intake-recovery.ts")
const quietFailureSource = read("lib/email/quiet-failures.ts")
const reconstructSource = read("lib/email/send/reconstruct.ts")
const reviewRequestSource = read("lib/email/review-request.ts")
const sendEmailSource = read("lib/email/send-email.ts")

describe("review and partial-recovery reliability contract", () => {
  it("routes both types through dispatcher retry rather than quiet failure", () => {
    const supportedBlock = dispatcherSource.slice(
      dispatcherSource.indexOf("SUPPORTED_EMAIL_TYPES = ["),
      dispatcherSource.indexOf("] as const", dispatcherSource.indexOf("SUPPORTED_EMAIL_TYPES = [")),
    )
    const quietBlock = quietFailureSource.slice(
      quietFailureSource.indexOf("CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES = ["),
      quietFailureSource.indexOf(
        "] as const",
        quietFailureSource.indexOf("CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES = ["),
      ),
    )

    expect(supportedBlock).toContain('"partial_intake_recovery"')
    expect(supportedBlock).toContain('"review_request"')
    expect(quietBlock).not.toContain('"partial_intake_recovery"')
    expect(quietBlock).not.toContain('"review_request"')
    expect(dispatcherSource).toContain("await recoverLegacyQuietFailures()")
  })

  it("requeues safe legacy rows and alarms on rows too old to resend", () => {
    expect(legacyRecoverySource).toContain('Date.parse("2026-08-01T00:00:00.000Z")')
    expect(legacyRecoverySource).toContain("LEGACY_PARTIAL_RECOVERY_RETRY_HOURS = 72")
    expect(legacyRecoverySource).toContain("LEGACY_REVIEW_REQUEST_RETRY_DAYS = 120")
    expect(legacyRecoverySource).toContain("retry_count: 0")
    expect(legacyRecoverySource).toContain("delete metadata[FROZEN_PROVIDER_PAYLOAD_KEY]")
    expect(legacyRecoverySource).toContain('update.subject = "How did InstantMed go?"')
    expect(legacyRecoverySource).toContain(
      "Legacy quiet failure exceeded safe retry age; manual review required",
    )
    expect(legacyRecoverySource).toContain(
      'Sentry.captureMessage("Legacy quiet-failed email rows exceeded safe retry age"',
    )
  })

  it("replays secure partial-intake payloads or fails loudly without the bearer context", () => {
    expect(partialRecoverySource).toContain("draft_idempotency_hash")
    expect(partialRecoverySource).not.toContain("draft_session_id:")
    expect(partialRecoverySource).toContain("isEmailSendDeliveryConfirmed")
    expect(reconstructSource).toContain('row.email_type === "partial_intake_recovery"')
    expect(reconstructSource).toContain(
      "Partial-intake recovery row has no encrypted provider payload; secure reconstruction is unavailable",
    )
    expect(reconstructSource).toContain("terminal: true")
    expect(sendEmailSource).toContain("hasFrozenResendProviderPayload(row.metadata)")
    expect(sendEmailSource).toContain('Sentry.captureMessage("Email reconstruction failed terminally"')
  })

  it("marks review delivery only after durable provider confirmation", () => {
    const confirmation = reviewRequestSource.indexOf(
      "if (await isEmailSendDeliveryConfirmed(result))",
    )
    const marker = reviewRequestSource.indexOf("await markReviewRequestSent(candidate.id)")

    expect(confirmation).toBeGreaterThan(-1)
    expect(marker).toBeGreaterThan(confirmation)
    expect(dispatcherSource).toContain("await finalizeOutboxSequenceDisposition(")
    expect(outboxDispositionSource).toContain("review_request: {")
    expect(outboxDispositionSource).toContain('markerColumn: "review_email_sent_at"')
    expect(outboxDispositionSource).toContain(".is(definition.markerColumn, null)")
  })

  it("suppresses declined, refunded, bounced, complained, unsubscribed, and already-asked requests", () => {
    expect(reviewRequestSource).toContain('.in("status", ["approved", "completed"])')
    expect(reviewRequestSource).toContain('.eq("payment_status", "paid")')
    expect(reviewRequestSource).toContain('.is("review_email_sent_at", null)')
    expect(reviewRequestSource).toContain("patient.email_bounced === true")
    expect(reviewRequestSource).toContain("await getSuppressedEmails([email])")
    expect(reviewRequestSource).toContain("await isEmailSuppressed(email)")
    expect(reviewRequestSource).toContain("await canSendMarketingEmail(candidate.patient_id)")
  })

  it("terminally marks suppressed requests so they cannot starve the catch-up queue", () => {
    expect(reviewRequestSource).toContain(
      "Filtering them here would let the same",
    )
    expect(reviewRequestSource).toContain(
      'await markReviewRequestHandled(intakeId, "suppressed")',
    )
    expect(dispatcherSource).toContain("(result.success || result.suppressed)")
    expect(dispatcherSource).toContain(
      'result.success ? "sent" : "suppressed"',
    )
  })

  it("revalidates request state and consent before dispatcher retries reach the provider", () => {
    const reviewValidation = sendEmailSource.lastIndexOf(
      "const reviewValidation = await validateReviewRequestOutboxRow(row)",
    )
    const preferenceCheck = sendEmailSource.lastIndexOf(
      "if (!await isMarketingDeliveryAllowed(row.email_type, row.patient_id, row.to_email))",
    )
    const providerCall = sendEmailSource.lastIndexOf(
      'await fetch("https://api.resend.com/emails"',
    )

    expect(reviewValidation).toBeGreaterThan(-1)
    expect(preferenceCheck).toBeGreaterThan(reviewValidation)
    expect(providerCall).toBeGreaterThan(preferenceCheck)
    expect(sendEmailSource.slice(preferenceCheck, providerCall)).not.toContain("await sleep")
    expect(sendEmailSource).toContain("return canSendMarketingEmail(patientId)")
    expect(sendEmailSource).toContain(
      "Suppressed before delivery: marketing preference does not allow send",
    )
  })

  it("revalidates request state and consent before the initial provider send", () => {
    const reviewValidation = sendEmailSource.indexOf(
      "const reviewValidation = await validateReviewRequestOutboxRow({",
    )
    const preferenceCheck = sendEmailSource.indexOf(
      "if (!await isMarketingDeliveryAllowed(emailType, patientId, to))",
    )
    const providerCall = sendEmailSource.indexOf(
      'await fetch("https://api.resend.com/emails"',
    )

    expect(reviewValidation).toBeGreaterThan(-1)
    expect(preferenceCheck).toBeGreaterThan(reviewValidation)
    expect(providerCall).toBeGreaterThan(preferenceCheck)
    expect(sendEmailSource.slice(preferenceCheck, providerCall)).not.toContain("await sleep")
  })
})
