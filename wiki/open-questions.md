# Open Questions

No blockers for the wiki/docs implementation.

## Questions Not Safe To Guess Later

| Question | Why it matters | Where to decide |
|----------|----------------|-----------------|
| Should any deferred service line move from gated to active? | Product, clinical, pricing, compliance, and route changes follow | `docs/BUSINESS_PLAN.md`, `docs/CLINICAL.md`, `docs/ADVERTISING_COMPLIANCE.md` |
| Should refund/certificate orphan behavior be automated? | Clinical/legal policy, not pure engineering | `docs/OPERATIONS.md` integration invariants, operator decision |
| Should repeat Rx subscriptions return? | Current business model is one-off transactions only | `docs/BUSINESS_PLAN.md`, `docs/REVENUE_MODEL.md` |
| Should PHI master-key rotation move from design to implementation? | Touches sensitive data and operational recovery | `docs/PHI_KEY_ROTATION_DESIGN.md`, `docs/SECURITY.md`, operator approval |
| Should major request-flow or staff-queue refactors start? | High-conversion and clinical-ops blast radius | `wiki/refactor-plan.md`, focused tests first |
| Should broad Playwright suite cleanup become a release gate? | Current blocking CI is focused; broad suite has known stale assumptions | `docs/TESTING.md`, `.github/workflows/ci.yml` |

## Default If Unanswered

- Keep gated services gated.
- Keep one-off transaction model.
- Keep route aliases redirect-only.
- Keep wiki concise and canonical-doc-backed.
- Do not change clinical, legal, pricing, or advertising claims without explicit approval.
