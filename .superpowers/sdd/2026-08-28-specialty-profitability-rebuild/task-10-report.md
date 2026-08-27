# Task 10 Report: Specialty Click Gates

## Status

DONE

Implementation commit: `4d89d355c`

Series base supplied for this task: `a3ee37b87a9c6588c008b3559c12dd0e6013bd0b`

## Outcome

The deterministic Google Ads policy evaluator now makes the declared zero-order specialty click gates executable without changing any live Ads state:

| Evidence | Recommendation | Reason code |
|---|---|---|
| 0-9 clicks, zero orders, below the generic loss cap | `HOLD` | `PILOT_WITHIN_LOSS_CAP` |
| 10 clicks through one below the service pause threshold, zero orders | `INVESTIGATE` | `SPECIALTY_ZERO_ORDER_CLICK_INVESTIGATION` |
| Hair 20+ clicks, zero orders, enabled | `APPROVAL_NEEDED` / `campaign_status` | `SPECIALTY_ZERO_ORDER_CLICK_CAP` |
| ED or Women's Health 30+ clicks, zero orders, enabled | `APPROVAL_NEEDED` / `campaign_status` | `SPECIALTY_ZERO_ORDER_CLICK_CAP` |
| A threshold is reached but the campaign is paused or otherwise not enabled | `HOLD` | `SPECIALTY_ZERO_ORDER_CLICK_CAP`, `CAMPAIGN_ALREADY_PAUSED` |
| Click evidence is absent or invalid for a zero-order specialty | `INVESTIGATE` | `SPECIALTY_CLICK_EVIDENCE_UNAVAILABLE` |

The observed Hair shape of 40 clicks, zero orders, and A$120.75 loss now returns an exact approval-gated `campaign_status` pause recommendation. It does not pause the campaign, draft/send a proposal, call Google, or access any external system.

Positive-order campaigns do not trigger click gates. Their existing economics and A$150 generic rolling-campaign loss cap continue to own the result. The generic loss cap is evaluated before click thresholds.

## Mandatory Skill Constraint

The `instantmed-marketing-compliance-review` skill constrained this to a PHI-free, service-level, recommendation-only policy change. It prohibited medicine-name targeting/copy, unsupported acquisition claims, public-copy drift, and treating an implementation decision as Ads mutation authority. No ad, keyword, bid, budget, audience, destination, campaign state, or external account was changed.

## Strict TDD Evidence

### RED

Tests were added before production code and run with:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-policy-contract.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts
```

Witnessed result: 2 test files failed and 1 passed; 11 tests failed and 34 passed. Failures were the intended gaps:

- Hair, ED, and Women's Health returned `PILOT_WITHIN_LOSS_CAP` at 10 clicks.
- Hair still held at 20 and 40 zero-order clicks because its click gate was not enforced.
- ED and Women's Health still held at 30 clicks.
- missing click evidence silently fell through to a hold.
- the new investigation reason degraded to `Review needed` in the Daily Ads Brief.
- campaign-scoped evidence limitations and Hair's future A$60 relaunch stop were not explicit in policy.

### GREEN

The same three-file suite passed after implementation: 3 files, 47 tests.

The broader directly affected suite passed:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-policy-contract.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/google-ads-agent-cron.test.ts \
  lib/__tests__/latest-delivered-ads-agent-run.test.ts \
  lib/__tests__/business-read-model.test.ts \
  lib/__tests__/business-ads-action.test.ts
```

Result: 7 files, 79 tests passed.

## Implementation Details

- Hair `pauseProposalClicks` is now 20; ED and Women's Health remain 30.
- All three specialties use the existing 10-click investigation threshold.
- `evaluateSpecialty()` preserves this order: trustworthy economics, A$150 generic loss cap, zero-order click evidence, service click cap, investigation checkpoint, then quiet hold.
- Outer durable-attribution, campaign-mapping, cross-service-attribution, and tracking gates remain unchanged and continue to run before specialty economics.
- Missing historical `clicks` is treated as unknown, never fabricated as zero.
- The Daily Ads Brief has specific aggregate-only copy for both new investigation codes.
- The source contract prevents policy evaluation from importing Ads mutation/proposal/account clients or calling `fetch()`.
- Hair's future relaunch policy records A$60 maximum incremental loss and the intended order `incremental loss -> zero-order click cap -> duration`, while explicitly marking the loss stop inactive until a campaign-scoped baseline exists.
- Maximum-days enforcement is explicitly inactive until a campaign-scoped start exists.
- The 10-click persisted-checkout-progression stop is explicitly inactive until campaign-scoped progression evidence exists.

## Exact Files

- `lib/ads-agent/policy.ts`
- `lib/ads-agent/brief.ts`
- `lib/__tests__/google-ads-agent-policy.test.ts`
- `lib/__tests__/google-ads-agent-policy-contract.test.ts`
- `lib/__tests__/google-ads-agent-brief.test.ts`

## Static Verification

- Scoped ESLint over all five changed TypeScript files: passed.
- `corepack pnpm typecheck`: passed.
- `git diff --check a3ee37b87..HEAD`: passed.
- The complete `a3ee37b87..4d89d355c` implementation diff was inspected.
- No canonical documentation changed, so `doc:audit` was not required for this task.

## Marketing and Authority Review

PASS.

- Recommendation payloads remain aggregate, service-level, and PHI-free.
- No medicine names, search terms, click IDs, patient data, or free text were added to reasons or brief copy.
- No budget, bid, keyword, ad, targeting, schedule, destination, or campaign mutation path was introduced.
- A pause recommendation still requires a fresh immutable Approval Packet and exact Operator approval before any mutation.
- Employer outreach is absent.
- User-owned untracked `output/` was untouched.

## Residual Limitations

The rolling evaluator still has no trustworthy campaign-scoped relaunch baseline, persisted-checkout progression series, or pilot start date. It therefore cannot enforce Hair's A$60 incremental relaunch loss, the 10-click no-progression stop, or 30 elapsed days. Those controls are deliberately recorded as inactive rather than inferred from rolling-30 evidence. Activating them requires a separate durable campaign-scoped evidence source and tests.

The result is a recommendation, not an immutable Ads proposal. Preparing, approving, and applying any live pause remains a separate approval-gated task.
