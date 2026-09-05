# InstantMed friction closure — release readiness, 2026-09-05

This receipt covers local work on `codex/conversion-retention-friction-closure`, based on `c0bfbc4e0ea535ab24eabdcb7d9e1b54f3d89dfe`. It does not claim a production deployment, patient send, live provider acceptance, live scheduler recovery, or business outcome. The current progress ledger owns the final verification results.

## Completed closure commits

| Commit | Bounded result |
|---|---|
| `c3d804897` | Advisory queue watch and optional evidence; valid queue evidence and harm thresholds still gate new scale |
| `80bdc0a95` | Hosted Stripe proof needs two test Prices; account actions, repeated-field count, and outcome timing are measured |
| `1df3139e1` | Accepted certificate email remains recoverable when persistence is unavailable; exact terminal attempts are distinguished |
| `209f1f35f` | Default-on preferences with one explicit-change timestamp, sticky removals, and duplicate-recipient ordering |
| `8a7682ddf` | Monotonic delivery mirrors, exact-attempt retry boundaries, and separate shared receipt migration |
| `0698637af` | Reporting-only PostgreSQL proof for minimal refill cohorts and exclusions |

## Release packets

These are final-state review boundaries. The earlier commits are provenance anchors, not a blind cherry-pick recipe: several touched shared analytics, email, and documentation files. Assemble draft PRs from the final file state, carry the stated dependencies, and run the relevant checks on each assembled candidate. Growth was subsequently assembled into draft PR #515 as recorded below. No production change was made in this closure.

| Packet | Scope and anchors | Dependency / remaining proof |
|---|---|---|
| Growth | Original `7c96d4835` corrected by `c3d804897`; policy, snapshot, operational health reader, canonical growth docs | Independent candidate `15e5a2a8a` is draft PR #515 against current main; 254 Ads tests, full lint, typecheck, and doc audit pass locally. Actual Ads mutations remain separately authorised. |
| Hosted checkout | `26358c0bc`, `055bd9331`, `8e5daae1f`, hosted harness follow-ups, `80bdc0a95` | Both real hosted test-payment/account journeys pass on `0d548749c`, with signed webhooks and zero cleanup survivors. See the test-mode receipt below. Production and GitHub CI execution remain separate. |
| Optional tracker access | `66e1454a2` through `6699a5ac1`; capability-scoped email, canonical redirect host, ownership/browser contracts | Depends on the existing tracker and hosted checkout/Auth packet. All three hosted browser cases pass on `6699a5ac1`; no mandatory account step. |
| Certificate, preferences, shared delivery | `670a7d805`, `b4e2baf6e`, `b71c2d4fd`, schema convergence `9021ed807`/`c6091f9b2`, shared receipt follow-ups, `1df3139e1`, `209f1f35f`, `8a7682ddf` | Apply preference migration `1100` before shared receipt migration `1150`, then matching runtime consumers. Current recovery proof is independent of the unexplained historical render error. |
| Conversion and checkout-failure measurement | `fb3390d40`, `500ea85ae`, `e3f8a00a2`, `d2ff162fc` and quality follow-ups | Immutable release SHA/time and live source credentials enable outcome reads. Unknown/legacy failures and unavailable cash stay visible. |
| Minimal refill reporting | `dc76db6bf` final aggregate/read model plus `0698637af`; shared callback work belongs to the preceding delivery packet | Migration `1200` contains only indexes and the aggregate. New durable callbacks use packet 3; reporting itself requires no preference, identity, or historical repair. Scheduler proof is a separate heartbeat. |
| SEO | `023751212`, `d6a8a9f43`, `65391e5ae`, `9986f7e20` | Candidate checks are local. Production crawl truth and any GSC request follow an approved release. |
| Women's-health handoff instrumentation | `ab67d911a`, `84876b671`, `f28b5e1f3`, `e205ffdfd` | Measurement only; W1 remains inactive until its declared flow/sample/coverage conditions are met. Clinical scope is unchanged. |

For runtime rollback, revert the relevant reviewed code packet. Keep additive columns/indexes and durable receipts unless a separately reviewed database rollback is necessary; never delete preference removals or event evidence to roll back presentation. The historical/address-trigger proposal in `scripts/sql/proposed-email-address-state-repair.sql` defaults to rollback and is excluded from every deploy packet.

