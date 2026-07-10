import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260710174000_idempotent_certificate_resends.sql"),
  "utf8",
)
const actionSource = readFileSync(
  join(process.cwd(), "app/actions/resend-certificate.ts"),
  "utf8",
)
const cleanupCronSource = readFileSync(
  join(process.cwd(), "app/api/cron/cleanup-orphaned-storage/route.ts"),
  "utf8",
)
const legacyEmailRetrySource = readFileSync(
  join(process.cwd(), "app/actions/email-retry.ts"),
  "utf8",
)

describe("certificate resend transaction contract", () => {
  it("reserves under the certificate lock before sending and enforces concurrent staff slots", () => {
    expect(migrationSource).toContain("CREATE TABLE IF NOT EXISTS public.certificate_resend_attempts")
    expect(migrationSource).toContain("CREATE OR REPLACE FUNCTION public.reserve_certificate_resend")
    expect(migrationSource).toContain("FOR UPDATE")
    expect(migrationSource).toContain("v_active_reservations")
    expect(migrationSource).toContain("v_certificate.resend_count, 0) + v_active_reservations >= 3")
    expect(migrationSource).not.toContain("attempt.created_at > NOW() - INTERVAL '15 minutes'")
    expect(migrationSource).toContain("idx_certificate_resend_attempts_one_active_version")
    expect(migrationSource).toContain("A certificate resend is already queued for this certificate version")
    expect(migrationSource).toContain("certificate_storage_path text NOT NULL")
    expect(migrationSource).toContain("attempt.certificate_storage_path = v_certificate.storage_path")

    expect(actionSource.indexOf("reserveResendWithRetry({")).toBeLessThan(
      actionSource.indexOf("const emailResult = await sendEmail({"),
    )
    expect(actionSource).toContain("idempotencyKey: `certificate-resend:${resendAttemptId}`")
    expect(actionSource).toContain('lastResult.attemptStatus === "reserved"')
    expect(actionSource).toContain('queued: true')
  })

  it("reconciles process-death reservations from durable outbox outcomes", () => {
    expect(migrationSource).toContain("CREATE OR REPLACE FUNCTION public.reconcile_certificate_resend_attempts")
    expect(migrationSource).toContain("FROM public.email_outbox AS outbox")
    expect(migrationSource).toContain("outbox.idempotency_key = 'certificate-resend:' || v_attempt.id::text")
    expect(migrationSource).toContain("v_outbox.status = 'sent'")
    expect(migrationSource).toContain("v_outbox.id IS NULL")
    expect(actionSource).toContain("reconcileCertificateResendAttempts(input.certificateId)")
    expect(cleanupCronSource).toContain('.rpc("reconcile_certificate_resend_attempts"')
  })

  it("finalizes provider outcome, counters, intake mirror, audit, and attempt atomically", () => {
    expect(migrationSource).toContain("CREATE OR REPLACE FUNCTION public.finalize_certificate_resend")
    expect(migrationSource).toContain("email_retry_count = COALESCE")
    expect(migrationSource).toContain("CASE WHEN v_attempt.count_toward_staff_limit THEN 1 ELSE 0 END")
    expect(migrationSource).toContain("UPDATE public.intakes")
    expect(migrationSource).toContain("INSERT INTO public.certificate_audit_log")
    expect(migrationSource).toContain("'resend_attempt_id'")
    expect(migrationSource).toContain("status = CASE WHEN v_delivery_succeeded THEN 'sent' ELSE 'failed' END")
    expect(migrationSource).toContain("idx_certificate_audit_resend_attempt")
    expect(migrationSource).toContain("Certificate version changed before resend finalization")
    expect(migrationSource).toContain("provider_delivery_succeeded")
  })

  it("uses certificate-before-attempt lock ordering in every resend transaction", () => {
    const finalizeStart = migrationSource.indexOf(
      "CREATE OR REPLACE FUNCTION public.finalize_certificate_resend",
    )
    const reconcileStart = migrationSource.indexOf(
      "CREATE OR REPLACE FUNCTION public.reconcile_certificate_resend_attempts",
    )
    const finalizerSource = migrationSource.slice(finalizeStart, reconcileStart)
    const reconciliationSource = migrationSource.slice(reconcileStart)
    const certificateLock = [
      "FROM public.issued_certificates",
      "  WHERE id = v_attempt.certificate_id",
      "  FOR UPDATE;",
    ].join("\n")
    const attemptLock = [
      "FROM public.certificate_resend_attempts",
      "  WHERE id = p_attempt_id",
      "  FOR UPDATE;",
    ].join("\n")

    expect(finalizerSource.indexOf(certificateLock)).toBeGreaterThan(-1)
    expect(finalizerSource.indexOf(certificateLock)).toBeLessThan(
      finalizerSource.indexOf(attemptLock),
    )
    expect(reconciliationSource).not.toContain("FOR UPDATE SKIP LOCKED")
  })

  it("uses the same retry-safe finalizer for patient and staff sends", () => {
    expect(actionSource.match(/finalizeCertificateResend\(\{/g)?.length).toBeGreaterThanOrEqual(3)
    expect(actionSource).not.toContain("recordCertificateEmailRetry")
    expect(actionSource).not.toContain("incrementEmailRetry(certificate.id)")
    expect(legacyEmailRetrySource).toContain("return resendCertificateAsStaff(certificate.intake_id)")
    expect(legacyEmailRetrySource).not.toContain("incrementEmailRetry")
  })

  it("restricts all new tables and RPCs to service role with fixed search paths", () => {
    expect(migrationSource.match(/SET search_path = pg_catalog, public/g)?.length).toBe(3)
    expect(migrationSource).toContain("REVOKE ALL ON TABLE public.certificate_resend_attempts")
    expect(migrationSource).toContain("FROM PUBLIC, anon, authenticated")
    expect(migrationSource).toContain("TO service_role")
    expect(migrationSource).toContain("OR p_actor_role IS NULL")
  })
})
