# Safe Scale Readiness Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining clinical, measurement, accounting, privacy, and canonical-truth blockers that prevent InstantMed from scaling revenue safely.

**Architecture:** Ship seven bounded releases with explicit database and domain boundaries instead of one cross-system rewrite. Clinical correction and Ads investigation state become transactional and durable; Stripe ingestion/reconciliation lands before dashboard/Ads readers switch to the shared cash-truth ledger; existing attribution is made exact and privacy-safe without building the deferred per-engine instrumentation system; and public/canonical copy is reconciled only after its owning implementation is true.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, TypeScript 5.9, Supabase PostgreSQL/RLS/RPCs, Stripe v22 webhooks, Google Ads Agent, Vitest, Playwright, Vercel Fluid Compute on Node 24.

## Global Constraints

- Fable must review and approve this plan before implementation begins.
- Use one branch and one draft PR per release. Start each branch from freshly fetched `origin/main`; mark it ready only after focused tests, `corepack pnpm release:check`, hosted CI, and any preview gate pass. Merge, deploy with the exact approval required below, then pass the release-specific production gate before starting a dependent release.
- Keep `GOOGLE_ADS_AGENT_MUTATIONS_ENABLED=false` and `TELEGRAM_ADS_APPROVALS_ENABLED=false`. No Ads proposal may be sent, approved, or applied without fresh approval for that exact immutable packet.
- Keep Weight Management organic-only. Do not add a paid campaign, paid keyword, medicine keyword, or paid landing destination for `/weight-loss`.
- Keep protocol medical-certificate issuance paused. This programme must not reactivate it, widen its eligibility, or present the atomic correction path as permission to do so.
- Do not build the signed AI-source cookie, AI intake side table, middleware denominator counter, per-engine revenue report, or AI experiment. The `AI Attribution Expansion Gate` in `CONTEXT.md` and `docs/ROADMAP.md` remains the only reopening mechanism.
- Preserve the programmatic SEO route descriptor shipped in PR #454. Do not reopen the nine-route SEO architecture or replace `defineProgrammaticSeoRoute`.
- Keep the keyed review email on the hardened direct 302. Do not add `/review`, an email interstitial, posted-review attribution, or a completion-rate claim.
- Treat review traversals and destination clicks as aggregate directional signals only. Never join them to external review totals or infer one-to-one completion.
- Every revenue, Ads, and attribution read must exclude seeded/test rows and `exclude_from_reporting` rows through `filterReportableIntakes()` or a helper that calls it.
- Revenue windows use Australia/Sydney boundaries. Purchases enter on `paid_at`; refunds and dispute withdrawals leave on their Stripe balance transaction `created` time; dispute reinstatements return on that balance transaction time. Cumulative intake refund fields remain payment-state snapshots, not closed-window revenue events.
- Use the gross `abs(balance_transaction.amount)` for dispute principal. Stripe dispute fees are operating costs, not net-retained order revenue, and must not be hidden inside dispute principal.
- No PHI, direct patient identifier, clinical reason, raw referrer path, click identifier, secret, or provider payload may enter Ads hold tables, cash-movement ledgers, logs, Sentry tags, PostHog properties, PR bodies, or command output. The service-only cash ledger may store only its opaque intake foreign key for reportable joins; it must never store or output patient/contact/clinical fields.
- New operational tables are RLS-enabled, have zero browser policies, revoke `PUBLIC`, `anon`, and `authenticated`, and grant only the minimum service-role verbs.
- Do not upgrade Next, React, Tailwind, Framer Motion, Node, pnpm, Stripe, or any other dependency in these releases.
- Edit `CLAUDE.md`, then run `scripts/sync-agent-doc.sh`; never hand-edit generated `AGENTS.md`.
- Any external listing edit, outreach send, Stripe endpoint subscription change, production migration, production deployment, Telegram send, or Google Ads change pauses for fresh operator approval at the exact-action boundary.

---

## Release map

| Release | Branch | Tasks | Dependency | Business outcome |
|---|---|---:|---|---|
| Phase -1 receipt | `codex/ads-brief-phase-minus-one-receipt` | production gate below | Fable approval | Restores decision-grade daily Ads evidence immediately, without changing the Ads account. |
| A | `codex/atomic-auto-issued-revocation` | 1 | none | Removes the live clinical split-brain risk in the historical correction path. |
| B | `codex/ads-attribution-holds` | 2-3 | none | Prevents recovered daily metrics from silently unlocking Scripts while attribution cause/correction work is unresolved. |
| C | `codex/stripe-disputes-acl` | 4 | none | Makes clean database replay match production's service-role-only dispute boundary. |
| D | `codex/stripe-cash-movement-ledger` | 5 | B + C merged | Records/reconciles immutable refund and dispute cash movements without changing business readers. |
| E | `codex/cash-aware-revenue` | 6 | D deployed + reconciled | Switches the revenue milestone and Ads contribution figures to verified cash events. |
| F | `codex/attribution-privacy-correctness` | 7-8 | none | Removes false AI classification and raw-referrer retention without premature measurement infrastructure. |
| G | `codex/canonical-growth-truth` | 9 | E merged | Aligns launch dates, directory/comparison material, review copy, and revenue claims with shipped truth. |

After each PR merges, delete only that merged branch and its worktree. PR #429 is currently closed, `DIRTY`, and has no auto-merge request; do not resurrect, force-merge, or delete its remote branch without a separate content/branch triage.

## Deliberately closed or deferred

- PR #454 already centralized the nine programmatic SEO routes. No SEO implementation remains in this programme.
- PR #439's soft-flag read/dedupe/error handling is sufficient while protocol issuance is paused. A database-atomic soft-flag merge, flagged-before-limit selection, behavioural persistence/order tests, retrospective sign-off, and Medical Director/legal decision are explicit pre-reactivation gates, not current build work.
- PR #441 established the correct privacy architecture: direct keyed-email redirect and allowlisted in-app destination choice. The dashboard nudge still needs the same two labelled actions as the delivered-document card; the other remaining work is unsupported copy, decorative star/prayer glyphs, and collapsing redundant `post_delivery` into the historical `review_cta` series.
- PR #419's historical PR description is not canonical product state. Repair the owning repository documents; do not mutate an old PR body as a substitute.
- The Vercel CLI upgrade is machine tooling, not part of any product release.

## Phase -1: Restore daily Ads proof before Release A

This is the first action after Fable approves the plan. PR #453 is already on `origin/main`; do not rebase its draft or rebuild its full-hour guard. The purpose here is to prove what is deployed and restart evidence collection before spending time on the remaining releases.

- [ ] **Step 1: Bind the production deployment to current main**

Fresh-fetch `origin/main`, record the exact commit containing PR #453, and read the production deployment SHA. If production is behind, present the exact deployment action and wait for approval before promoting current main. Do not bundle an Ads account change, migration, or unrelated release into this deployment.

- [ ] **Step 2: Prove both cron slots and the dedupe claim**

At the first complete post-approval schedule pair:

1. Confirm the 22:00 UTC invocation records a heartbeat and returns `outside_sydney_0900` at 08:00 Sydney.
2. Confirm the 23:00 UTC invocation creates exactly one run for the previous closed Sydney report date, one prepared snapshot/recommendation, one Telegram message ID, and one durable delivered receipt.
3. Confirm a repeated or delayed invocation for the same report date returns the existing claim disposition and does not send a second brief.
4. If 23:00 UTC produces no run after the deployed full-hour guard, classify it as `invocation never fired`; do not attribute it to the removed minute check. Inspect Vercel cron/runtime delivery as a distinct incident.
5. Do not backfill missing brief days. Restart the seven-consecutive-delivered-GREEN count at the first post-gap delivered day.
6. Record each receipt without customer, search-term, click-ID, or medicine data.

- [ ] **Step 3: Preserve the independent Scripts block**

Do not interpret GREEN as Scripts approval. Until Release B lands, the canonical `Attribution Investigation Hold` in `CONTEXT.md` and `docs/ROADMAP.md` remains the operator boundary. After Release B, the durable table enforces it mechanically.

- [ ] **Step 4: Fresh-read Ads and draft only current compliance pauses**

Run:

```bash
corepack pnpm ads:agent snapshot
corepack pnpm ads:agent deep-audit --days=30
```

Prepare separate local JSON packets only when that read proves a currently enabled issue: Med Cert ads with unsupported clinical/acceptance claims, and Scripts ads whose displayed price is misleading against live checkout. Limit each packet to exact `ad_status` pauses with account-baseline hash, current resource/text, compliance reason, bounded impact, and rollback value. Replacement RSAs are separate proposals, not a condition for a compliance pause. Weight Management remains absent.

- [ ] **Step 5: Stop at the exact-packet approval boundary**

Present each immutable packet, fresh account timestamp/hash, validate-only receipt, impact, and rollback. Do not send, approve, apply, or directly mutate Google Ads until the operator approves that exact packet. A read or draft is not mutation approval.

- [ ] **Step 6: Commit only verified receipts**

After the evidence exists, update `docs/ROADMAP.md` and `docs/OPERATIONS.md` with exact deployment/run dates and IDs, run `corepack pnpm doc:audit`, and commit on the Phase -1 receipt branch:

```bash
git add docs/ROADMAP.md docs/OPERATIONS.md
git commit -m "docs: record ads brief recovery receipts"
```