## Certificate recovery actions prepared, not executed

The local production test exercises **Resend** from the clinical request and **Retry** for a transient, non-terminal email-hub attempt. Provider delivery is deliberately suppressed. A green current path is sufficient to prepare recovery even if the old render failure cannot be reproduced.

Once the relevant tested release is deployed, verify its exact SHA and health, then open `/admin/ops` in the authenticated staff UI and refresh the current certificate delivery issues. Keep patient details inside that UI. Use the current certificate and document version, not a historical outbox row, to select the action:

| Current durable evidence | Exact action |
|---|---|
| Current valid certificate, missing/failed patient delivery, no later download or engagement | Review that case and its recipient. After authorisation for the selected case, click **Resend link** once; this calls the existing audited `resendCertificateAsStaff` action and creates a new attempt. |
| Accepted provider message with temporary outbox persistence failure | Let the dispatcher reconcile the existing frozen body/key. Do not create a second send while outcome persistence is unresolved. |
| Queued/sending attempt | Wait for that attempt's dispatcher outcome; no resend. |
| Exact provider attempt bounced, failed, suppressed, or complained | Do not use email-hub **Retry** on that attempt. Resolve the address/provider issue where applicable; a justified later send uses a new audited attempt. A complaint retains preference removal and delivery evidence. |
| Current certificate already delivered/opened/clicked/downloaded or manually reconciled | No routine resend; act only on a specific patient-reported non-receipt issue. |
| Certificate missing despite approved/completed intake, or certificate revoked/superseded | Escalate for clinical/record review; do not resend or restore a document. |

After each authorised send, verify the resend reservation/outbox result, provider acceptance, and subsequent webhook delivery separately. Do not infer delivery from acceptance, repair timestamps without current-version evidence, or bulk-resend. No production case list or current unresolved count was collected in this closure, so these are prepared actions, not a claim that any patient's issue has been resolved.

## Local verification

- Full Vitest suite: 738 files / 7,010 tests passed after correcting the architecture inventory count. Full ESLint, TypeScript, documentation audit (124 tests; 128 Markdown files), and strict guide audit (107 articles; no issues) passed.
- Isolated PostgreSQL: preference ordering with the real timestamp trigger, callback ordering/concurrency and certificate mirrors, reporting-only refill counts, and the separate rollback-only repair proposal all passed. Fresh Supabase migration replay also passed in the production harness.
- Local production Webpack build and both certificate/staff Playwright cases passed. Staff resend, transient reconstruction, terminal Retry suppression, Business measurement checkpoints, and email-hub Queue were exercised. Viewports: 1440×900 and 375×900, light/dark, reduced motion. No horizontal page overflow or JavaScript page exceptions. Browser analytics proof covers empty/unavailable states; populated mature cohorts have database/unit proof. External Redis remains deliberately unconfigured in this fixture.
- Bundle gate passed: shared JS 130 kB, request first load 173 kB, dashboard 392 kB. The request route's unique-chunk estimate (35.7 kB) exceeds its advisory guide; its enforced first-load budget passes. No budget was relaxed.
- Runtime/stack, route conflicts, cron inventory, placeholder checks, orphan check, dedupe, dependency audit (no known vulnerabilities), and dead-code ratchet (2,305 matching findings) passed. The strict integration step below prevents calling the full release pipeline green.
- Every database/server harness cleaned only its own synthetic rows, local containers, volumes, networks, and child processes. Screenshots remain under the ignored `test-results/certificate-resend-render--3c162-e-across-viewport-and-theme-chromium/` directory.

## Remaining external proof

- Hosted Stripe test-mode acceptance is complete; the exact SHA, measured account actions, and zero-survivor receipt are recorded below. Production payments and hosted GitHub execution were not exercised.
- `corepack pnpm release:check` stopped at strict integration validation: Stripe, Google Ads conversion, Resend, Anthropic, OpenAI review, and Parchment configuration were absent in this isolated worktree. Local checks can pass independently; the full release gate must run in the intended credentialled release environment before deployment is labelled ready.
- Production deployment SHA/health, live browser behavior, live heartbeat, Resend acceptance/delivery, GSC inspection/indexing, and dated conversion/cash outcomes remain unverified here.
- Original Task 9 may proceed when its specified manually verified account-friction evidence exists; it no longer waits for D+14. Task 10 is now locally complete after real magic-link ownership proof, as recorded below. Neither imposes a new required account step.
- Preserve the minimum sample, matched measurement windows, 21-day refill observation, women's-health experiment conditions, and ED E1 settlement. Calendar checkpoints alone do not delay proven fixes.

