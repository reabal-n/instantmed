---
name: instantmed-production-incident-review
description: InstantMed production incident, outage, and live-ops review workflow. Use when a task in /Users/rey/Developer/instantmed mentions production bugs, incidents, outage, customer impact, stuck intake, failed payment, webhook DLQ, Sentry, Vercel logs, PostHog, Supabase production data, Stripe, Resend, Parchment, cron failures, recovery, rollback, hotfix, break-glass, or operator runbooks.
---

# InstantMed Production Incident Review

Use this for live or potentially live incidents. The goal is to diagnose without causing more damage, protect PHI, recover customers, and capture the learning in the right doc or contract.

## Load Order

Read:

1. `AGENTS.md`, then `wiki/index.md`
2. `docs/OPERATIONS.md`
3. `docs/SECURITY.md`
4. `docs/ARCHITECTURE.md` sections for the affected subsystem
5. `docs/TESTING.md` if a regression test or smoke check is needed
6. Target code, migrations, workflows, and runbooks

Use Sentry, Vercel, Supabase, Stripe, PostHog, Resend, or Parchment tools only when they are relevant and available. Prefer read-only inspection first.

## Incident Path

1. State impact: affected service, patient/operator impact, time window, severity, and whether PHI or payment state is involved.
2. Preserve safety: avoid destructive commands; do not expose PHI in chat; do not run fake webhook tests against production.
3. Gather evidence: logs, audit rows, webhook/DLQ rows, Sentry issue, PostHog events, DB state, deployment/commit range.
4. Isolate root cause: code path, config/env drift, data anomaly, third-party failure, or operator action.
5. Choose response: rollback, kill switch, config fix, data repair, hotfix, retry, or manual operator recovery.
6. Verify recovery with the narrowest real proof.
7. Add a regression guard or doc update if the same mistake could recur.

## Boundaries

- Do not mutate production data without explicit user approval unless the user has directly asked for that exact recovery action.
- Do not paste patient-identifying details, prescription-specific details, raw secrets, tokens, or PHI into the final response.
- Do not broaden product, clinical, refund, or privacy policy during an incident.
- If the incident reveals a stale doc, update the canonical doc in the same change.

## Output Shape

Lead with:

- Current status: ongoing, mitigated, fixed, or needs operator decision.
- Impact and risk.
- Evidence checked.
- Root cause or strongest current hypothesis.
- Fix or recovery action.
- Verification and remaining risk.