Merge that receipt PR and delete only its merged branch/worktree before starting Release A. An absent receipt is a failed Phase -1 gate, not documentation to fill speculatively.

### Task 1: Make auto-issued certificate correction one transaction

**Files:**

- Create: `supabase/migrations/20260811120000_revoke_auto_issued_certificate_atomically.sql`
- Create: `lib/__tests__/auto-issued-revoke-transaction-contract.test.ts`
- Create: `lib/__tests__/revoke-ai-approval.test.ts`
- Modify: `app/actions/revoke-ai-approval.ts`
- Modify: `e2e/medcert.auto-issued-revoke.spec.ts`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CLINICAL.md`
- Modify: `docs/TESTING.md`

**Interfaces:**

- Consumes: existing `validate_intake_status_transition` guard, `issued_certificates`, `certificate_audit_log`, `ai_audit_log`, `withServerAction`, `doctorHasCapability`, `createNotification`, `revalidateStaff`, and `revalidatePatient`.
- Produces: database function `public.revoke_auto_issued_certificate(p_intake_id uuid, p_actor_id uuid, p_reason text)` returning `outcome text, intake_id uuid, certificate_id uuid, patient_id uuid`, where `outcome` is exactly `revoked_and_reopened`, `already_reopened`, `intake_not_found`, `not_auto_issued`, `wrong_category`, `wrong_status`, or `certificate_not_found`.

- [ ] **Step 1: Write the failing transaction and action contracts**

Pin the database boundary and action shape before changing implementation:

```ts
expect(sql).toContain("create or replace function public.revoke_auto_issued_certificate")
expect(sql).toContain("for update")
expect(sql).toContain("set search_path = ''")
expect(sql).toContain("revoke all on function public.revoke_auto_issued_certificate")
expect(sql).toContain("grant execute on function public.revoke_auto_issued_certificate")
expect(actionSource).toContain('.rpc("revoke_auto_issued_certificate"')
expect(actionSource).not.toContain("revokeCertificateAction")
expect(actionSource).not.toContain('.from("intakes").update')
```

In `revoke-ai-approval.test.ts`, mock the wrapper's auth and service-role client and prove:

```ts
expect(await revokeAIApproval({ intakeId, reason: "Clinical correction" }))
  .toEqual({ success: false, error: "Unauthorized" })
expect(mockRpc).not.toHaveBeenCalled()

expect(mockRpc).toHaveBeenCalledWith("revoke_auto_issued_certificate", {
  p_actor_id: adminProfile.id,
  p_intake_id: intakeId,
  p_reason: "Clinical correction",
})
```

Also assert minimum five-character and maximum 2,000-character validation, capability denial, every domain outcome mapping, Supabase returned-error handling, notification only after success, and no reason value in logger/Sentry calls.

Notification tests must distinguish the first complete transition from an idempotent retry: `revoked_and_reopened` attempts one patient notification and inspects its returned result; `already_reopened` never emits a duplicate notification. A notification failure is logged as a bounded operational warning but does not misreport or roll back the completed clinical correction.

- [ ] **Step 2: Run the focused tests and observe the intended failures**

Run:

```bash
corepack pnpm vitest run \
  lib/__tests__/auto-issued-revoke-transaction-contract.test.ts \
  lib/__tests__/revoke-ai-approval.test.ts
```

Expected: FAIL because the RPC migration and direct action test do not exist and the action still performs a split revoke/update.

- [ ] **Step 3: Implement the transactional RPC**

Use `LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''`. Revoke execution from browser roles and grant it only to `service_role`. The body must use this order:

```sql
select p.id, p.role
into v_actor
from public.profiles as p
where p.id = p_actor_id
for update;

if v_actor.role is distinct from 'admin' then
  raise exception using errcode = '42501', message = 'admin actor required';
end if;

select i.id, i.status, i.ai_approved, i.category, i.patient_id
into v_intake
from public.intakes as i
where i.id = p_intake_id
for update;

select c.id, c.status
into v_certificate
from public.issued_certificates as c
where c.intake_id = p_intake_id
order by c.created_at desc
limit 1
for update;
```

Then enforce the exact domain rules:

1. Trim `p_reason`; reject lengths outside 5-2,000 with SQLSTATE `22023`.
2. Return `intake_not_found`, `not_auto_issued`, `wrong_category`, `wrong_status`, or `certificate_not_found` without changing data.
3. Accept only `approved` or the idempotent end state `in_review`.
4. For `approved`, accept only latest-certificate status `valid` or `revoked`; update a valid certificate to `revoked`, stamp `revoked_at`, `revoked_by`, `revocation_reason`, and insert one `certificate_audit_log` event.
5. Update the locked intake to `in_review` in the same transaction. The existing lifecycle trigger sees the revoked certificate before permitting the transition.
6. Insert at most one `ai_audit_log` reject event with metadata key `event = "auto_issued_revoked_to_review"`; the intake lock serializes the existence check.
7. If the intake is already `in_review` and the latest certificate is already `revoked`, return `already_reopened` without duplicate audits.
8. Return `revoked_and_reopened` for the first complete transition.

- [ ] **Step 4: Replace the split server action with the RPC**

Keep the current admin wrapper and capability check. Replace the intake read, nested `revokeCertificateAction`, direct update, and app-side audit insert with one RPC call:

```ts
const { data, error } = await supabase.rpc(
  "revoke_auto_issued_certificate",
  {
    p_actor_id: profile.id,
    p_intake_id: intakeId,
    p_reason: reason.trim(),
  },
)
```

Map the seven domain outcomes to the existing patient-safe errors. Treat `revoked_and_reopened` and `already_reopened` as success. Attempt the patient notification only for `revoked_and_reopened`, inspect `createNotification()`'s returned result, and record a bounded warning if that advisory delivery fails; never duplicate it for `already_reopened`. Revalidate staff/patient caches for both success outcomes. Log `intakeId`, `actorId`, and `outcome`; never log or attach the clinical reason.

- [ ] **Step 5: Strengthen behavioural proof**

Extend `medcert.auto-issued-revoke.spec.ts` with four database-backed cases:

1. Admin UI revocation leaves the latest certificate `revoked` and intake `in_review`.
2. A direct RPC call with the seeded doctor actor fails with SQLSTATE `42501` and changes neither row.
3. Wrong category, `ai_approved=false`, and wrong status return the matching domain outcomes and preserve the valid certificate.
4. Two concurrent RPC calls for the same eligible intake produce one `revoked_and_reopened` and one `already_reopened`, one certificate audit event, one AI audit event, and the same final state.

- [ ] **Step 6: Document the narrow boundary**

Record in `ARCHITECTURE.md` and `CLINICAL.md` that this RPC is the admin-only historical correction path, not ordinary certificate lifecycle and not a protocol-issuance reactivation. Add the E2E transaction/idempotency proof to `TESTING.md`.

- [ ] **Step 7: Verify Release A**

Run:

```bash
corepack pnpm vitest run \
  lib/__tests__/auto-issued-revoke-transaction-contract.test.ts \
  lib/__tests__/revoke-ai-approval.test.ts \
  lib/__tests__/ai-approval-reopen-guard.test.ts
PLAYWRIGHT=1 corepack pnpm exec playwright test e2e/medcert.auto-issued-revoke.spec.ts
corepack pnpm medcert:readiness:e2e
corepack pnpm db:check-migrations
corepack pnpm doc:audit
corepack pnpm release:check
```

Expected: all pass; non-admin direct use is rejected, concurrency is idempotent, and no state can contain a revoked certificate with an `approved` auto-issued intake.

- [ ] **Step 8: Commit Release A**

```bash
git add app/actions/revoke-ai-approval.ts \
  e2e/medcert.auto-issued-revoke.spec.ts \
  lib/__tests__/auto-issued-revoke-transaction-contract.test.ts \
  lib/__tests__/revoke-ai-approval.test.ts \
  supabase/migrations/20260811120000_revoke_auto_issued_certificate_atomically.sql \
  docs/ARCHITECTURE.md docs/CLINICAL.md docs/TESTING.md
git commit -m "fix(clinical): revoke auto-issued certificates atomically"
```

### Task 2: Persist durable service-level Ads attribution holds

**Files:**

- Create: `supabase/migrations/20260811123000_google_ads_attribution_holds.sql`
- Create: `lib/ads-agent/attribution-holds.ts`
- Create: `lib/operations/operator-reference.ts`
- Create: `lib/__tests__/google-ads-attribution-holds.test.ts`
- Modify: `lib/ads-agent/proposals.ts`
- Modify: `lib/__tests__/google-ads-agent-schema-contract.test.ts`
- Modify: `lib/__tests__/google-ads-agent-proposals.test.ts`

**Interfaces:**

- Consumes: `AdsService`, `AdsAgentSnapshot`, `DeliveredAdsAgentRunEvidence`, `resolveAdsCampaignService`, and the existing service-role control-plane pattern.
- Produces:

```ts
export type AdsAttributionHoldCause =
  | "measurement_error"
  | "genuine_cross_service"
  | "campaign_or_routing_defect"

export interface AdsAttributionHold {
  id: string
  service: Exclude<AdsService, "account">
  reasonCode: "CROSS_SERVICE_ATTRIBUTION"
  status: "open" | "resolved"
  openedRunId: string
  openedAt: string
  resolvedAt: string | null
}

