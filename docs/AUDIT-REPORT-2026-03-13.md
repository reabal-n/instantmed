# InstantMed Platform Audit Report — 13 March 2026

> Full audit using MCP integrations (Sentry, Stripe, Vercel, Supabase), codebase exploration, and documentation review.

---

## Executive Summary

InstantMed is a **well-architected** Australian telehealth platform with strong security foundations (PHI encryption, RLS, rate limiting, webhook verification), clear clinical boundaries, and solid integrations. **One critical build blocker** was identified and fixed. Several recommendations remain for hardening, observability, and documentation alignment.

---

## 1. Critical Fix (Completed)

### Build failure — TypeScript error in patient intake client

**File:** `app/patient/intakes/[id]/client.tsx` line 103.  
**Error:** `Property 'key' does not exist on type 'never'`.

**Cause:** When `displayFields` was `[]` (no med cert, script, or consult), TypeScript inferred `never[]`. The fallback `[field.key]` referenced a property that doesn't exist on `never`.

**Fix applied:** Added explicit `DisplayField` type and used `field.keys` directly (all field types use `keys`).

**Result:** Build now passes.

---

## 2. Vercel Deployment Status

| Finding | Status |
|--------|--------|
| Latest 2 production deployments | **ERROR** (build failure due to above fix) |
| Last successful production | `dpl_ENmqrtTtFETf9XD6PzwuZtrjNFio` (commit e4de951) |
| Rollback candidate | Available |

**Recommendation:** Push the fix and redeploy. Production should recover once the TypeScript fix is merged.

---

## 3. Sentry

| Finding | Status |
|--------|--------|
| Unresolved issues (last 30 days) | No issues found |
| Organization | instantmed |
| Region | us.sentry.io |

**Recommendation:** Configure Sentry `project` option to enable release creation and source map uploads (see build warnings).

---

## 4. Stripe Integration

| Aspect | Status |
|--------|--------|
| Webhook idempotency | ✅ Atomic `try_process_stripe_event` RPC |
| Webhook signature verification | ✅ `stripe.webhooks.constructEvent()` |
| Event deduplication | ✅ Event ID logging |
| Legacy fallback | ⚠️ `legacyClaimEvent()` still present; should be removed once RPC is deployed everywhere |

**Recommendation:** Remove `legacyClaimEvent()` path once production is confirmed stable. Add Sentry capture when legacy path is hit.

---

## 5. Security & Compliance

### High priority

| Item | Location | Recommendation |
|------|----------|----------------|
| **SECURITY.md vs implementation** | Rate limit fallback | SECURITY.md says "in-memory Map (100 actions/hour)" but `lib/rate-limit/redis.ts` uses **fail-open** (allow) when Redis is down. Align docs or add in-memory fallback. |
| **Plaintext Medicare** | `lib/data/profiles.ts` | TODO to remove plaintext `medicare_number` by 2026-06-01. Track and complete. |

### Medium priority

| Item | Location | Recommendation |
|------|----------|----------------|
| **document_drafts.edited_content_enc** | Migration | Column created; app-layer encryption TBD. |
| **SECURITY.md PHI gap** | `atomicApproveCertificate` | Docs say RPC writes `patient_name` only; code **already** passes `p_patient_name_enc`. Update SECURITY.md. |

### Low priority

| Item | Recommendation |
|------|----------------|
| **AHPRA validation** | Format check only; no real AHPRA lookup. Document as acceptable for MVP. |
| **IV length** | Consider standardising to 12 bytes (NIST GCM) in `lib/security/encryption.ts` if not already. |

---

## 6. CI & Testing

| Finding | Status |
|--------|--------|
| Unit tests | 672 passed |
| Security audit | `pnpm audit --audit-level=critical` (not moderate as in audit plan) |
| Lint | 18 warnings (0 errors) |

**Recommendations:**
- Fix lint warnings (unused vars, imports) — see Task 12/14 in `docs/plans/2026-03-06-platform-audit-fixes.md`.
- Consider raising audit level to `high` if acceptable for your dependency tree.

---

## 7. Observability (OPERATIONS.md)

| Gap | Recommendation |
|-----|----------------|
| 5 crons without Sentry capture | Wrap cron handlers in `Sentry.captureException` on failure. |
| `intake_id` not in Sentry tags | Add `Sentry.setTag("intake_id", id)` in critical paths. |
| No checkout latency tracking | Add PostHog or custom metric for checkout duration. |

---

## 8. Audit Plan Status

| Plan | Tasks | Status |
|------|-------|--------|
| `docs/plans/2026-03-06-platform-audit-fixes.md` | 15 tasks (P0–P3) | Partially complete; CI security already at `critical`; consult validators exist; many tasks pending |

**Recommendation:** Prioritise Phase 1 (P0) tasks: payment failure email, checkout expired email, console.log removal.

---

## 9. Quick Wins

| Action | Effort | Impact |
|--------|--------|--------|
| Fix build (TypeScript) | Done | Unblocks production |
| Update SECURITY.md (PHI RPC) | 5 min | Doc accuracy |
| Remove unused imports (18 lint warnings) | 30 min | Cleaner codebase |
| Fix Sentry project config | 10 min | Better error attribution |
| Align rate limit fallback docs | 15 min | Security clarity |

---

## 10. Summary

**Strengths:** Clear architecture, strong security (PHI, RLS, rate limits), webhook idempotency, clinical boundaries, audit logging.

**Immediate:** Build fix applied; push and redeploy. Production should recover.

**Next:** Execute audit plan Phase 1–2, fix lint warnings, align SECURITY.md with implementation, and improve observability.
