import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814180000_historical_auto_issued_review_lane.sql",
  ),
  "utf8",
)
const lanePage = readFileSync(
  join(process.cwd(), "app/admin/ops/historical-auto-issued-review/page.tsx"),
  "utf8",
)
const detailPage = readFileSync(
  join(process.cwd(), "app/admin/intakes/[id]/page.tsx"),
  "utf8",
)
const action = readFileSync(
  join(process.cwd(), "app/actions/historical-auto-issued-review.ts"),
  "utf8",
)
const opsPage = readFileSync(join(process.cwd(), "app/admin/ops/page.tsx"), "utf8")
const opsModel = readFileSync(join(process.cwd(), "lib/admin/ops-action-model.ts"), "utf8")

function functionBody(name: string): string {
  const start = migration.indexOf(`CREATE FUNCTION public.${name}`)
  const end = migration.indexOf("$function$;", start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return migration.slice(start, end)
}

describe("fixed historical auto-issued review SQL contract", () => {
  it("pins the exact reportable decision-time cohort without hardcoded production case IDs", () => {
    expect(migration).toContain("i.ai_approved IS TRUE")
    expect(migration).toContain("i.category = 'medical_certificate'")
    expect(migration).toContain("'2026-05-12T13:35:54Z'::timestamptz")
    expect(migration).toContain("'2026-08-10T13:35:54Z'::timestamptz")
    expect(migration).toContain("coalesce(i.exclude_from_reporting, false) IS FALSE")
    expect(migration).toContain("latest_draft.content #>> '{flags,requiresReview}' = 'true'")
    expect(migration).toContain("draft.created_at <= i.ai_approved_at")
    expect(migration).toContain("flag ->> 'code' = 'draft_review_flag'")
    expect(migration).toContain("flag ->> 'source' = 'auto_approval'")
    expect(migration).toContain("coalesce(i.reference_number, '') !~* '^E2E-'")
    expect(migration).not.toMatch(/WHERE\s+i\.id\s+IN\s*\(/i)
  })

  it("keeps the lane and both mutations service-role only", () => {
    expect(migration).toContain("REVOKE ALL ON public.v_historical_auto_issued_review_source")
    expect(migration).toContain("FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("GRANT SELECT ON public.v_historical_auto_issued_review_source TO service_role")
    for (const name of [
      "get_historical_auto_issued_review_lane()",
      "open_historical_auto_issued_review_case(uuid, uuid)",
      "record_historical_auto_issued_no_correction(uuid, uuid)",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${name}`)
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${name}`)
    }
    expect(migration.match(/SET search_path = pg_catalog, public/g)?.length).toBe(3)
  })

  it("requires an active admin and a same-actor contextual open of the exact version", () => {
    const open = functionBody("open_historical_auto_issued_review_case")
    const receipt = functionBody("record_historical_auto_issued_no_correction")
    for (const body of [open, receipt]) {
      expect(body).toContain("profile.auth_user_id IS NOT NULL")
      expect(body).toContain("v_actor_role IS DISTINCT FROM 'admin'")
    }
    expect(receipt).toContain("opened.actor_id = p_actor_id")
    expect(receipt).toContain("'historical_auto_issued_draft_review'")
    expect(receipt).toContain("opened.event_data ->> 'certificate_storage_version'")
    expect(receipt).toContain("opened.event_data ->> 'certificate_id'")
    expect(receipt).toContain("RETURN 'case_not_opened'")
  })

  it("serializes with revoke using intake then certificate locks and reasserts current state", () => {
    const receipt = functionBody("record_historical_auto_issued_no_correction")
    const intakeLock = receipt.indexOf("SELECT intake.id, intake.status")
    const certificateLock = receipt.indexOf(
      "SELECT certificate.id, certificate.status, certificate.storage_path",
    )
    expect(intakeLock).toBeGreaterThan(-1)
    expect(certificateLock).toBeGreaterThan(intakeLock)
    expect(receipt.match(/FOR UPDATE/g)?.length).toBe(2)
    expect(receipt).toContain("v_source.current_certificate_id IS DISTINCT FROM")
    expect(receipt).toContain("v_source.current_certificate_storage_version IS DISTINCT FROM")
    expect(receipt).toContain("v_source.current_certificate_status <> 'valid'")
  })

  it("writes append-only exact-version evidence and never mutates clinical or document state", () => {
    const receipt = functionBody("record_historical_auto_issued_no_correction")
    expect(migration).toContain("compliance_historical_auto_issued_review_receipt_unique")
    expect(migration).toContain(
      "receipt.event_data ->> 'certificate_id' =\n        latest_certificate.id::text",
    )
    expect(migration).toMatch(
      /intake_id,\s+\(\(event_data ->> 'certificate_id'\)\),\s+\(\(event_data ->> 'certificate_storage_version'\)\)/,
    )
    expect(migration).toContain("event_data ->> 'certificate_storage_version'")
    expect(receipt).toContain("INSERT INTO public.compliance_audit_log")
    expect(receipt).toContain("'no_correction_required'")
    expect(receipt).toContain("WHEN unique_violation")
    expect(receipt).not.toMatch(/UPDATE\s+(public\.)?(intakes|issued_certificates|document_drafts)/i)
    expect(receipt).not.toContain("email_outbox")
    expect(receipt).not.toContain("provider")
  })
})

describe("historical review surface contract", () => {
  it("is admin-only from discovery through mutation", () => {
    expect(lanePage).toContain('requireRole(["admin"]')
    expect(action).toContain('{ roles: ["admin"], name: "historical-auto-issued-no-correction" }')
    expect(detailPage).toContain('requireRole(["admin"]')
    expect(opsPage).toContain("isAdmin\n      ? getHistoricalAutoIssuedReviewLane")
    expect(opsModel).toContain("args.isAdmin && args.historicalReview")
    expect(action).not.toContain('roles: ["doctor"')
    expect(action).not.toContain('roles: ["support"')
  })

  it("opens one full case at a time and offers no bulk completion", () => {
    expect(lanePage).toContain("prefetch={false}")
    expect(lanePage).toContain("buildHistoricalAutoIssuedReviewCaseHref")
    expect(lanePage).not.toContain("Checkbox")
    expect(lanePage).not.toMatch(/bulk/i)
    expect(detailPage).toContain("openHistoricalAutoIssuedReviewCase")
    expect(detailPage).toContain("historicalOpenOutcome === \"opened\"")
    expect(detailPage).toContain("viewerCanRevokeAutoIssued")
    expect(lanePage).toContain('timeZone: "Australia/Sydney"')
  })
})