export async function getOpenAdsAttributionHolds(
  supabase: SupabaseClient,
): Promise<AdsAttributionHold[]>

export async function openAdsAttributionHolds(args: {
  runId: string
  services: ReadonlySet<Exclude<AdsService, "account">>
  supabase: SupabaseClient
}): Promise<void>

export function getAdsAttributionEvidence(args: {
  run: DeliveredAdsAgentRunEvidence
  service: Exclude<AdsService, "account">
}): {
  expectedServiceOrders: number
  recognizedOrders: number
  expectedServiceOrderShare: number
}

export async function resolveAdsAttributionHold(args: {
  cause: AdsAttributionHoldCause
  correctionReference: string
  holdId: string
  operatorReference: string
  supabase: SupabaseClient
}): Promise<{
  consumed: boolean
  evidenceRunId: string
  expectedServiceOrderShare: number
  recognizedOrders: number
}>
```

- [ ] **Step 1: Write failing schema and domain tests**

Pin one open hold per service/reason, immutable opening evidence, service-role-only ACLs, strict resolution cause, and the resolution threshold:

```ts
expect(sql).toContain("create table public.google_ads_attribution_holds")
expect(sql).toContain("where status = 'open'")
expect(sql).toContain("expected_service_order_share >= 0.90")
expect(sql).toContain("recognized_orders >= 10")
expect(sql).toContain("revoke all on table public.google_ads_attribution_holds")
expect(sql).toContain("to service_role")
```

Domain tests must prove exact parsing, idempotent opening, read failure throwing, ambiguous/missing campaign evidence rejecting, 9 recognised orders rejecting, 89% rejecting, unknown cause impossible, fresh 90%/10 evidence resolving, and a second resolve returning `consumed: false`.

- [ ] **Step 2: Run the focused tests and observe failure**

```bash
corepack pnpm vitest run \
  lib/__tests__/google-ads-attribution-holds.test.ts \
  lib/__tests__/google-ads-agent-schema-contract.test.ts \
  lib/__tests__/google-ads-agent-proposals.test.ts
```

Expected: FAIL because the table and hold module do not exist.

- [ ] **Step 3: Create the PHI-free hold table**

The table must contain:

```sql
service text not null check (service in (
  'med_certs', 'scripts', 'ed', 'hair_loss', 'womens_health'
)),
reason_code text not null check (reason_code = 'CROSS_SERVICE_ATTRIBUTION'),
status text not null check (status in ('open', 'resolved')),
opened_run_id uuid not null references public.google_ads_agent_runs(id),
opened_at timestamptz not null default now(),
resolution_cause text check (resolution_cause in (
  'measurement_error', 'genuine_cross_service', 'campaign_or_routing_defect'
)),
correction_reference text,
evidence_run_id uuid references public.google_ads_agent_runs(id),
expected_service_order_share numeric(6,5),
recognized_orders integer,
resolution_actor_hash text,
resolved_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Add a partial unique index on `(service, reason_code) where status = 'open'`. Add a state-shape check: resolution fields are all null while open and all populated while resolved; resolved evidence requires share `>= 0.90`, recognised orders `>= 10`, and a 64-character actor hash. Enable RLS, create no browser policy, revoke all from `PUBLIC`, `anon`, `authenticated`, and `service_role`, then grant only `select, insert, update` to `service_role`. Add a trigger that permits only the single `open -> resolved` transition, rejects delete, and makes opening evidence and completed resolution evidence immutable.

- [ ] **Step 4: Centralize operator references**

Move the existing Codex reference regex and SHA-256 hashing into the provider-neutral operations primitive:

```ts
export function isCodexOperatorReference(value: string): boolean {
  return /^codex-task:[A-Za-z0-9_-]{4,128}$/.test(value)
}

export function hashOperatorReference(value: string): string {
  if (!isCodexOperatorReference(value)) {
    throw new Error("invalid_codex_operator_reference")
  }
  return createHash("sha256").update(value, "utf8").digest("hex")
}
```

Make `proposals.ts` consume these helpers so hold resolution, proposal decisions, and Task 5's reconciliation command cannot drift.

- [ ] **Step 5: Implement hold parsing, opening, evidence, and resolution**

`getAdsAttributionEvidence()` must select exactly one non-removed Search campaign that `resolveAdsCampaignService()` maps to the hold's service. Count only recognised service keys (`med_certs`, `scripts`, `ed`, `hair_loss`, `womens_health`), compute `expected / recognised`, and reject zero/multiple campaign evidence.

`resolveAdsAttributionHold()` must load the latest delivered run through `getLatestDeliveredAdsAgentRun()`. It must never accept user-supplied counts, shares, or a run ID. Validate `correctionReference` against `/^[a-z0-9][a-z0-9:_-]{7,255}$/`, require the closed cause enum, enforce the 10-order/90% threshold in TypeScript, then compare-and-set the open row to resolved with the evidence run and hashed operator reference.

Return the evidence values persisted by that compare-and-set. On an idempotent second resolve, return the already-persisted values with `consumed: false`; never recompute or print a different snapshot as though it cleared the hold.

- [ ] **Step 6: Verify and commit Task 2**

```bash
corepack pnpm vitest run \
  lib/__tests__/google-ads-attribution-holds.test.ts \
  lib/__tests__/google-ads-agent-schema-contract.test.ts \
  lib/__tests__/google-ads-agent-proposals.test.ts
corepack pnpm db:check-migrations
git add supabase/migrations/20260811123000_google_ads_attribution_holds.sql \
  lib/ads-agent/attribution-holds.ts lib/operations/operator-reference.ts \
  lib/ads-agent/proposals.ts \
  lib/__tests__/google-ads-attribution-holds.test.ts \
  lib/__tests__/google-ads-agent-schema-contract.test.ts \
  lib/__tests__/google-ads-agent-proposals.test.ts
git commit -m "feat(ads): persist attribution investigation holds"
```

### Task 3: Make Ads policy, cron, and CLI obey the durable hold

**Files:**

- Modify: `lib/ads-agent/policy.ts`
- Modify: `lib/ads-agent/brief.ts`
- Modify: `app/api/cron/google-ads-daily-brief/route.ts`
- Modify: `scripts/google-ads-agent.ts`
- Modify: `lib/__tests__/google-ads-agent-policy.test.ts`
- Modify: `lib/__tests__/google-ads-agent-brief.test.ts`
- Modify: `lib/__tests__/google-ads-agent-cron.test.ts`
- Modify: `lib/__tests__/google-ads-agent-cli-behavior.test.ts`
- Modify: `lib/__tests__/google-ads-agent-cli-contract.test.ts`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**

- Consumes: Task 2's `getOpenAdsAttributionHolds`, `openAdsAttributionHolds`, and `resolveAdsAttributionHold`.
- Produces:

```ts
export function evaluateAdsPolicy(
  snapshot: AdsAgentSnapshot,
  options?: {
    openAttributionHoldServices?: ReadonlySet<Exclude<AdsService, "account">>
  },
): AdsRecommendation[]
```

CLI commands:

```text
corepack pnpm ads:agent hold:list
corepack pnpm ads:agent hold:resolve --hold=3f67665c-8adc-4a42-a64f-708d62c2ee31 --cause=measurement_error --correction=google-ads-routing-fix-2026-08-11 --reference=codex-task:instantmed-ads-hold
```

- [ ] **Step 1: Write failing policy, cron, brief, and CLI tests**

Prove:

```ts
expect(evaluateAdsPolicy(greenScriptsSnapshot, {
  openAttributionHoldServices: new Set(["scripts"]),
})).toContainEqual({
  kind: "INVESTIGATE",
  proposedMutationFamily: null,
  reasonCodes: ["ATTRIBUTION_INVESTIGATION_HOLD"],
  service: "scripts",
})
```

Also prove the hold wins over `SCRIPTS_SCALE_GATES_PASSED`, remains visible when no campaign is mapped, a hold-read failure fails the daily run before Telegram, new `CROSS_SERVICE_ATTRIBUTION` opens a hold before send, and the brief renders `Attribution investigation remains open`.

CLI tests must prove closed cause validation, missing correction/reference rejection, JSON list output, resolution success output, and absence of Ads mutation calls from either hold command.

- [ ] **Step 2: Run tests and observe failure**

```bash
corepack pnpm vitest run \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/google-ads-agent-cron.test.ts \
  lib/__tests__/google-ads-agent-cli-behavior.test.ts \
  lib/__tests__/google-ads-agent-cli-contract.test.ts
```

- [ ] **Step 3: Enforce hold precedence in policy**

At the start of each `SERVICE_ORDER` iteration, before campaign-count or economics checks, emit `INVESTIGATE / ATTRIBUTION_INVESTIGATION_HOLD` and continue when the service is in the open set. This is what prevents a recovered rolling share or GREEN tracking state from producing Scripts scaling approval.

- [ ] **Step 4: Wire fail-closed cron ordering**

Use this exact order after the run claim:

