import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { formatIntakeStatus } from "@/lib/data/intakes/format"
import { getPatientStatusNextStep, INTAKE_STATUS, PATIENT_STATUS_NEXT_STEP } from "@/lib/data/status"
import { PAYMENT_STATUS } from "@/lib/data/status"

const CANONICAL_INTAKE_STATUSES = [
  "draft",
  "pending_payment",
  "checkout_failed",
  "paid",
  "in_review",
  "pending_info",
  "approved",
  "declined",
  "escalated",
  "completed",
  "cancelled",
  "expired",
  "awaiting_script",
] as const

const CANONICAL_PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "refunded",
  "failed",
  "expired",
  "disputed",
  "partially_refunded",
  "refund_processing",
  "refund_failed",
] as const

const patientIntakeClientSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/[id]/client.tsx"),
  "utf8",
)

const patientStatusListenerSource = readFileSync(
  join(process.cwd(), "components/patient/intake-status-listener.tsx"),
  "utf8",
)
const patientIntakeDrawerSource = readFileSync(
  join(process.cwd(), "components/patient/intake-detail-drawer.tsx"),
  "utf8",
)
const patientIntakeTypesSource = readFileSync(
  join(process.cwd(), "components/patient/intake-types.ts"),
  "utf8",
)

const supportSummaryButtonSource = readFileSync(
  join(process.cwd(), "components/patient/support-summary-button.tsx"),
  "utf8",
)

const typeSource = readFileSync(
  join(process.cwd(), "types/db.ts"),
  "utf8",
)

function latestStatusTransitionMigrationSource() {
  const migrationsDir = join(process.cwd(), "supabase/migrations")
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  for (const file of migrationFiles.reverse()) {
    const source = readFileSync(join(migrationsDir, file), "utf8")
    if (
      source.includes("CREATE OR REPLACE FUNCTION public.validate_intake_status_transition")
      || source.includes("CREATE OR REPLACE FUNCTION validate_intake_status_transition")
    ) {
      return { file, source }
    }
  }

  throw new Error("No migration defines validate_intake_status_transition")
}

function transitionBlock(source: string, fromStatus: string) {
  const start = source.indexOf(`OLD.status = '${fromStatus}'`)
  if (start === -1) {
    return ""
  }

  // A status block may contain nested guards (for example the narrowly
  // constrained approved -> in_review revocation path). Stop at the next
  // top-level OLD.status block instead of the first nested END IF.
  const end = source.indexOf("IF OLD.status", start + 1)
  return end === -1 ? source.slice(start) : source.slice(start, end)
}

describe("intake status source of truth", () => {
  it("has display metadata for every canonical intake status", () => {
    for (const status of CANONICAL_INTAKE_STATUSES) {
      expect(INTAKE_STATUS[status], status).toBeDefined()
      expect(INTAKE_STATUS[status]?.label, status).toBeTruthy()
      expect(formatIntakeStatus(status), status).not.toBe("Unknown")
    }
  })

  it("has display metadata for every canonical payment status", () => {
    for (const status of CANONICAL_PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS[status], status).toBeDefined()
      expect(PAYMENT_STATUS[status]?.label, status).toBeTruthy()
    }
  })

  it("keeps active patient statuses visible in the live status tracker", () => {
    expect(patientIntakeClientSource).toContain("awaiting_script")
    expect(patientIntakeClientSource).toContain("escalated")
    expect(patientStatusListenerSource).toContain("awaiting_script")
    expect(patientStatusListenerSource).toContain("escalated")
  })

  it("keeps the database state machine aligned with payment recovery and decline flows", () => {
    const { file, source } = latestStatusTransitionMigrationSource()

    expect(source, file).toContain("current_setting('app.e2e_reset'")
    expect(transitionBlock(source, "draft"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "pending_payment"), file).toContain("'checkout_failed'")
    expect(transitionBlock(source, "pending_payment"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "checkout_failed"), file).toContain("'pending_payment'")
    // checkout_failed -> paid is the exact DB-layer surface of the 2026-06-09
    // incident: a paid retry after a checkout_failed session was rejected by the
    // trigger and the intake sat stuck 10 days. Pin it so it can't silently regress.
    expect(transitionBlock(source, "checkout_failed"), file).toContain("'paid'")
    expect(transitionBlock(source, "checkout_failed"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "paid"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "in_review"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "pending_info"), file).toContain("'paid'")
    expect(transitionBlock(source, "pending_info"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "pending_info"), file).toContain("'expired'")
    expect(transitionBlock(source, "approved"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "awaiting_script"), file).toContain("'declined'")
    expect(transitionBlock(source, "awaiting_script"), file).toContain("'cancelled'")
    expect(transitionBlock(source, "escalated"), file).toContain("'cancelled'")
  })

  it("keeps database types aligned with live payment and refund statuses", () => {
    for (const status of [
      "pending",
      "unpaid",
      "paid",
      "failed",
      "expired",
      "refunded",
      "partially_refunded",
      "refund_processing",
      "refund_failed",
      "disputed",
    ]) {
      expect(typeSource).toContain(`"${status}"`)
    }

    for (const status of [
      "not_applicable",
      "not_eligible",
      "pending",
      "succeeded",
      "failed",
      "skipped_e2e",
    ]) {
      expect(typeSource).toContain(`"${status}"`)
    }
  })

  it("lets patients copy a stable request ID from their request timeline", () => {
    expect(patientIntakeClientSource).toContain("CopyRequestIdButton")
    expect(patientIntakeClientSource).toContain("navigator.clipboard.writeText(requestId)")
    expect(patientIntakeClientSource).toContain("Copy request ID")
    expect(patientIntakeClientSource).toContain("request_id_copied")
  })

  it("lets patients copy a support-safe payment or refund summary", () => {
    expect(patientIntakeClientSource).toContain("CopySupportSummaryButton")
    expect(supportSummaryButtonSource).toContain("buildSupportSummary")
    expect(supportSummaryButtonSource).toContain("Payment status:")
    expect(supportSummaryButtonSource).toContain("Copy support summary")
    expect(supportSummaryButtonSource).toContain("support_summary_copied")
  })

  it("shows a compact payment and refund timeline on patient request detail", () => {
    expect(patientIntakeClientSource).toContain("PaymentEventTimeline")
    expect(patientIntakeClientSource).toContain("Payment started")
    expect(patientIntakeClientSource).toContain("Payment confirmed")
    expect(patientIntakeClientSource).toContain("Refund status")
    expect(patientIntakeClientSource).toContain("Refund processed")
    expect(patientIntakeClientSource).toContain("refund_error")
  })

  it("uses one patient-facing next-step map across request surfaces", () => {
    for (const status of ["paid", "in_review", "pending_info", "approved", "awaiting_script", "completed"]) {
      expect(PATIENT_STATUS_NEXT_STEP[status as keyof typeof PATIENT_STATUS_NEXT_STEP], status).toBeDefined()
      expect(getPatientStatusNextStep(status)?.message, status).toBeTruthy()
    }

    expect(patientIntakeClientSource).toContain("resolvePatientIntakeNextStep")
    expect(patientIntakeClientSource).toContain("What happens next")
    expect(patientIntakeClientSource).toContain("Last update")
    expect(patientIntakeDrawerSource).toContain("resolvePatientIntakeNextStep")
    expect(patientIntakeDrawerSource).not.toContain("const WHATS_NEXT")
    expect(patientIntakeTypesSource).toContain("getPatientStatusNextStep")
    expect(patientIntakeTypesSource).toContain("isMoreInformationRequiredPaymentRecovery")
  })
})
