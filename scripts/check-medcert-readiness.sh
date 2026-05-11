#!/usr/bin/env bash
set -euo pipefail

export PLAYWRIGHT="${PLAYWRIGHT:-1}"
export PLAYWRIGHT_WORKERS="${PLAYWRIGHT_WORKERS:-1}"
export MEDCERT_READINESS_STATIC="${MEDCERT_READINESS_STATIC:-1}"
export MEDCERT_READINESS_BROWSER="${MEDCERT_READINESS_BROWSER:-1}"

if [ "$MEDCERT_READINESS_STATIC" = "1" ]; then
  echo "== Med cert readiness: lint =="
  pnpm lint

  echo "== Med cert readiness: typecheck =="
  pnpm typecheck

  echo "== Med cert readiness: unit contracts =="
  pnpm test run \
    lib/__tests__/med-cert-validation.test.ts \
    lib/__tests__/med-cert-checkout-contract.test.ts \
    lib/__tests__/med-cert-medicolegal-scope.test.ts \
    lib/__tests__/medical-certificate-policy.test.ts \
    lib/__tests__/unsupported-med-cert-pathway.test.ts \
    lib/__tests__/approval-invariants.test.ts \
    lib/__tests__/auto-approval.test.ts \
    lib/__tests__/auto-approval-state.test.ts \
    lib/__tests__/auto-approval-pipeline.test.ts \
    lib/__tests__/stripe-post-payment.test.ts \
    lib/__tests__/stripe-webhook.test.ts \
    lib/__tests__/stripe-webhook-paid-state-guards.test.ts \
    lib/__tests__/stripe-webhook-payment-state.test.ts \
    lib/__tests__/stripe-payment-integrity.test.ts \
    lib/__tests__/stripe-checkout-retry.test.ts \
    lib/__tests__/email/email-dispatcher.test.ts \
    lib/__tests__/email-templates.test.tsx \
    lib/__tests__/email-template-slug-contract.test.ts \
    lib/__tests__/email-hub-ops-contract.test.ts \
    lib/__tests__/email-reconstruct-contract.test.ts \
    lib/__tests__/resend-webhook-contract.test.ts
else
  echo "== Med cert readiness: static checks skipped =="
fi

if [ "$MEDCERT_READINESS_BROWSER" = "1" ]; then
  echo "== Med cert readiness: browser and webhook contracts =="
  pnpm exec playwright test --project=chromium \
    e2e/medcert.auto-approval.spec.ts \
    e2e/medcert.approval.spec.ts \
    e2e/medcert.email-pipeline.spec.ts \
    e2e/medcert.idempotency.spec.ts \
    e2e/admin.email-outbox.spec.ts \
    e2e/medical-certificate.spec.ts \
    e2e/payment-smoke.spec.ts \
    e2e/stripe-webhook.spec.ts \
    e2e/prod-request-flow-synthetic.spec.ts \
    e2e/patient.certificate-download.spec.ts
else
  echo "== Med cert readiness: browser checks skipped =="
fi
