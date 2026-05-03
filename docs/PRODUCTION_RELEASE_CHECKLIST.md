# InstantMed Production Release Checklist

Use this checklist before promoting dashboard, payment, clinical, or patient-flow changes.

## 1. Quality Gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm exec vitest run`
- `PLAYWRIGHT=1 pnpm exec playwright test e2e/payment-smoke.spec.ts e2e/stripe-webhook.spec.ts e2e/parchment-webhook.spec.ts --project=chromium --workers=1 --reporter=list`
- `PLAYWRIGHT=1 pnpm exec playwright test e2e/dashboard-audit.spec.ts --project=chromium --workers=1 --reporter=list`
- `PLAYWRIGHT=1 pnpm exec playwright test e2e/medical-certificate.spec.ts --project=chromium --workers=1 --reporter=list`
- `pnpm build`

## 2. Dashboard Gates

- Admin, doctor, and patient dashboard audit passes without retries.
- Dashboard axe checks pass for authenticated admin, doctor, and patient surfaces.
- Mobile dashboard screenshots match the committed baselines.
- No console errors, page errors, 404s, or generic error states appear in dashboard audit output.
- Legacy `/doctor/queue` links redirect to `/doctor/dashboard` with review filters preserved.

## 3. Clinical Safety Gates

- Doctor identity gating blocks approval until provider and AHPRA identity are complete.
- Decline, approve, refund, and document delivery paths are verified against seeded E2E data.
- Auto-approved and AI-assisted queues degrade to empty read models if optional read paths fail.
- Clinical decision actions still write audit logs.
- No PHI appears in browser console, Sentry extras, PostHog event payloads, or server logs.

## 4. Payments And Webhooks

- Stripe checkout, success, cancellation, and refund smoke paths pass in the target environment.
- Webhook DLQ page loads and unresolved webhook count is reviewed before release.
- CSP allows required Google Ads, Analytics, Stripe, PostHog, Supabase, and Sentry endpoints.
- Idempotency keys are present on payment creation and retry paths.
- Reconciliation dashboard shows no unexplained payment or delivery mismatch.

## 5. Operations

- Sentry release is set for the deployment.
- Dashboard degraded-read monitor is active in production.
- Cron jobs for stale queue, retry auto-approval, daily digest, and reconciliation are enabled.
- Supabase backups and PITR status are confirmed.
- Rollback target is known before promotion.

## 6. Launch Decision

Release only if:

- All quality gates pass.
- No high-severity accessibility, auth, payment, PHI, or clinical-audit findings remain.
- Dashboard readiness is at least 9.5/10.
- Any residual risk has an owner, deadline, and rollback plan.