## Hosted provider acceptance — 2026-09-05

Both real hosted Stripe journeys passed on `0d548749c1be85faa63dec8e5538bd90784e78e7`.
The PHI-free receipt is `.artifacts/hosted-stripe-e2e/run-01149f6672c238a1.json`;
the run finished at `2026-09-05T00:44:38.076Z`. The fresh production Webpack
bundle used isolated Supabase, real disposable Redis, local Mailpit, and the
actual Stripe test-mode Checkout and signed-webhook delivery.

| Journey | Proven outcome | Account actions / local elapsed time |
|---|---|---|
| Repeat prescription, A$29.95 test payment | Succeeded PaymentIntent, current paid intake, genuine signed webhook, confirmed request, no Auth user | Continue without an account: 1 action, 98 ms |
| One-day certificate, A$24.95 test payment | Succeeded PaymentIntent, signed webhook, real emailed magic link, authenticated request confirmation, linked dashboard, exact matching Auth owner | Request email, open link, Go to dashboard: 3 actions, 1,532 ms |

Both branches repeated zero profile fields. Timing starts at the optional-account
offer and includes automated local Mailpit retrieval for linking; it is not a
patient timing promise. Both webhook events were processed, and cleanup verified
zero surviving test rows/Auth users plus removal of the owned local Docker stack.

The operator chose Stripe's public test card after the optional Link CLI offer.
`0e77b463a` handles the sandbox's default Link-wallet selection and truthful agent
acknowledgment. `af742a09c` / `42d1362dc` allow only the exact runner-owned local
Auth connection in both CSP policies, reject deployed/mismatched settings, and
bind the contract to the actual runner environment. `0d548749c` follows the
existing authenticated confirmation-to-dashboard link and records all three
actions instead of assuming a direct dashboard redirect. Earlier startup,
selector, Redis, and cleanup-schema corrections remain in the same release slice.

Credential discovery first refreshed the expired CLI key. The later dashboard
check found an existing standard test key with no scheduled expiry; it
authenticated to the expected InstantMed account and supplied the successful run.
It and the two test Price IDs are stored outside Git in an owner-only local file.
The reusable local launcher is `/Users/rey/.config/instantmed/run-hosted-stripe-test.sh`;
run it from the candidate checkout. The CLI login's 90-day key is no longer needed
by this launcher. Revoking or rotating the standard key would still require an
update. No secret value was placed in the repository or tool output.

Latest focused verification: 49 runner/preflight/CSP tests, the other three CSP
contracts, TypeScript, scoped ESLint, and documentation audit (124 tests) pass.
The two real hosted browser cases passed in 29.8 seconds. Earlier whole-suite
results above are separate evidence, not a rerun of the final checkout candidate.

Vercel variable names cover all six reported integration groups; that inventory
does not verify values or live health. The full credentialled release check,
production deployment/browser proof, live provider acceptance, scheduler evidence,
and dated business outcomes remain outstanding. No real payment, patient email,
production data repair, Ads/GSC change, or production deployment occurred.

## Optional tracker access — 2026-09-05

Implemented and verified on `6699a5ac1eb2b468da4e8710d3a9e40527b36776`
(`66e1454a2`, `00b8df2a2`, `1df488906`, `230df691a`, `6699a5ac1`).
The tracker offers **Email me a secure access link**, with no form fields.
The empty CSRF-protected POST stays under `/track/request/access-link` so the
HttpOnly capability cookie remains restricted to `/track`. Server-only email
resolution, separate IP/capability rate limits, uniform provider/capability
responses, and a fixed clean callback preserve ownership boundaries.

