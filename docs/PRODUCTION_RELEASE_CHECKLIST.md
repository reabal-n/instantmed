# InstantMed Production Release Checklist

Use this checklist before promoting dashboard, payment, clinical, or patient-flow changes.

## 1. Quality Gates

- Use Node 24 from `.nvmrc` / `.node-version` for local release checks.
- `pnpm check:node`
- `pnpm release:check` (Node, stack pins, route conflicts, orphaned files, audit, lint, typecheck, unit tests, production build, bundle budget)
- `pnpm check:staff-roles` (read-only Supabase gate: exactly one auth-linked human admin, owner-admin doctor identity complete, future doctors scoped as doctors)
- If the staff-role gate fails only because of extra human admin rows, dry-run first: `DEMOTE_ADMIN_EMAILS='old-admin@example.com' DEMOTE_ADMIN_ROLE=patient pnpm fix:staff-roles`, then apply with `-- --apply` after reviewing the target list.
- `pnpm check:sentry` (verifies the configured Sentry org/project token before relying on release/error telemetry)
- `PLAYWRIGHT=1 pnpm exec playwright test e2e/payment-smoke.spec.ts e2e/stripe-webhook.spec.ts e2e/parchment-webhook.spec.ts --project=chromium --workers=1 --reporter=list`
- `PLAYWRIGHT=1 pnpm exec playwright test e2e/operator.viewport.spec.ts e2e/operator.visual.spec.ts --project=chromium --workers=1 --reporter=list`
- `PLAYWRIGHT=1 pnpm exec playwright test e2e/medical-certificate.spec.ts --project=chromium --workers=1 --reporter=list`
- After deployment, sign in once as the owner-admin and open `/dashboard` before walking away from dashboard or clinical-ops changes.

## 2. Dashboard Gates

- Admin, doctor, and patient dashboard audit passes without retries.
- Staff cockpit pages stay bounded and scannable at 1440x900: `/admin`, `/admin/ops`, `/admin/intakes`, and the review panel.
- Dashboard axe checks pass for authenticated admin, doctor, and patient surfaces.
- Mobile dashboard screenshots match the committed baselines.
- No console errors, page errors, 404s, or generic error states appear in dashboard audit output.
- Legacy `/doctor/queue` links redirect to `/dashboard` with review filters preserved.
- Admin-doctor operators are not forced through separate admin/doctor mode switching.
- The single human admin profile is also the reviewing doctor profile: provider number, AHPRA number, signature, availability, and `parchment_user_id` are complete on that same profile. Future doctors use `role=doctor`, not another admin profile.
- `pnpm check:staff-roles` passes against the target Supabase project before promotion.

## 3. Clinical Safety Gates

- Doctor identity gating blocks approval until provider and AHPRA identity are complete.
- Owner-admin clinical actions pass through the same doctor capability path as doctors, while future doctors remain scoped by per-service capability flags.
- Decline, approve, refund, and document delivery paths are verified against seeded E2E data.
- Medical certificate future-date guards are covered in app validation, render/preview/reissue paths, and the `issued_certificates_start_date_not_future` DB constraint.
- Retired medical certificate expiry jobs are absent from Vercel cron config, heartbeat monitoring, routes, and tests.
- Certificate verification codes, certificate references, Medicare numbers, and patient email addresses are not sent as analytics event properties or non-essential log/metadata fields.
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
- `pnpm check:sentry` passes with the same Sentry env vars used by the deployment.
- Dashboard degraded-read monitor is active in production.
- Authenticated `/dashboard` production smoke runs after deploy with the owner-admin session cookie and does not show the generic error shell.
- The latest Business Alerts run reports `auth_email_failures: 0` and no `auth_email_delivery_failed` alert for recent `magiclink` or `recovery` sends.
- Cron jobs for stale queue, retry auto-approval, email dispatcher, and reconciliation are enabled.
- Supabase backups and PITR status are confirmed.
- Rollback target is known before promotion.

## 6. Launch Decision

Release only if:

- All quality gates pass.
- No high-severity accessibility, auth, payment, PHI, or clinical-audit findings remain.
- Dashboard readiness is at least 9.5/10.
- Any residual risk has an owner, deadline, and rollback plan.
