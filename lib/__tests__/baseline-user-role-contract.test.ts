import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const BASELINE_PATH = join(
  process.cwd(),
  "supabase/migrations/20240101000000_baseline.sql",
)
const ATOMIC_APPROVAL_RPC_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502011500_restore_atomic_approve_certificate_rpc.sql",
)
const AUTO_APPROVAL_STATE_MACHINE_PATH = join(
  process.cwd(),
  "supabase/migrations/20260402000004_auto_approval_state_machine.sql",
)
const REFERRAL_SYSTEM_PATH = join(
  process.cwd(),
  "supabase/migrations/20260403000002_referral_system.sql",
)
const SUBSCRIPTIONS_PATH = join(
  process.cwd(),
  "supabase/migrations/20260404000001_create_subscriptions.sql",
)
const SAFETY_LOCKDOWN_PATH = join(
  process.cwd(),
  "supabase/migrations/20260408000001_lock_down_intake_drafts_and_safety_audit.sql",
)
const PRODUCTION_SCHEMA_DRIFT_PATH = join(
  process.cwd(),
  "supabase/migrations/20260430000010_fix_production_schema_drift.sql",
)
const INFO_REQUEST_RPC_PRIVILEGES_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502012000_harden_info_request_rpc_privileges.sql",
)

describe("baseline user role contract", () => {
  it("defines doctor before baseline policies reference it", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const enumIndex = sql.indexOf("CREATE TYPE public.user_role AS ENUM")
    const doctorEnumIndex = sql.indexOf("'doctor'", enumIndex)
    const firstDoctorPolicyIndex = sql.indexOf("role IN ('doctor', 'admin')")

    expect(enumIndex).toBeGreaterThan(-1)
    expect(doctorEnumIndex).toBeGreaterThan(enumIndex)
    expect(firstDoctorPolicyIndex).toBeGreaterThan(-1)
    expect(doctorEnumIndex).toBeLessThan(firstDoctorPolicyIndex)
    expect(sql).toContain("CHECK (role::text = ANY")
    expect(sql).toContain("p.role::text IN ('clinician', 'doctor', 'admin')")
    expect(sql).toContain("'consults'")
  })

  it("creates email delivery indexes after the table exists", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE public.email_delivery_log")
    const intakeIndex = sql.indexOf("idx_email_delivery_log_intake_id")
    const recipientIndex = sql.indexOf("idx_email_delivery_log_recipient_id")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(intakeIndex).toBeGreaterThan(tableIndex)
    expect(recipientIndex).toBeGreaterThan(tableIndex)
  })

  it("creates certificate audit actor index after the table exists", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE public.certificate_audit_log")
    const actorIndex = sql.indexOf("idx_certificate_audit_log_actor_id")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(actorIndex).toBeGreaterThan(tableIndex)
  })

  it("drops the temporary legacy requests table before canonical intake fixes continue", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const createIndex = sql.indexOf("CREATE TABLE public.requests")
    const createDraftsIndex = sql.indexOf("CREATE TABLE IF NOT EXISTS public.document_drafts")
    const dropDraftsRequestIdIndex = sql.indexOf(
      "ALTER TABLE public.document_drafts DROP COLUMN IF EXISTS request_id",
    )
    const dropIndex = sql.indexOf("DROP TABLE IF EXISTS public.requests CASCADE")
    const nextCanonicalIndex = sql.indexOf("20260216000001_fix_payment_status_and_state_machine")

    expect(createIndex).toBeGreaterThan(-1)
    expect(createDraftsIndex).toBeGreaterThan(createIndex)
    expect(dropDraftsRequestIdIndex).toBeGreaterThan(createDraftsIndex)
    expect(dropIndex).toBeGreaterThan(dropDraftsRequestIdIndex)
    expect(dropIndex).toBeGreaterThan(createIndex)
    expect(nextCanonicalIndex).toBeGreaterThan(dropIndex)
  })

  it("restores document draft content after request-era data rename", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const renameIndex = sql.indexOf("ALTER TABLE public.document_drafts RENAME COLUMN content TO data")
    const restoreIndex = sql.indexOf("ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb")
    const commentIndex = sql.indexOf("COMMENT ON COLUMN document_drafts.content")

    expect(renameIndex).toBeGreaterThan(-1)
    expect(restoreIndex).toBeGreaterThan(renameIndex)
    expect(commentIndex).toBeGreaterThan(restoreIndex)
  })

  it("creates stripe webhook events before adding constraints", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE IF NOT EXISTS public.stripe_webhook_events")
    const constraintIndex = sql.indexOf("stripe_webhook_events_event_id_key")
    const renameIndex = sql.indexOf("ALTER TABLE public.stripe_webhook_events RENAME COLUMN request_id TO intake_id")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(constraintIndex).toBeGreaterThan(tableIndex)
    expect(renameIndex).toBeGreaterThan(constraintIndex)
  })

  it("creates payments before early Stripe payment indexes", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE IF NOT EXISTS public.payments")
    const uniqueIndex = sql.indexOf("payments_stripe_session_id_unique_idx")
    const dropRequestIdIndex = sql.indexOf("ALTER TABLE public.payments DROP COLUMN IF EXISTS request_id")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(uniqueIndex).toBeGreaterThan(tableIndex)
    expect(dropRequestIdIndex).toBeGreaterThan(uniqueIndex)
  })

  it("creates intake documents before legacy indexes, policies, and approval RPCs reference it", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")
    const rpcSql = readFileSync(ATOMIC_APPROVAL_RPC_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE IF NOT EXISTS public.intake_documents")
    const createdByIndex = sql.indexOf("idx_intake_documents_created_by")
    const policyIndex = sql.indexOf('DROP POLICY IF EXISTS "Patients can view own intake documents"')

    expect(tableIndex).toBeGreaterThan(-1)
    expect(createdByIndex).toBeGreaterThan(tableIndex)
    expect(policyIndex).toBeGreaterThan(createdByIndex)
    expect(rpcSql).toContain("INSERT INTO intake_documents (")
  })

  it("creates webhook dead letter intake id before DLQ indexes reference it", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const columnIndex = sql.indexOf("intake_id UUID REFERENCES public.intakes(id)", sql.indexOf("CREATE TABLE IF NOT EXISTS public.stripe_webhook_dead_letter"))
    const indexIndex = sql.indexOf("idx_stripe_webhook_dlq_intake")

    expect(columnIndex).toBeGreaterThan(-1)
    expect(indexIndex).toBeGreaterThan(columnIndex)
  })

  it("creates intake idempotency key before indexes and approval RPCs reference it", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")
    const rpcSql = readFileSync(ATOMIC_APPROVAL_RPC_PATH, "utf8")

    const columnIndex = sql.indexOf("idempotency_key TEXT", sql.indexOf("CREATE TABLE public.intakes"))
    const indexIndex = sql.indexOf("idx_intakes_idempotency_key")

    expect(columnIndex).toBeGreaterThan(-1)
    expect(indexIndex).toBeGreaterThan(columnIndex)
    expect(rpcSql).toContain("WHERE idempotency_key = p_idempotency_key")
  })

  it("does not use volatile time expressions in security event index predicates", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    expect(sql).not.toContain("WHERE created_at > NOW() - INTERVAL '24 hours'")
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_security_events_recent")
  })

  it("indexes chat sessions using an existing timestamp column", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    expect(sql).toContain("started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
    expect(sql).toContain("ON chat_sessions(patient_id, status, started_at DESC)")
    expect(sql).not.toContain("ON chat_sessions(patient_id, status, created_at DESC)")
  })

  it("keeps the duplicated auto-approval state migration idempotent after baseline replay", () => {
    const sql = readFileSync(AUTO_APPROVAL_STATE_MACHINE_PATH, "utf8")

    expect(sql).toContain("WHEN duplicate_object THEN NULL")
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS auto_approval_state")
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_intakes_auto_approval_active")
    expect(sql).toContain("column_name = 'auto_approval_skipped'")
  })

  it("keeps duplicated referral policies idempotent after baseline replay", () => {
    const sql = readFileSync(REFERRAL_SYSTEM_PATH, "utf8")

    expect(sql).toContain('DROP POLICY IF EXISTS "referral_events_select_own"')
    expect(sql).toContain('DROP POLICY IF EXISTS "referral_credits_select_own"')
    expect(sql).toContain('DROP POLICY IF EXISTS "referral_events_service_role_all"')
    expect(sql).toContain('DROP POLICY IF EXISTS "referral_credits_service_role_all"')
  })

  it("keeps duplicated subscriptions migration idempotent after baseline replay", () => {
    const sql = readFileSync(SUBSCRIPTIONS_PATH, "utf8")

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.subscriptions")
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id")
    expect(sql).toContain("DROP TRIGGER IF EXISTS subscriptions_updated_at")
  })

  it("guards safety RPC revokes and recreated policies for fresh preview replay", () => {
    const sql = readFileSync(SAFETY_LOCKDOWN_PATH, "utf8")

    expect(sql).toContain('DROP POLICY IF EXISTS "intake_drafts_owner_select"')
    expect(sql).toContain('DROP POLICY IF EXISTS "safety_audit_service_insert_only"')
    expect(sql).toContain("to_regprocedure('public.log_safety_evaluation(uuid,text,jsonb,text,text)')")
    expect(sql).toContain("to_regprocedure('public.cleanup_old_drafts()')")
  })

  it("drops safety evaluation overloads before recreating renamed parameters", () => {
    const sql = readFileSync(PRODUCTION_SCHEMA_DRIFT_PATH, "utf8")

    const shortDropIndex = sql.indexOf(
      "DROP FUNCTION IF EXISTS public.log_safety_evaluation(uuid, text, jsonb, text, text)",
    )
    const shortCreateIndex = sql.indexOf("CREATE OR REPLACE FUNCTION public.log_safety_evaluation", shortDropIndex)
    const longDropIndex = sql.indexOf(
      "DROP FUNCTION IF EXISTS public.log_safety_evaluation(uuid, text, text, text, text, text[], jsonb, jsonb, integer, boolean, uuid)",
    )
    const longCreateIndex = sql.indexOf("CREATE OR REPLACE FUNCTION public.log_safety_evaluation", longDropIndex)

    expect(shortDropIndex).toBeGreaterThan(-1)
    expect(shortCreateIndex).toBeGreaterThan(shortDropIndex)
    expect(longDropIndex).toBeGreaterThan(shortCreateIndex)
    expect(longCreateIndex).toBeGreaterThan(longDropIndex)
  })

  it("keeps info-request RPC grants outside large function-body migrations", () => {
    const atomicSql = readFileSync(ATOMIC_APPROVAL_RPC_PATH, "utf8")
    const requestSql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260501025500_request_more_info_atomic.sql"),
      "utf8",
    )
    const responseSql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260501034500_patient_info_response_atomic.sql"),
      "utf8",
    )
    const privilegesSql = readFileSync(INFO_REQUEST_RPC_PRIVILEGES_PATH, "utf8")

    expect(atomicSql).not.toContain("GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate")
    expect(requestSql).not.toContain("GRANT EXECUTE ON FUNCTION public.request_more_info_atomic")
    expect(responseSql).not.toContain("GRANT EXECUTE ON FUNCTION public.respond_to_info_request_atomic")
    expect(privilegesSql).toContain("GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate")
    expect(privilegesSql).toContain("GRANT EXECUTE ON FUNCTION public.request_more_info_atomic")
    expect(privilegesSql).toContain("GRANT EXECUTE ON FUNCTION public.respond_to_info_request_atomic")
    expect(privilegesSql).toContain("idx_patient_messages_intake_created_at")
  })

  it("moves the final atomic approval RPC out of the squashed baseline", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")
    const rpcSql = readFileSync(ATOMIC_APPROVAL_RPC_PATH, "utf8")

    expect(sql).not.toContain("DROP FUNCTION IF EXISTS public.atomic_approve_certificate;")
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION public.atomic_approve_certificate")
    expect(sql).toContain("final atomic_approve_certificate RPC moved to 20260502011500_restore_atomic_approve_certificate_rpc.sql")
    expect(rpcSql).toContain("CREATE OR REPLACE FUNCTION public.atomic_approve_certificate")
  })

  it("skips the obsolete initial atomic approval RPC in the squashed baseline", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const markerIndex = sql.indexOf("20250122000002_atomic_certificate_approval.sql")
    const skipIndex = sql.indexOf("Skipped in the squashed baseline", markerIndex)
    const nextIndex = sql.indexOf("20250122000003_fix_atomic_approval_audit_column.sql")

    expect(skipIndex).toBeGreaterThan(markerIndex)
    expect(nextIndex).toBeGreaterThan(skipIndex)
  })

  it("keeps certificate ref schema but skips its obsolete intermediate approval RPC", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const markerIndex = sql.indexOf("20260218000001_add_certificate_ref.sql")
    const columnIndex = sql.indexOf("ADD COLUMN IF NOT EXISTS certificate_ref TEXT UNIQUE", markerIndex)
    const skipIndex = sql.indexOf("Skipped in the squashed baseline", columnIndex)
    const nextIndex = sql.indexOf("20260219000001_amt_cache_rls_policies.sql")

    expect(columnIndex).toBeGreaterThan(markerIndex)
    expect(skipIndex).toBeGreaterThan(columnIndex)
    expect(nextIndex).toBeGreaterThan(skipIndex)
  })

  it("skips the obsolete audit-log-metadata approval RPC replay", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const markerIndex = sql.indexOf("20260220000002_fix_audit_log_metadata_column.sql")
    const skipIndex = sql.indexOf("Skipped in the squashed baseline", markerIndex)
    const nextIndex = sql.indexOf("20260221000001_launch_readiness.sql")

    expect(markerIndex).toBeGreaterThan(-1)
    expect(skipIndex).toBeGreaterThan(markerIndex)
    expect(nextIndex).toBeGreaterThan(skipIndex)
  })

  it("skips the superseded PHI approval RPC and restores the final definition separately", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")
    const rpcSql = readFileSync(ATOMIC_APPROVAL_RPC_PATH, "utf8")

    const supersededIndex = sql.indexOf("20260311014239_add_phi_enc_to_atomic_approval.sql")
    const skipIndex = sql.indexOf("superseded PHI-encryption atomic_approve_certificate RPC", supersededIndex)
    const correctiveIndex = sql.indexOf("20260311020000_fix_audit_log_metadata_column_regression.sql")
    const obsoleteDropIndex = sql.indexOf(
      "DROP FUNCTION IF EXISTS public.atomic_approve_certificate(uuid,text,text,text,text,date,date,uuid,text,date,uuid,text,text,text,text,jsonb,jsonb,text,integer,text,text,text,jsonb)",
      correctiveIndex,
    )

    expect(supersededIndex).toBeGreaterThan(-1)
    expect(skipIndex).toBeGreaterThan(supersededIndex)
    expect(correctiveIndex).toBeGreaterThan(skipIndex)
    expect(sql).toContain("final atomic_approve_certificate RPC moved to 20260502011500_restore_atomic_approve_certificate_rpc.sql")
    expect(rpcSql).toContain("CREATE OR REPLACE FUNCTION public.atomic_approve_certificate")
    expect(obsoleteDropIndex).toBe(-1)
  })

  it("creates and later drops temporary request answers", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE public.request_answers")
    const indexIndex = sql.indexOf("idx_request_answers_request")
    const dropIndex = sql.indexOf("DROP TABLE IF EXISTS public.request_answers")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(indexIndex).toBeGreaterThan(tableIndex)
    expect(dropIndex).toBeGreaterThan(indexIndex)
  })

  it("creates fraud flags before legacy policies and intake migration steps reference it", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE IF NOT EXISTS public.fraud_flags")
    const policyIndex = sql.indexOf('DROP POLICY IF EXISTS "doctors_view_fraud_flags"')
    const addIntakeIndex = sql.indexOf("ALTER TABLE public.fraud_flags", policyIndex)
    const dropRequestIdIndex = sql.indexOf("ALTER TABLE public.fraud_flags DROP COLUMN request_id")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(policyIndex).toBeGreaterThan(tableIndex)
    expect(addIntakeIndex).toBeGreaterThan(policyIndex)
    expect(dropRequestIdIndex).toBeGreaterThan(addIntakeIndex)
  })

  it("replaces the legacy audit log table with a compatibility view safely", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const legacyTableIndex = sql.indexOf("CREATE TABLE public.audit_log")
    const dropTableIndex = sql.indexOf("DROP TABLE IF EXISTS public.audit_log CASCADE")
    const compatibilityColumnIndex = sql.indexOf("ADD COLUMN IF NOT EXISTS description TEXT", dropTableIndex)
    const viewIndex = sql.indexOf("CREATE OR REPLACE VIEW public.audit_log")
    const dropViewIndex = sql.indexOf("DROP VIEW IF EXISTS public.audit_log", viewIndex)
    const staleRequestDropIndex = sql.indexOf("ALTER TABLE public.audit_logs DROP COLUMN request_id")
    const recreateViewIndex = sql.indexOf("CREATE VIEW public.audit_log AS", staleRequestDropIndex)

    expect(legacyTableIndex).toBeGreaterThan(-1)
    expect(dropTableIndex).toBeGreaterThan(legacyTableIndex)
    expect(compatibilityColumnIndex).toBeGreaterThan(dropTableIndex)
    expect(viewIndex).toBeGreaterThan(compatibilityColumnIndex)
    expect(dropViewIndex).toBeGreaterThan(viewIndex)
    expect(staleRequestDropIndex).toBeGreaterThan(dropViewIndex)
    expect(recreateViewIndex).toBeGreaterThan(staleRequestDropIndex)
  })

  it("guards stale referrals policy replay because the canonical table is referral_events", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const guardIndex = sql.indexOf("IF to_regclass('public.referrals') IS NOT NULL THEN")
    const policyIndex = sql.indexOf('DROP POLICY IF EXISTS "referrals_select_own"')

    expect(guardIndex).toBeGreaterThan(-1)
    expect(policyIndex).toBeGreaterThan(guardIndex)
  })

  it("guards stale credits policy replay because the canonical table is referral_credits", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const guardIndex = sql.indexOf("IF to_regclass('public.credits') IS NOT NULL THEN")
    const policyIndex = sql.indexOf('DROP POLICY IF EXISTS "credits_select_own"')

    expect(guardIndex).toBeGreaterThan(-1)
    expect(policyIndex).toBeGreaterThan(guardIndex)
  })

  it("creates and later drops temporary priority upsell conversions", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE public.priority_upsell_conversions")
    const policyIndex = sql.indexOf('DROP POLICY IF EXISTS "doctors_view_all_conversions"')
    const dropIndex = sql.indexOf("DROP TABLE IF EXISTS public.priority_upsell_conversions")

    expect(tableIndex).toBeGreaterThan(-1)
    expect(policyIndex).toBeGreaterThan(tableIndex)
    expect(dropIndex).toBeGreaterThan(policyIndex)
  })

  it("keeps legacy delivery tracking message type until template backfill replays", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const tableIndex = sql.indexOf("CREATE TABLE IF NOT EXISTS delivery_tracking")
    const legacyColumnIndex = sql.indexOf("message_type TEXT", tableIndex)
    const replayIndex = sql.indexOf("20260131062800_fix_delivery_tracking_template_type.sql")
    const backfillIndex = sql.indexOf("SET template_type = message_type", replayIndex)

    expect(tableIndex).toBeGreaterThan(-1)
    expect(legacyColumnIndex).toBeGreaterThan(tableIndex)
    expect(backfillIndex).toBeGreaterThan(legacyColumnIndex)
  })

  it("drops retired ARTG products with dependent legacy intake columns", () => {
    const sql = readFileSync(BASELINE_PATH, "utf8")

    const fkIndex = sql.indexOf("selected_artg_id TEXT REFERENCES public.artg_products(artg_id)")
    const dropIndex = sql.indexOf("DROP TABLE IF EXISTS public.artg_products CASCADE")

    expect(fkIndex).toBeGreaterThan(-1)
    expect(dropIndex).toBeGreaterThan(fkIndex)
  })
})