All three hosted browser cases passed in 32.6 seconds. The PHI-free run receipt
`.artifacts/hosted-stripe-e2e/run-7c25fe1107a374db.json` completed at
`2026-09-05T01:09:34.578Z`, recording two signed test-payment events and zero
cleanup survivors. The third case in the committed hosted suite proves keyboard
activation, a real local email/PKCE exchange, the exact owned intake, rejection
of another owner's document/reply access, and rejection of a consumed link in a
fresh browser. These tracker assertions are suite evidence, not additional
fields in the payment receipt.

Supporting checks: 88 focused tests, TypeScript, scoped ESLint, documentation
audit (124 tests), and the hosted runner's fresh production Webpack build.
375px and 1440px light/dark screenshots were inspected; the suite checks no
horizontal overflow and a minimum 48px button, and exercises keyboard activation
with reduced motion. Artifacts remain under ignored `test-results/hosted-stripe/`.
Earlier whole-suite evidence does not claim a rerun of this final candidate.
No production Auth acceptance, patient send, live payment, or deployment is claimed.

## Growth release candidate — draft PR #515

[Draft PR #515](https://github.com/reabal-n/instantmed/pull/515) contains the
independent growth slice on `15e5a2a8aeff1deb09302d794b24c857c5bc1d02`, based on
`99e25c8f9`. Worktree: `.worktrees/release-growth-operational-policy`; branch:
`codex/release-growth-operational-policy`. Its 13 files include only the growth
implementation/tests, canonical growth docs, and this base's inventory correction.
Provenance includes `7c96d4835`, `821539161`, `60f21eddd`, and `c3d804897`.

On this assembled candidate, 18 Ads Agent files / 254 tests, full ESLint,
TypeScript, and documentation audit (124 tests; 126 Markdown files) pass.
Frozen-lockfile offline install and diff checks pass; no dependencies,
environment variables, or migrations change. The Git worktree is clean.
At the initial GitHub read-back, the PR was draft, its head matched exactly,
and CI was running. That is not a passing CI or production-release claim.
The PR includes the exact scope, rollback, privacy, environment, and verification
boundaries. The remaining packets retain their local closure-candidate proof
until each is independently assembled and checked.

## Final integration release gate — 2026-09-05

The operator subsequently authorised release, merge, and consolidation to only
`main`. Draft PR #516 preserves the bounded implementation commits and includes
the independently assembled growth history from #515, allowing one final runtime
release. Historical recovery sends and Ads/GSC mutations remain outside scope.

Candidate `aca9542575d8397e6c3731a7e3978c0473e261e4` passed the complete
credentialled `corepack pnpm release:check`: 741 Vitest files / 7,072 tests, full
lint, TypeScript, strict integration checks, security audit, exact dead-code
ratchet, production build (65 seconds), and enforced bundle budgets. The
OpenTelemetry dynamic-dependency build warning and request unique-chunk advisory
remain warnings; no enforced budget was relaxed. The private launcher excludes
deployment flags, Redis credentials, and Sentry DSNs from unit-fixture execution.
A stale certificate-tracker contract was corrected in `aca954257`.

The isolated delivery/preference/refill PostgreSQL harness passed. Both
certificate/staff production-browser cases passed in 20.7 seconds. The final
hosted Stripe run passed all three browser cases in 31.2 seconds, including real
test payments, signed webhooks, optional tracker email, ownership denial and
consumed-link rejection. Receipt `run-112a4e8ad7f4b6f4.json` completed at
`2026-09-05T01:33:26.577Z` with two processed webhook events and zero survivors.
Receipts and clean tracker screenshots are preserved outside disposable worktrees
at `/Users/rey/.config/instantmed/release-evidence/2026-09-05/`.

The production migration dry run identified exactly the reviewed convergence,
preference `1100`, shared receipt `1150`, and refill `1200` migrations. All four
were applied in that order. Metadata read-back confirmed history through
`20260905120000`, the expected nullable columns, enabled preference triggers,
service-role-only invoker RPC execution, and zero SECURITY DEFINER ACL violations.
The standalone historical repair script was not executed.

Before the runtime release, authenticated production health returned HTTP 200 and
healthy database, Redis, Stripe, Resend, Auth, and environment checks. Email
dispatcher, refill-reminder, and Parchment smoke heartbeats had successful latest
outcomes. These are baseline reads, not post-deployment proof. Final PR CI,
production runtime deployment/read-back, and branch cleanup remain pending at
this receipt commit; the final operator report must state their actual outcome.