```ts
const openHolds = await getOpenAdsAttributionHolds(supabase)
const baseSnapshot = await buildAdsAgentSnapshot({ now, supabase })
const tracking = await classifyDailyTracking({ now, snapshot: baseSnapshot, supabase })
const snapshot = { ...baseSnapshot, tracking }
const recommendations = evaluateAdsPolicy(snapshot, {
  openAttributionHoldServices: new Set(openHolds.map((hold) => hold.service)),
})
await openAdsAttributionHolds({
  runId,
  services: new Set(
    recommendations
      .filter((item) => item.reasonCodes.includes("CROSS_SERVICE_ATTRIBUTION"))
      .map((item) => item.service)
      .filter((service): service is Exclude<AdsService, "account"> => service !== "account"),
  ),
  supabase,
})
await markDailyAdsAgentRunPrepared({ recommendations, runId, snapshot, supabase })
```

Any hold read/open error must enter the existing failed-run receipt path and must not send Telegram.

- [ ] **Step 5: Add the two operator CLI commands**

`hold:list` returns open holds sorted by `opened_at`. `hold:resolve` accepts only the three cause values, calls Task 2's resolution helper, prints the persisted evidence run ID, recognised order count, and expected-service share, and never calls the Google Ads mutations module.

- [ ] **Step 6: Document the operating contract**

In `ARCHITECTURE.md`, document the table/module/policy flow. In `OPERATIONS.md`, document:

1. A daily threshold breach opens a durable service hold.
2. Later GREEN tracking and later share recovery do not clear it.
3. Resolution requires recorded cause, correction reference, latest delivered 30-day evidence at 90% across 10 recognised orders, and a Codex operator reference.
4. The independent seven-consecutive-GREEN-days scale gate still restarts after the production brief gap.
5. Scripts stays blocked until both gates pass.

- [ ] **Step 7: Verify Release B and commit Task 3**

```bash
corepack pnpm vitest run \
  lib/__tests__/google-ads-attribution-holds.test.ts \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/google-ads-agent-cron.test.ts \
  lib/__tests__/google-ads-agent-cli-behavior.test.ts \
  lib/__tests__/google-ads-agent-cli-contract.test.ts \
  lib/__tests__/google-ads-agent-schema-contract.test.ts
corepack pnpm doc:audit
corepack pnpm release:check
git add app/api/cron/google-ads-daily-brief/route.ts \
  scripts/google-ads-agent.ts lib/ads-agent/policy.ts lib/ads-agent/brief.ts \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/google-ads-agent-cron.test.ts \
  lib/__tests__/google-ads-agent-cli-behavior.test.ts \
  lib/__tests__/google-ads-agent-cli-contract.test.ts \
  docs/ARCHITECTURE.md docs/OPERATIONS.md
git commit -m "fix(ads): keep attribution investigations blocking"
```

### Task 4: Make `stripe_disputes` replay-safe and service-role-only

**Files:**

- Create: `supabase/migrations/20260811130000_harden_stripe_disputes_acl.sql`
- Create: `lib/__tests__/stripe-disputes-acl-contract.test.ts`
- Modify: `supabase/migrations/20240101000000_baseline.sql`
- Modify: `docs/SECURITY.md`

**Interfaces:**

- Consumes: existing `public.stripe_disputes` table.
- Produces: identical least-privilege ACL/policy truth for clean baseline replay and existing databases.

- [ ] **Step 1: Write the failing ACL contract**

Read both SQL files and require this posture in each:

```sql
alter table public.stripe_disputes enable row level security;
revoke all on table public.stripe_disputes
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.stripe_disputes
  to service_role;
create policy "Service role can manage disputes"
  on public.stripe_disputes
  for all
  to service_role
  using (true)
  with check (true);
```

Assert the baseline no longer contains a role-less `FOR ALL USING (true)` policy.

- [ ] **Step 2: Run the test and observe the baseline failure**

```bash
corepack pnpm vitest run lib/__tests__/stripe-disputes-acl-contract.test.ts
```

- [ ] **Step 3: Repair baseline and add the convergent tail migration**

Drop the old policy before recreating it. The tail migration must be idempotent, must not alter dispute rows, and must revoke inherited/default browser grants before the explicit service-role grant.

- [ ] **Step 4: Document clean-replay truth and verify Release C**

State in `SECURITY.md` that the live table and canonical baseline are service-role only, with no patient/admin browser policy. Run:

```bash
corepack pnpm vitest run lib/__tests__/stripe-disputes-acl-contract.test.ts
corepack pnpm db:check-migrations
corepack pnpm doc:audit
corepack pnpm release:check
git add supabase/migrations/20240101000000_baseline.sql \
  supabase/migrations/20260811130000_harden_stripe_disputes_acl.sql \
  lib/__tests__/stripe-disputes-acl-contract.test.ts docs/SECURITY.md
git commit -m "fix(security): harden dispute table replay ACLs"
```

### Task 5: Record refunds and dispute principal in one immutable cash-movement ledger

**Files:**

- Create: `supabase/migrations/20260811133000_stripe_cash_movements.sql`
- Create: `lib/stripe/cash-movements.ts`
- Create: `app/api/stripe/webhook/handlers/refund-cash-movement.ts`
- Create: `app/api/stripe/webhook/handlers/charge-dispute-funds.ts`
- Create: `app/api/stripe/webhook/handlers/charge-dispute-closed.ts`
- Create: `scripts/reconcile-stripe-cash-movements.ts`
- Create: `lib/__tests__/stripe-cash-movements.test.ts`
- Modify: `app/api/stripe/webhook/handlers/charge-refunded.ts`
- Modify: `app/api/stripe/webhook/handlers/charge-dispute-created.ts`
- Modify: `app/api/stripe/webhook/handlers/index.ts`
- Modify: `lib/__tests__/stripe-webhook-handler-parity-contract.test.ts`
- Modify: `lib/__tests__/stripe-webhook-payment-state.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: Stripe `refund.created`, `refund.updated`, existing `charge.refunded`, `charge.dispute.created`, `charge.dispute.funds_withdrawn`, `charge.dispute.funds_reinstated`, and `charge.dispute.closed`; Refund/Dispute balance transactions; existing `stripe_disputes` and intake payment state; Task 2's `hashOperatorReference` primitive.
- Produces:

```ts
export type StripeCashMovementType =
  | "refund"
  | "dispute_withdrawal"
  | "dispute_reinstatement"

export async function recordRefundCashMovement(args: {
  event: Stripe.Event
  stripe: Stripe
  supabase: SupabaseClient
}): Promise<{ recorded: boolean; balanceTransactionId: string | null; intakeId: string | null }>

export async function recordDisputeCashMovement(args: {
  direction: "withdrawal" | "reinstatement"
  event: Stripe.Event
  stripe: Stripe
  supabase: SupabaseClient
}): Promise<{ recorded: boolean; balanceTransactionId: string; intakeId: string | null }>
```

Database table `public.stripe_cash_movements` and function `public.close_stripe_dispute(p_dispute_id text, p_status text, p_outcome text, p_resolved_at timestamptz)`.

Stripe recommends `refund.created` for refund detail, and the Refund object exposes its balance transaction. Stripe's dispute events identify withdrawal/reinstatement, and the Dispute object exposes the associated balance transactions. Pin the implementation to [Stripe refund events](https://docs.stripe.com/refunds), [Stripe Refund object](https://docs.stripe.com/api/refunds/object), [Stripe event types](https://docs.stripe.com/api/events/types), and [Stripe Dispute object](https://docs.stripe.com/api/disputes/object).

- [ ] **Step 1: Write failing movement, idempotency, mode, and state tests**

Required cash cases:

```ts
expect(refundMovement.type).toBe("refund")
expect(refundMovement.amountCents).toBe(995)
expect(withdrawalMovement.amountCents).toBe(2495)
expect(reinstatementMovement.amountCents).toBe(2495)
expect(withdrawalMovement.occurredAt).toBe("2026-08-11T01:02:03.000Z")
```

Prove two successive partial refunds create two movements on their own balance-transaction dates; repeated `refund.created`/`refund.updated` events do not duplicate them; a pending refund with no balance transaction records nothing and its later successful update records once; failed/cancelled refunds never reduce revenue; duplicate dispute event/balance IDs are idempotent; two disputes on one payment remain distinct; and missing intake links remain null for reconciliation.

Prove uniqueness is scoped by `livemode`, test/live fixtures with otherwise identical IDs remain distinct, non-AUD is retained but later fails business truth closed, insert failure throws for Stripe retry, `won` conditionally restores payment state, `lost` stays disputed, and another open/lost dispute prevents restoration.

Reconciliation tests must prove dry-run by default, `--apply` plus a valid `codex-task:` reference before writes, balance-transaction idempotency against webhook rows, bounded PHI-free output, and no provider payload persistence.

- [ ] **Step 2: Run focused tests and observe failure**

```bash
corepack pnpm vitest run \
  lib/__tests__/stripe-cash-movements.test.ts \
  lib/__tests__/stripe-webhook-payment-state.test.ts \
  lib/__tests__/stripe-webhook-handler-parity-contract.test.ts
```

- [ ] **Step 3: Create the immutable service-only ledger**

Use this schema:

```sql
create table public.stripe_cash_movements (
  id uuid primary key default gen_random_uuid(),
  livemode boolean not null,
  ingestion_source text not null check (ingestion_source in ('webhook', 'reconciliation')),
  stripe_event_id text,
  stripe_balance_transaction_id text not null,
  stripe_source_object_id text not null,
  movement_type text not null check (movement_type in (
    'refund', 'dispute_withdrawal', 'dispute_reinstatement'
  )),
  intake_id uuid references public.intakes(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  occurred_at timestamptz not null,
  reconciliation_reference_hash text,
  created_at timestamptz not null default now(),
  unique (livemode, stripe_balance_transaction_id)
);
```

Add a partial unique index on `(livemode, stripe_event_id) where stripe_event_id is not null` and a source-shape check: webhook rows require an event ID and no reconciliation hash; reconciliation rows require a null event ID and a 64-character hash. Add indexes on `(livemode, occurred_at)`, `intake_id`, and `(livemode, movement_type, stripe_source_object_id)`.

Enable RLS, create no browser policies, revoke all roles, then grant only `select, insert` to `service_role`. A delete trigger always raises `immutable Stripe cash movement`. An update trigger rejects every change except the foreign-key-driven `intake_id: non-null -> null` tombstone created by hard deletion of a retained intake; every cash and source field remains immutable. Contract-test that one tombstone so `ON DELETE SET NULL` cannot block the retention job.

- [ ] **Step 4: Implement exact refund and dispute recording**

For `refund.created` and `refund.updated`, retrieve/expand the Refund when needed. Record only status `succeeded` with a negative balance transaction. Use `movement_type = "refund"`, the refund ID as source object, `abs(balance_transaction.amount)`, its lower-case currency, and its `created` time. Pending/requires-action/failed/cancelled refunds return `recorded: false` and write nothing; a succeeded refund with a missing/non-negative balance transaction fails for retry/reconciliation rather than inventing a timestamp or amount.

For dispute withdrawal/reinstatement, retrieve the Dispute with `balance_transactions` expanded. Select the previously unrecorded transaction in `event.livemode` whose sign matches the event: negative for withdrawal and positive for reinstatement. Store the dispute ID, `abs(amount)`, currency, and balance-transaction creation time.

Resolve the intake from current payment/dispute linkage, then charge -> payment intent -> intake. Keep null when no match exists; Task 6 fails business truth closed until reconciliation. Do not call `tryClaimEvent()` before the ledger insert: the ledger's mode-scoped event/balance IDs own idempotency, and retrieval/insert errors must return a webhook failure so Stripe retries.

- [ ] **Step 5: Register the handlers and make payment-state writes honest**

Register:

```ts
["refund.created", handleRefundCashMovement],
["refund.updated", handleRefundCashMovement],
["charge.dispute.funds_withdrawn", handleChargeDisputeFundsWithdrawn],
["charge.dispute.funds_reinstated", handleChargeDisputeFundsReinstated],
["charge.dispute.closed", handleChargeDisputeClosed],
```

Keep `charge.refunded` as the payment-state/customer-notification owner, but inspect every Supabase result and do not use cumulative `refund_amount_cents`/`refunded_at` as the reporting event source after Task 6. On a synchronous state-write error, record the event error and add its existing bounded payload to the DLQ before returning non-2xx; the approved admin replay path bypasses the original claim and must heal idempotently. Make `charge-dispute-created.ts` use the same error/DLQ discipline before conversion retraction or alert continuation.

`charge-dispute-closed.ts` calls `close_stripe_dispute`. The RPC locks dispute and intake, updates status/outcome/resolution time, and restores `payment_status` from cumulative refund state only for a won dispute when no other open or lost dispute remains. Use a guarded `disputed` compare-and-set. This state repair is separate from the immutable cash ledger.

- [ ] **Step 6: Add a dry-run-first historical reconciliation command**

Add `stripe:cash:reconcile` to `package.json`. The command auto-paginates live succeeded Refunds and live Disputes, expands balance transactions, resolves only payment/intake identifiers, and compares their mode-scoped balance IDs with the ledger. Default output is counts and total cents by movement type plus unresolved-link count; no patient, email, clinical, search, click, or raw provider fields.

`--apply` requires `--reference=codex-task:<task-id>`, stores only its SHA-256 hash, and inserts missing rows with `ingestion_source = "reconciliation"`. It never modifies existing rows. Production apply is a separate exact-action approval in Task 10.

- [ ] **Step 7: Verify Release D and commit Task 5**

```bash
corepack pnpm vitest run \
  lib/__tests__/stripe-cash-movements.test.ts \
  lib/__tests__/stripe-webhook-payment-state.test.ts \
  lib/__tests__/stripe-webhook-handler-parity-contract.test.ts \
  lib/__tests__/google-ads-attribution-contract.test.ts
corepack pnpm db:check-migrations
git add supabase/migrations/20260811133000_stripe_cash_movements.sql \
  lib/stripe/cash-movements.ts scripts/reconcile-stripe-cash-movements.ts \
  app/api/stripe/webhook/handlers/refund-cash-movement.ts \
  app/api/stripe/webhook/handlers/charge-refunded.ts \
  app/api/stripe/webhook/handlers/charge-dispute-created.ts \
  app/api/stripe/webhook/handlers/charge-dispute-funds.ts \
  app/api/stripe/webhook/handlers/charge-dispute-closed.ts \
  app/api/stripe/webhook/handlers/index.ts \
  lib/__tests__/stripe-cash-movements.test.ts \
  lib/__tests__/stripe-webhook-payment-state.test.ts \
  lib/__tests__/stripe-webhook-handler-parity-contract.test.ts package.json
git commit -m "feat(payments): ledger Stripe cash movements"
```

### Task 6: Make revenue milestones and Ads economics consume cash truth

**Files:**

- Create: `lib/data/stripe-cash-movements.ts`
- Create: `lib/__tests__/stripe-cash-movements-read.test.ts`
- Modify: `lib/data/net-retained-purchase-value.ts`
- Modify: `lib/data/revenue-dashboard.ts`
- Modify: `lib/monitoring/revenue-safety.ts`
- Modify: `lib/ads-agent/types.ts`
- Modify: `lib/ads-agent/snapshot.ts`
- Modify: `lib/ads-agent/brief.ts`
- Modify: `lib/admin/business-trends.ts`
- Modify: `lib/__tests__/net-retained-purchase-value.test.ts`
- Modify: `lib/__tests__/revenue-dashboard.test.ts`
- Modify: `lib/__tests__/google-ads-agent-snapshot.test.ts`
- Modify: `lib/__tests__/google-ads-agent-brief.test.ts`
- Modify: `lib/__tests__/business-trends.test.ts`
- Modify: `docs/REVENUE_MODEL.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/OPERATIONS.md`
- Modify: `docs/TESTING.md`

**Interfaces:**

- Consumes: Task 5's immutable cash ledger and existing reportable-intake filter.
- Produces:

```ts
export interface ReportableStripeCashMovement {
  amountCents: number
  movementType: "refund" | "dispute_withdrawal" | "dispute_reinstatement"
  intake: {
    id: string
    category: string | null
    subtype: string | null
    campaignid: string | null
    utm_id: string | null
    utm_source: string | null
    utm_medium: string | null
    gclid: string | null
    gbraid: string | null
    wbraid: string | null
  }
  occurredAt: string
}

export type StripeCashMovementsRead =
  | { availability: "available"; movements: ReportableStripeCashMovement[] }
  | {
      availability: "unavailable"
      movements: []
      reason: "query_failed" | "unlinked_intake" | "invalid_currency" | "invalid_record"
    }
```

`buildNetRetainedPurchaseValue()` consumes `cashMovementRows` and returns `refundCents`, `disputeWithdrawalCents`, and `disputeReinstatementCents`. Cumulative intake refund fields remain payment-state inputs only.

- [ ] **Step 1: Write failing closed-window cash-accounting tests**

Pin these cases:

1. Two partial refunds on different days subtract only their individual amounts on those days.
2. An old paid order refunded today makes today's net negative without moving its purchase date.
3. An old paid order disputed today makes today's net negative.
4. A later dispute win restores revenue on the reinstatement date, not the close date.
5. Two disputes on one payment both count; duplicate balance IDs never do.
6. Future and test-mode movements are excluded.
7. Non-AUD or unlinked live movements make revenue unavailable rather than silently disappearing.
8. A cash-ledger query failure makes both dashboard revenue and Ads economics unavailable.
9. Seeded and `exclude_from_reporting` intake movements are excluded through `filterReportableIntakes()`.

Use the canonical formula:

```ts
netCents =
  grossCents
  - refundCents
  - disputeWithdrawalCents
  + disputeReinstatementCents
```

- [ ] **Step 2: Run tests and observe failure**

```bash
corepack pnpm vitest run \
  lib/__tests__/stripe-cash-movements-read.test.ts \
  lib/__tests__/net-retained-purchase-value.test.ts \
  lib/__tests__/revenue-dashboard.test.ts \
  lib/__tests__/google-ads-agent-snapshot.test.ts \
  lib/__tests__/business-trends.test.ts
```

- [ ] **Step 3: Build the one reportable cash reader**

Read only `livemode = true` movements by `occurred_at`, then fetch their intake IDs through a `filterReportableIntakes(supabase.from("intakes")...)` query. Join only safe acquisition/service fields in memory. Return unavailable for a null intake, invalid row, non-AUD currency, or either query error. Do not treat unknown as zero. Signed test-mode proof remains service-role-visible but can never enter business truth.

- [ ] **Step 4: Replace cumulative refund reporting in the dashboard**

Add cash fields to revenue windows, trend periods, service mix, and daily buckets. Stop reading `refund_amount_cents`/`refunded_at` for revenue math; retain them only for payment/customer state. Include `partially_refunded`, `refunded`, and `disputed` in purchase-status eligibility so the original paid event remains counted once while cash movements adjust value on their own dates.

`resolveRevenueDashboardSourceAvailability()` must require paid and cash-movement reads for `revenue: "available"`. Recent-payment and order counts continue to count each purchase once. A cash-source failure makes milestone/profit unavailable, never zero or stale-green.

- [ ] **Step 5: Extend Ads campaign economics without cohort leakage**

Read cash movements independently for the daily and rolling-30 windows. Attribute each movement to the linked intake's Google campaign fields, including movements against purchases paid before the window. Keep the existing `refundCents` field but replace its cumulative-intake source with individual cash movements. Add to `CampaignEconomics` and `CampaignPortfolioEconomics`:

```ts
disputeWithdrawalCents: number | null
disputeReinstatementCents: number | null
```

Add `CASH_MOVEMENTS_UNAVAILABLE` to `CampaignAvailabilityReason`. Campaign net retained and contribution use the dashboard formula. If cash truth is unavailable, contribution is null and Ads policy cannot scale.

- [ ] **Step 6: Keep the UI compact while exposing the method**

Do not add a dashboard card. Update the existing profit method text in `business-trends.ts` to say net retained includes individual refunds and dispute withdrawals/reinstatements on Stripe balance-transaction dates. Existing net, milestone, chart, and contribution surfaces become correct without visual bloat.

- [ ] **Step 7: Document the accounting owner**

In `REVENUE_MODEL.md`, make the event formula canonical, distinguish dispute principal from Stripe dispute fees, and mark cumulative intake refund fields as state rather than reporting events. In `ARCHITECTURE.md`, document webhook/reconciliation -> immutable ledger -> reportable reader -> dashboard/Ads. In `OPERATIONS.md`, add unresolved-link reconciliation and subscription verification for the new refund/dispute events. In `TESTING.md`, record successive-partial-refund and closed-window fixtures.

- [ ] **Step 8: Verify Release E and commit Task 6**

```bash
corepack pnpm vitest run \
  lib/__tests__/stripe-cash-movements.test.ts \
  lib/__tests__/stripe-cash-movements-read.test.ts \
  lib/__tests__/net-retained-purchase-value.test.ts \
  lib/__tests__/revenue-dashboard.test.ts \
  lib/__tests__/google-ads-agent-snapshot.test.ts \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/business-trends.test.ts
corepack pnpm doc:audit
corepack pnpm release:check
git add lib/data/stripe-cash-movements.ts \
  lib/data/net-retained-purchase-value.ts lib/data/revenue-dashboard.ts \
  lib/monitoring/revenue-safety.ts lib/ads-agent/types.ts \
  lib/ads-agent/snapshot.ts lib/ads-agent/brief.ts \
  lib/admin/business-trends.ts \
  lib/__tests__/stripe-cash-movements-read.test.ts \
  lib/__tests__/net-retained-purchase-value.test.ts \
  lib/__tests__/revenue-dashboard.test.ts \
  lib/__tests__/google-ads-agent-snapshot.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/business-trends.test.ts \
  docs/REVENUE_MODEL.md docs/ARCHITECTURE.md docs/OPERATIONS.md docs/TESTING.md
git commit -m "fix(revenue): account from Stripe cash movements"
```

### Task 7: Replace substring AI detection with one exact classifier

**Files:**

- Create: `lib/analytics/ai-source.ts`
- Create: `lib/__tests__/ai-source.test.ts`
- Modify: `lib/analytics/ai-referral.ts`
- Modify: `lib/analytics/source-classification.ts`
- Modify: `lib/__tests__/attribution-source-classification.test.ts`
- Modify: `lib/__tests__/posthog-personless-analytics.test.ts`

**Interfaces:**

- Consumes: existing `detectAIReferral`, `trackAIReferral`, and `classifyAttributionSource` call sites.
- Produces:

```ts
export type AiSource = "chatgpt" | "perplexity" | "gemini" | "copilot" | "claude"
export type AiSourceMatch = {
  engine: AiSource
  label: "ChatGPT" | "Perplexity" | "Gemini" | "Copilot" | "Claude"
  matchedBy: "utm_source" | "referrer"
}

export function classifyAiSource(input: {
  referrer?: string | null
  utmSource?: string | null
}): AiSourceMatch | null
```

- [ ] **Step 1: Write the exact positive and negative matrix**

Positive hosts are only `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, and `claude.ai`, matched as exact host or subdomain suffix after URL parsing. The only UTM positive is exact normalized `chatgpt.com`.

Required negatives:

```ts
[
  { utmSource: "youtube" },
  { utmSource: "meta" },
  { utmSource: "bing" },
  { utmSource: "gemini_test" },
  { referrer: "https://openai.com/research" },
  { referrer: "https://chatgpt.com.evil.example/" },
  { referrer: "not a url" },
]
```

Assert both live consumers agree on the AI/non-AI branch.

- [ ] **Step 2: Run tests and observe substring false positives**

```bash
corepack pnpm vitest run \
  lib/__tests__/ai-source.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
```

- [ ] **Step 3: Implement the pure classifier and replace both lists**

Normalize UTM by trim/lowercase and compare the whole value. Parse referrer with `new URL()`, strip leading `www.`, and use `host === domain || host.endsWith("." + domain)`. Do not accept `utm_campaign`, path substrings, first-label tokens, `you.com`, Meta, Poe, Kagi, Phind, old Bard/ChatGPT hosts, or bare Bing until production/vendor evidence promotes them.

`trackAIReferral()` emits only:

```ts
posthog.capture("ai_referral", {
  ai_source: match.engine,
  matched_by: match.matchedBy,
  landing_page: window.location.pathname,
})
```

Remove raw `referrer` and `utm_source` PostHog properties.

- [ ] **Step 4: Verify and commit Task 7**

```bash
corepack pnpm vitest run \
  lib/__tests__/ai-source.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
git add lib/analytics/ai-source.ts lib/analytics/ai-referral.ts \
  lib/analytics/source-classification.ts lib/__tests__/ai-source.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
git commit -m "fix(analytics): classify AI referrals exactly"
```

### Task 8: Sanitize referrers before persistence and retire premature AI instrumentation

**Files:**

- Modify: `lib/analytics/attribution-storage.ts`
- Modify: `lib/analytics/attribution.ts`
- Modify: `lib/analytics/middleware-attribution.ts`
- Modify: `lib/analytics/server-attribution.ts`
- Modify: `lib/observability/scrub-phi.ts`
- Modify: `lib/__tests__/attribution-storage.test.ts`
- Modify: `lib/__tests__/attribution.test.ts`
- Modify: `lib/__tests__/middleware-attribution.test.ts`
- Modify: `lib/__tests__/sentry-phi-scrubber.test.ts`
- Move: `docs/plans/2026-07-30-attribution-enum-spec.md` into `docs/plans/archive/`, preserving the basename
- Modify: `docs/plans/archive/README.md`
- Modify: `docs/plans/2026-07-30-ai-organic-growth-plan.md`
- Modify: `docs/bookkeeping/file-map.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SECURITY.md`

**Interfaces:**

- Consumes: Task 7's classifier and the existing 30-day attribution record.
- Produces:

```ts
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function sanitizeAttributionReferrer(
  value: string | null | undefined,
  siteOrigin?: string,
): string | null

export function attributionRemainingLifetimeSeconds(
  capturedAt: string | null | undefined,
  now?: Date,
): number
```

- [ ] **Step 1: Write failing privacy and lifetime tests**

Required referrer outcomes:

```ts
expect(sanitizeAttributionReferrer(
  "https://chatgpt.com/c/private-thread?prompt=health",
)).toBe("https://chatgpt.com")
expect(sanitizeAttributionReferrer(
  "https://instantmed.com.au/request?symptom=private",
)).toBe("/request")
expect(sanitizeAttributionReferrer("not a url")).toBeNull()
```

Across cookie, localStorage, sessionStorage, checkout normalization, and Sentry, prove external paths/query/fragments never persist. Prove malformed, missing-`captured_at`, and older-than-30-day legacy values are cleared/ignored. Prove a ten-day-old record is rewritten with approximately 20 days remaining, not a fresh 30 days. Add `Referer` and `referrer` header/object cases to the Sentry test.

- [ ] **Step 2: Run focused tests and observe failures**

```bash
corepack pnpm vitest run \
  lib/__tests__/attribution-storage.test.ts \
  lib/__tests__/attribution.test.ts \
  lib/__tests__/middleware-attribution.test.ts \
  lib/__tests__/sentry-phi-scrubber.test.ts
```

- [ ] **Step 3: Centralize sanitization and expiry**

For an InstantMed same-origin referrer, retain pathname only. For an external parsed URL, retain origin only. For invalid input, retain nothing. When source classification needs the original URL, classify it transiently in memory first, then discard it and persist only the sanitized value. Call the sanitizer before middleware cookie serialization, browser storage writes, server cookie merging, PostHog properties, and database normalization.

On every browser read, remove invalid/expired sessionStorage and localStorage entries and expire the cookie with `Max-Age=0`. On every rewrite of an existing attribution touch, derive remaining lifetime from validated `captured_at`. A genuinely new paid/UTM touch receives a new capture time and a fresh 30-day lifetime.

- [ ] **Step 4: Close the Sentry referrer gap**

Add both normalized keys to both sets:

```ts
SENSITIVE_HEADER_KEYS.add("referer")
SENSITIVE_HEADER_KEYS.add("referrer")
SENSITIVE_KEY_EXACT.add("referer")
SENSITIVE_KEY_EXACT.add("referrer")
```

This removes entire header/object values rather than relying on pattern-based query scrubbing.

- [ ] **Step 5: Archive the superseded prospective specification**

Move the specification to `docs/plans/archive/`, add an archive-index row stating that the operator deferred prospective per-engine capture behind the `AI Attribution Expansion Gate`, and update the parent plan so:

1. classifier/privacy fixes are active and implemented by this release;
2. signed cookie, side table, denominator counter, per-engine order/revenue reporting, and experiment are deferred;
3. no pending rank-1 reopening or CLAUDE capture expansion is implied;
4. the parent uses the archived path for historical adjudication links;
5. `docs/ROADMAP.md` remains the sole activation authority.

- [ ] **Step 6: Verify Release F and commit Task 8**

```bash
corepack pnpm vitest run \
  lib/__tests__/ai-source.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/attribution-storage.test.ts \
  lib/__tests__/attribution.test.ts \
  lib/__tests__/middleware-attribution.test.ts \
  lib/__tests__/sentry-phi-scrubber.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
corepack pnpm doc:audit
corepack pnpm release:check
ATTRIBUTION_SPEC_BASENAME=2026-07-30-attribution-enum-spec.md
git add lib/analytics/attribution-storage.ts lib/analytics/attribution.ts \
  lib/analytics/middleware-attribution.ts lib/analytics/server-attribution.ts \
  lib/observability/scrub-phi.ts \
  lib/__tests__/attribution-storage.test.ts lib/__tests__/attribution.test.ts \
  lib/__tests__/middleware-attribution.test.ts \
  lib/__tests__/sentry-phi-scrubber.test.ts \
  "docs/plans/archive/${ATTRIBUTION_SPEC_BASENAME}" \
  "docs/plans/${ATTRIBUTION_SPEC_BASENAME}" \
  docs/plans/archive/README.md docs/plans/2026-07-30-ai-organic-growth-plan.md \
  docs/bookkeeping/file-map.md docs/ARCHITECTURE.md docs/SECURITY.md
git commit -m "fix(privacy): sanitize attribution before persistence"
```

### Task 9: Reconcile launch, clinical, directory, revenue, and review truth

**Files:**

- Modify: `CLAUDE.md`
- Regenerate: `AGENTS.md` with `scripts/sync-agent-doc.sh`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/BUSINESS_PLAN.md`
- Modify: `docs/CLINICAL.md`
- Modify: `docs/REVENUE_MODEL.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/OPERATIONS.md`
- Modify: `docs/SEO_CONTENT_POLICY.md`
- Modify: `docs/SERVICE_LAUNCH_CHECKLISTS.md`
- Modify: `docs/SECURITY.md`
- Modify: `app/weight-loss/weight-loss-client.tsx`
- Modify: `components/marketing/weight-loss-online-landing.tsx`
- Modify: `lib/__tests__/project-docs-drift-contract.test.ts`
- Modify: `docs/audits/2026-07-09-comparison-surface-submission-kit.md`
- Modify: `docs/runbooks/NHSD_REGISTRATION.md`
- Modify: `docs/plans/2026-07-30-ai-organic-growth-plan.md`
- Modify: `docs/plans/2026-07-30-p0-1-outreach-drafts.md`
- Modify: `docs/plans/2026-08-07-weight-loss-launch-plan.md`
- Modify: `docs/bookkeeping/file-map.md`
- Create: `components/patient/review-destination-actions.tsx`
- Modify: `components/patient/review-ask-card.tsx`
- Modify: `components/patient/review-nudge-card.tsx`
- Modify: `app/heard-thanks/page.tsx`
- Modify: `app/api/review-redirect/route.ts`
- Modify: `lib/__tests__/review-cta-destination-contract.test.ts`
- Modify: `lib/__tests__/review-redirect-dimensions-contract.test.ts`
- Modify: `lib/__tests__/review-redirect-privacy.test.ts`

**Interfaces:**

- Consumes: PR #447 merge time `2026-08-10T09:46:22Z` (19:46 AEST), Task 6's cash-movement-aware revenue implementation, `getApprovedClaim("clinical_review_sequence")`, `getApprovedClaim("availability_24_7")`, and the already-shipped review redirect architecture.
- Produces: one consistent canonical launch date, paste-safe comparison/NHSD material, accurate revenue-source claims, and neutral review copy without changing redirect destinations or safety behavior.

- [ ] **Step 1: Write the drift/copy tests first**

Pin these facts:

```ts
for (const source of [
  claude,
  architecture,
  businessPlan,
  clinical,
  revenueModel,
  roadmap,
  serviceLaunchChecklists,
  weightLaunchPlan,
]) {
  expect(source).toContain("2026-08-10")
  expect(source).not.toMatch(/(?:launched|live)[^\n]{0,40}2026-08-07/i)
}
expect(launchPlanPath).toContain("2026-08-07-weight-loss-launch-plan.md")
expect(reviewAskCard).not.toMatch(/sign-in at the end/i)
expect(reviewNudgeCard).not.toMatch(/sign-in at the end/i)
expect(heardThanksPage).not.toMatch(/[⭐🙏]/u)
expect(reviewAskCard).toContain('medium="review_cta"')
expect(reviewNudgeCard).toContain('medium="review_card"')
expect(reviewRedirectRoute).not.toContain('"post_delivery"')
expect(reviewDestinationActions).toContain('token: "productreview"')
expect(reviewDestinationActions).toContain('token: "google"')
expect(reviewNudgeCard).toContain("ReviewDestinationActions")
expect(roadmap).toContain("90 closed days")
expect(operations).toContain("100 keyed delivered requests")
```

The dated launch-plan filename remains unchanged because August 7 is when the plan/infrastructure was prepared; only claims of production availability move to August 10.

- [ ] **Step 2: Correct Weight Management go-live truth**

Change only statements that say launched/live/joined the active hierarchy on August 7 to August 10. Preserve true August 7 facts such as the operator decisions, capability migration, clinical safety decisions, and launch-plan filename. In the launch plan, replace the obsolete still-gated authority sentence and `EXECUTED 2026-08-07` status with a reference-only record stating that decisions/preparation began August 7 and PR #447 made the service production-live August 10. Update the two source comments that call the service live since August 7.

Edit `CLAUDE.md`, run:

```bash
bash scripts/sync-agent-doc.sh
```

and assert generated `AGENTS.md` is byte-aligned.

- [ ] **Step 3: Repair comparison and NHSD source material**

In the comparison kit:

- rename `Submission-ready fact sheet` to `Operator-review fact sheet`;
- replace both `issued only if clinically appropriate after doctor review` instances with `issued only when clinically appropriate`;
- keep every external-send boundary and re-verification requirement.

Replace the NHSD description with this exact 450-character block:

```text
InstantMed provides telehealth medical certificates, repeat prescriptions, and ED, hair-loss, women's-health and weight-management pathways for Australian adults. Patients complete a secure online form. Medical-certificate and prescribing requests require doctor review before any certificate or prescription is issued. Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume.
```

Remove the stale `weight loss is unlaunched` maintenance line. Make the header/body agree that repository copy is repaired but still requires fresh operator approval and live listing/certification verification before publication.

- [ ] **Step 4: Reconcile parent, outreach, file map, and revenue claims**

Remove banners saying the kit/runbook remain unrepaired. Keep every send individually approval-gated. Because Release E is a dependency, change the parent plan's dashboard statement to say individual refund and dispute cash movements are included from the immutable Stripe ledger; do not imply per-channel AI revenue is available.

Update `file-map.md` descriptions for the comparison kit, NHSD runbook, archived P0.2 spec, AI parent plan, and weight-management launch plan so no row contradicts file status.

Replace the mid-August review decision checkpoint in `ROADMAP.md` and `OPERATIONS.md` with a gate that requires both 90 closed days after PR #441's production deployment and at least 100 keyed delivered review requests. Keep the externally verified platform total as a separate directional trend. A zero-review interval is never a standalone rollback condition, and traversals/destination clicks are never a completion denominator.

- [ ] **Step 5: Replace unsupported review-flow copy without changing routing**

Use this exact paragraph in both in-app review cards:

```text
An honest review, good or bad, helps other people decide. Choose whichever you prefer. A couple of sentences is plenty. Please leave out personal or medical details because reviews are public.
```

Create one compact `ReviewDestinationActions` primitive that renders ProductReview first and Google second as text-labelled buttons. It accepts only the closed source/medium types already used by the two cards, builds `/api/review-redirect` URLs with an explicit allowlisted destination, and owns no analytics or external URL itself. Use it in both `ReviewAskCard` and `ReviewNudgeCard`; keep the nudge's dismiss/show analytics unchanged.

For `ReviewAskCard`, change `utm_medium` from `post_delivery` to the already-recorded `review_cta`; the source already distinguishes `patient_intake_detail` from `patient_documents`. Keep `ReviewNudgeCard` on `patient_dashboard / review_card`. Remove `post_delivery` from `REVIEW_MEDIA` and update the dimension/privacy fixtures. Keep every source, campaign, destination, redirect status, privacy header, and all other media unchanged. This preserves one historical CTA series instead of maintaining a redundant dimension.

On `/heard-thanks`, change the CTA to `Leave a Google review` and the footer to `Already reviewed? Thanks for helping.` Remove only the star and prayer glyphs; do not change its destination or attribution behavior before the checkpoint.

- [ ] **Step 6: Run compliance, doc, and browser verification**

```bash
corepack pnpm vitest run \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/review-cta-destination-contract.test.ts \
  lib/__tests__/review-redirect-dimensions-contract.test.ts \
  lib/__tests__/review-redirect-privacy.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/voice-guard.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts
corepack pnpm doc:audit
corepack pnpm release:check
```

Then run the app on port 3060 and verify `/heard-thanks` plus both review cards at 390x844 and 1440x900 in light and dark. Run `e2e/patient-portal.visual.spec.ts` and inspect intentional copy/action snapshot changes on documents, intake, and dashboard surfaces. Confirm keyboard focus, 44px mobile targets, no star/review-count UI, both labelled destinations in both in-app cards, and no console/network errors.

- [ ] **Step 7: Commit Release G**

```bash
git add CLAUDE.md AGENTS.md docs/ARCHITECTURE.md \
  docs/BUSINESS_PLAN.md docs/CLINICAL.md \
  docs/REVENUE_MODEL.md docs/ROADMAP.md docs/OPERATIONS.md \
  docs/SEO_CONTENT_POLICY.md \
  docs/SERVICE_LAUNCH_CHECKLISTS.md docs/SECURITY.md \
  app/weight-loss/weight-loss-client.tsx \
  components/marketing/weight-loss-online-landing.tsx \
  lib/__tests__/project-docs-drift-contract.test.ts \
  docs/audits/2026-07-09-comparison-surface-submission-kit.md \
  docs/runbooks/NHSD_REGISTRATION.md \
  docs/plans/2026-07-30-ai-organic-growth-plan.md \
  docs/plans/2026-07-30-p0-1-outreach-drafts.md \
  docs/plans/2026-08-07-weight-loss-launch-plan.md \
  docs/bookkeeping/file-map.md \
  components/patient/review-destination-actions.tsx \
  components/patient/review-ask-card.tsx \
  components/patient/review-nudge-card.tsx app/heard-thanks/page.tsx \
  app/api/review-redirect/route.ts \
  lib/__tests__/review-cta-destination-contract.test.ts \
  lib/__tests__/review-redirect-dimensions-contract.test.ts \
  lib/__tests__/review-redirect-privacy.test.ts
git commit -m "docs: reconcile launch and growth truth"
```

### Task 10: Deploy in order, prove the control plane, and prepare pause packets

Run this task incrementally after each release merges; it is not permission to batch six unverified releases into one production change.

**Files:**

- Modify after verified production evidence: `docs/ROADMAP.md`
- Modify after verified production evidence: `docs/OPERATIONS.md`
- No Google Ads account mutation in this task without a second, exact-packet approval.

**Interfaces:**

- Consumes: each merged Release A-G as it becomes available, Vercel production cron, Supabase migration receipts, Stripe endpoint configuration, latest delivered Ads run, Google Ads read-only account state, and existing immutable proposal tooling.
- Produces: production receipts, a restarted shadow-proof streak, one open Scripts attribution hold until explicit resolution, and at most two local pause-packet drafts.

- [ ] **Step 1: Apply migrations in dependency order with explicit approval**

After the operator approves each production action, apply and verify the matching migration immediately before that release's application deployment; do not wait to batch them:

1. `20260811120000_revoke_auto_issued_certificate_atomically.sql`
2. `20260811123000_google_ads_attribution_holds.sql`
3. `20260811130000_harden_stripe_disputes_acl.sql`
4. `20260811133000_stripe_cash_movements.sql`

Run `corepack pnpm db:check-migrations`, linked schema lint, table/function ACL queries, and Supabase security/performance advisors after each database release. Deploy the matching application only after its migration is verified, pass its production gate, then continue to any dependent release.

- [ ] **Step 2: Verify Stripe event delivery and reconcile before trusting cash accounting**

Read the production webhook endpoint configuration and confirm it delivers:

```text
refund.created
refund.updated
charge.refunded
charge.dispute.created
charge.dispute.funds_withdrawn
charge.dispute.funds_reinstated
charge.dispute.closed
```

If any event is absent, present the exact endpoint configuration diff and wait for approval before changing Stripe. Prove signed test-mode refund/withdrawal/reinstatement ingestion in an isolated preview/test database; its `livemode = false` rows must be absent from preview business values and must never be inserted into production as test evidence.

Then run the production command without `--apply`:

```bash
corepack pnpm stripe:cash:reconcile
```

If the dry run finds missing live movements, present its exact counts/cents, unresolved-link count, and the proposed `--apply --reference=codex-task:<task-id>` command. Wait for approval before writing. Do not mark revenue cash-aware until endpoint receipts, isolated signed-event proof, a zero-missing post-apply reconciliation, and zero unresolved live links exist.

- [ ] **Step 3: Re-prove the two-slot contract with the durable hold overlay**

After Release B reaches production:

1. Confirm the 22:00 UTC invocation records a heartbeat and returns `outside_sydney_0900` at 08:00 Sydney.
2. Confirm the 23:00 UTC invocation creates exactly one run for the closed report date, one prepared snapshot/recommendation, one Telegram message ID, and one durable delivered receipt.
3. Confirm a delayed/repeated invocation for that report date returns the existing claim disposition and does not send a second brief.
4. Confirm Scripts remains `INVESTIGATE / ATTRIBUTION_INVESTIGATION_HOLD` even if tracking is GREEN.
5. Confirm a newly detected cross-service breach opens its durable hold before Telegram delivery.
6. Preserve Phase -1's no-backfill streak start; deployment of Release B does not reset or manufacture evidence days.

- [ ] **Step 4: Record production truth without prematurely clearing gates**

Update `ROADMAP.md` and `OPERATIONS.md` with exact migration/deployment/run IDs and dates only after each receipt exists. Keep the Scripts hold open until its cause, correction, latest delivered 30-day evidence, and operator resolution satisfy the table contract.

- [ ] **Step 5: Refresh the Phase -1 Ads evidence before any later pause action**

Run the read-only evidence commands:

```bash
corepack pnpm ads:agent snapshot
corepack pnpm ads:agent deep-audit --days=30
```

Refresh the Phase -1 packets only when current enabled ads still prove the issue:

1. Med Cert ads with unsupported clinical/acceptance claims.
2. Scripts ads whose displayed price is misleading against the live checkout price.

Each packet must contain only `ad_status` pause operations for the exact current resource names, an account-baseline hash, current text/value, compliance reason, bounded impact, and rollback value. Stronger replacement RSAs are separate proposals and are not a condition for immediate compliance pause.

- [ ] **Step 6: Stop at the exact-packet approval boundary**

Present both packet diffs, fresh account timestamp/hash, validate-only receipt, impact, and rollback to the operator. Do not run `proposal:send`, `approve`, `apply`, or any direct Google Ads mutation until the operator approves each exact packet. Weight Management remains absent from every paid packet.

- [ ] **Step 7: Final production verification**

Verify:

- the historical auto-issued correction function definition and ACLs, plus an authorised call with a generated nonexistent intake UUID returning `intake_not_found` and changing no patient, certificate, notification, or audit row;
- open Ads holds are readable only to service-role tooling;
- `stripe_disputes` and `stripe_cash_movements` deny browser roles;
- signed test-mode refund/withdrawal/reinstatement rows are present only in the isolated test ledger and absent from business values; production reconciliation reports zero missing/unlinked live movements; closed-window fixtures prove event dates in CI;
- AI negative fixtures remain non-AI in production analytics code;
- stored external referrers contain origins only;
- `/heard-thanks` and patient review cards match the approved copy;
- no new Sentry, Vercel, Stripe webhook DLQ, Supabase advisor, or PostHog privacy errors appear.

Commit the production-receipt-only doc update after evidence exists:

```bash
git add docs/ROADMAP.md docs/OPERATIONS.md
git commit -m "docs: record safe scale production receipts"
```

## Programme completion gate

The programme is complete only when all seven releases are merged and deployed, their production receipts exist, and the following remain true:

- no revoked auto-issued certificate can be stranded on an approved intake;
- Scripts cannot emit scaling approval while an attribution investigation hold is open;
- clean database replay cannot expose `stripe_disputes`;
- dashboard milestone and Ads contribution values include each refund and dispute principal movement on its actual balance-transaction date;
- AI classification uses exact evidence-backed sources and raw external referrer paths are absent from client storage, checkout rows, PostHog, and Sentry;
- canonical docs say Weight Management launched August 10, 2026, while preserving August 7 preparation/decision history;
- review routing remains hardened and measurement remains directional;
- protocol issuance, Weight paid acquisition, and all Google Ads mutations remain separately gated.
