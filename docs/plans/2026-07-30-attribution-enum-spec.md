# P0.2 specification — AI-source attribution enum + shared classifier

> **Status: specification for gate review. No code, schema, config, or external action is authorised by this document.**
>
> **Parent:** `docs/plans/2026-07-30-ai-organic-growth-plan.md` §3 P0.2. **Authority:** Reference only. `docs/ROADMAP.md` is the sole active priority queue.
>
> **Inherited ranked item:** ROADMAP **rank 1 — truth and measurement gate** (this is measurement-truth work, and its checkpoint applies: *"complete only when each named boundary has implementation plus focused proof"*). It also serves rank 6 (compounding work) by making the AI channel measurable. It does **not** inherit rank 3, which owns distribution.
>
> **Written 2026-07-30. Revised v2** after a gate review that was upheld on 6 standards findings and 6 specification blockers. §9 records the adjudication. **The worst finding was mine: the original zero-detection conclusion was invalid.**

---

## 1. Why this exists

BWT AI Performance reports **5.5K citations / 90d** (Jul: 2,920 in 28 days) across Microsoft Copilot, Bing AI summaries, **and unnamed partner integrations**. Attributed Copilot orders: **zero**. Every AI-referral order ever recorded is `chatgpt.com` (3 → 4 → 11 → 21, Apr → Jul).

The current code cannot tell a real conversion ceiling from a measurement hole, and cannot resolve it retrospectively (§2). So the deliverable is prospective instrumentation plus a trustworthy classifier.

**Non-goals.** This does not attempt to show that Bing citation drives revenue (parent Phase 2). And per §5 it **cannot, even in principle, establish a channel ceiling** — that was the original draft's central error.

---

## 2. Verified code state

### 2.1 Retrospective routes are closed by deliberate privacy controls

| Location | Behaviour |
|---|---|
| `lib/analytics/attribution-storage.ts` → `cleanUrlOrPath` | Returns `${origin}${path}`; catch branch `.split("?")[0]`. Referrer query strings never reach persistence |
| `lib/analytics/posthog-privacy.ts` → `sanitizePostHogUrl` | Returns `${origin}${pathname}`; docstring states it removes every query parameter and fragment. **The PostHog `$referrer` retrospective read is disproven** |

These are correct controls. **This specification does not weaken either.**

### 2.2 The capture gap is an early return

`lib/analytics/middleware-attribution.ts` → `captureAttributionToCookie` **does** read `Referer` (`req.headers.get("referer")`), but only after `if (Object.keys(captured).length === 0) return response`. Tagged arrivals get a referrer; **untagged arrivals exit first** — exactly the Copilot and organic-assistant case.

### 2.3 Raw referrers are ALREADY persisted to JavaScript-readable storage

**This corrects the previous draft, which claimed the raw referrer stays in-process. It does not, today.**

| Writer | What lands where |
|---|---|
| `lib/analytics/middleware-attribution.ts` (~L89–100) | `req.headers.get("referer")` — **full URL including query and fragment** — is JSON-serialised into the `instantmed_attribution` cookie. The cookie sets `sameSite`, `secure`, `path`, `maxAge` 30 days, and **no `httpOnly`**, so it is readable by any script on the origin |
| `lib/analytics/attribution.ts` (~L235–249) | `document.referrer` — full URL — written via `writeStoredAttribution` into browser session/local storage |

Checkout-time sanitisation (`cleanUrlOrPath`) is therefore the **only** thing preventing raw referrers reaching the database, and nothing prevents them sitting in a 30-day client-readable cookie or in web storage beforehand.

### 2.4 Three divergent classifiers

| Surface | Match method | Verdict |
|---|---|---|
| `lib/admin/ai-attribution-breakdown.ts` | `.includes()` over **curated unambiguous tokens** | **The best conservative starting point — not "correct".** It still substring-matches; its virtue is a deliberately safe token list, documented in its own docstring as excluding `bing` and `you.com` |
| `lib/analytics/ai-referral.ts` | `utmSource.includes(pattern.split(".")[0])` | **Broken, live false positives — §3** |
| `lib/analytics/source-classification.ts` | `containsAny()` substring over `[utm_source, utm_campaign, referrer, host]` | **Weak — substring plus campaign-name contamination** |

---

## 3. Live defects found while grounding this spec

### 3.1 `ai-referral.ts` first-token substring matching

Each mapped host is reduced to its first label and substring-matched:

| Host | Token | False positive |
|---|---|---|
| `bing.com/chat` | `bing` | **`utm_source=bing` — ordinary Bing organic — classifies as Copilot** |
| `you.com` | `you` | **`utm_source=youtube` classifies as You.com** |
| `meta.ai` | `meta` | **`utm_source=meta` — Meta ads — classifies as Meta AI** |
| `chat.openai.com` | `chat` | Any source containing `chat` |
| `poe.com`, `kagi.com` | `poe`, `kagi` | Same class |

**Bounded:** fires the PostHog `ai_referral` event only; does not write persisted order attribution.

### 3.2 `source-classification.ts` substring + campaign contamination

`AI_PATTERNS` matched against `[utm_source, utm_campaign, referrer, host].join(" ")`. **`utm_campaign` is in the token**, so a campaign named `gemini_test` classifies the order as an AI referral. This surface **does** drive operator-facing channel labels (`AttributionChip`, intake ledger).

### 3.3 Consequence

This is the mechanism behind the parent plan's *"detected share with unknown bias"*: stripping deflates the AI bucket, substring matching inflates it, neither is calibrated. *(The parent's baseline table is unaffected — its AI rows were verified as literally `chatgpt.com`.)*

---

## 4. Specification

### 4.0 Canon change required — operator approval, not doc maintenance

`CLAUDE.md:380` currently states, of code-side referrer capture:

> *"code-side referrer capture is structurally blind to it and is already maxed out (do not add more referrer/click-id capture)"*

**This specification proposes adding referrer-derived capture, which that sentence forbids.** That is a policy correction, not routine documentation upkeep.

**Required in the implementation gate, before any code:** the operator explicitly approves retiring the parenthetical *"(do not add more referrer/click-id capture)"* and narrowing the claim to what remains true — that referrer capture cannot recover **referrer-stripped** dark traffic, and that `heard_about_us` remains the only instrument for that cohort. The rest of the sentence stands. `AGENTS.md` regenerates via `scripts/sync-agent-doc.sh` in the same commit.

**If the operator declines, this specification is void** and the Copilot question stays unanswered by code. That is an acceptable outcome and must not be worked around.

### 4.1 Shared classifier — pure, exact, versioned

New module, single owner, consumed by all three surfaces.

**Public API (pure, no I/O, no globals):**

```
classifyAiSource(input: { referrer?: string | null; utmSource?: string | null })
  => { engine: AiEngine; enum: AiSourceEnum; matched: "utm" | "referrer" | null; version: number }
```

**Matching rules, binding:**

1. **Host matching is exact-or-suffix on a parsed hostname** — `new URL()`, take `hostname`, strip leading `www.`, then `host === domain || host.endsWith("." + domain)`. Reuse the existing `matchesHost` helper in `source-classification.ts`.
2. **UTM matching is exact equality on the whole normalised value** (trim + lowercase). No substring.
3. **Never reduce a host to its first label. Never substring-match host or UTM.**
4. **`utm_campaign` is not an AI signal** and is not an input to this function.
5. **Path-qualified entries match host + path prefix**, so bare `bing.com` cannot match a `bing.com/chat` entry.
6. **`version`** is returned and persisted alongside results so a registry change is distinguishable from a behaviour change.

**Registry — every entry carries a provenance receipt.** Entries without one are excluded until a receipt exists.

| Host | Engine | Enum | Provenance |
|---|---|---|---|
| `chatgpt.com` | ChatGPT | `chatgpt` | Observed in production: all 21 July AI orders |
| `chat.openai.com` | ChatGPT | `chatgpt` | Legacy ChatGPT host, in the existing admin + client lists |
| `perplexity.ai` | Perplexity | `perplexity` | Perplexity bot/referrer docs |
| `gemini.google.com` | Gemini | `gemini` | Google product host |
| `copilot.microsoft.com` | Copilot | `copilot` | Microsoft product host |
| `bing.com` + path prefix `/chat` | Copilot | `copilot` | Existing client list; path-qualified |
| `claude.ai` | Claude | `claude` | Anthropic product host |
| `grok.com` | Grok | `other_ai` | Product host |
| `meta.ai`, `poe.com`, `phind.com`, `chat.deepseek.com`, `chat.mistral.ai`, `duck.ai` | as named | `other_ai` | Product hosts; low expected AU volume |

**Removed from the previous draft for lack of provenance:** `openai.com` (bare — serves docs, blog, and marketing; not an assistant referrer) and `edgeservices.bing.com` (I asserted it without a receipt). Either may be added later **with** a receipt plus positive and lookalike-negative fixtures.

**`bard.google.com`** is retained from the existing lists but flagged as likely dead; keep until a decision, it is harmless and exact.

**UTM registry — exact values only:** `chatgpt.com` → `chatgpt`; `perplexity`, `perplexity.ai` → `perplexity`; `copilot` → `copilot`; `gemini` → `gemini`; `claude.ai` → `claude`. Anything not exactly listed is not an AI source.

### 4.2 The `bing_ai` inconsistency — resolved by removal

The parent plan lists `bing_ai` in the enum; the previous spec draft silently dropped it and added `grok`. **Resolution: `bing_ai` is removed from both**, because no verified query or path marker for *Bing AI summaries* (as distinct from Copilot) has been identified. Inventing a value we cannot detect would guarantee a permanently empty bucket that reads as a finding.

**The parent plan must be corrected to match** — a one-line change, tracked as a follow-up on this spec's approval, not smuggled in here.

**Consequence, stated plainly:** the instrument is narrowed to **identifiable Copilot traffic**. Bing AI summaries and BWT's unnamed "partner integrations" are **outside its detection scope**. This is central to §5.

### 4.3 `you.com` and `kagi.com` — negative, matching the parent

The parent plan requires ambiguous You.com as an **explicit negative fixture**. The previous draft contradicted it by classifying You.com as `other_ai`. **Resolution: the parent wins.** Both are search engines whose AI mode is not distinguishable from ordinary search at the referrer level, so a bare visit classifies as **organic search, not AI**, and both appear in the negative fixtures. Revisit only with a path or parameter receipt that identifies the AI mode.

### 4.4 Enum, engine, and how consumers treat `other_ai`

- **`AiEngine`** — the display label (ChatGPT, Perplexity, Gemini, Copilot, Claude, Grok, Meta AI, Poe, Phind, DeepSeek, Le Chat, DuckAssist).
- **`AiSourceEnum`** — the persisted, low-cardinality value: `chatgpt` · `copilot` · `perplexity` · `gemini` · `claude` · `other_ai` · `none`.
- **Mapping is explicit in one table** (§4.1), not derived, so adding a host is a deliberate decision about which bucket it joins.
- **Consumer contract for `other_ai`:** the admin breakdown may display the finer `engine`; the persisted enum and all revenue reporting use the coarse value. **`other_ai` is never presented as a named engine in operator revenue figures**, and never silently folded into `chatgpt`.
- **`NULL` vs `none`:** `NULL` means *not instrumented* — the row predates the column or the derivation did not run. **`none`** means *instrumented and no AI source detected*. They must never be conflated; only `none` rows belong in the denominator.

### 4.5 Precedence, trust, and attribution model

**Attribution model: first-AI-touch, write-once.** The first non-`none` value observed for the intake wins and is never overwritten. Rationale: matches `heard_about_us` semantics, and the question is *"did this assistant ever bring this patient"*, not *"what was the last hop"*.

**Precedence within a single derivation:**
1. An existing persisted non-`none` value on the intake — **always wins**, no overwrite.
2. Exact `utm_source` match.
3. Referrer host match.

**A later Copilot arrival after an earlier ChatGPT arrival** is **not** represented in this column — the first value stands. If that distinction ever matters, it needs its own event stream, not a mutable column. Documented so the limitation cannot be mistaken for a bug.

**Trust boundary — do not trust the existing cookie.** `instantmed_attribution` is **not `httpOnly`** (§2.3), so any value in it is client-writable and unsuitable as an authoritative acquisition claim.

- **Authoritative path:** derive server-side in middleware and write to a **separate `httpOnly`, `secure`, `sameSite=lax` cookie** carrying only `{ enum, version }`. This is what checkout persists.
- **Non-authoritative path:** the client may call the same shared classifier for its PostHog `ai_referral` event. Clearly labelled non-authoritative; it must not feed revenue reporting.

### 4.6 Privacy — sanitise both existing writers

**Beyond deriving the enum, this work must fix §2.3.** Immediately after derivation, both writers sanitise the referrer before it is stored:

- `middleware-attribution.ts` — sanitise before the cookie is serialised.
- `attribution.ts` — sanitise before `writeStoredAttribution`.

Sanitised form is origin + path only, matching `cleanUrlOrPath`'s existing shape. Raw referrer exists **only** as a local variable during derivation.

**Proof required by test, not assertion:** no referrer query string or fragment reaches the attribution cookie, session storage, local storage, the database, **Stripe**, PostHog, application logs, or Sentry.

**Also binding:** no new identifier, no PHI, no free text. The enum is low-cardinality and non-identifying. Existing sanitisers are unchanged.

### 4.7 Persistence — intake only, never Stripe

**The enum is not Stripe metadata.** Stripe does not need another acquisition field, and routing it through session metadata adds a surface with no benefit.

1. **Migration (mandatory, not conditional):** nullable `intakes.ai_source_detected` plus `ai_source_classifier_version`. Follow `CLAUDE.md` migration discipline — apply, verify in production, record the receipt, update the migration count, regenerate `AGENTS.md`. Note the MCP `apply_migration` generated-version gotcha and reconcile `schema_migrations`.
2. **Persist on the intake row before Checkout Session creation**, on both paths:
   - **Authenticated insert** — value present at insert.
   - **Guest insert** — value present at insert; **guest reconstruction** must carry it when an intake is rebuilt after a failed first attempt.
3. **Write-once enforced at the data layer**, not only in application code.
4. **Idempotency collisions:** if two inserts race, the surviving row keeps the **earliest** non-`none` value.
5. **Retry payment** preserves the original value and must not re-derive from the retry navigation.
6. **Webhook and fallback finalisation read the intake and preserve the value.** They must not write it, and must not drop it while setting `paid_at`.
7. All reporting uses canonical `paid_at` / `refunded_at` windows and the closed non-overlapping windows the parent plan mandates.

### 4.8 Denominator — executable definition

"Eligible landing request" means **all** of:

| Criterion | Rule |
|---|---|
| Request type | Top-level document navigation only — `Sec-Fetch-Mode: navigate` **and** `Sec-Fetch-Dest: document` |
| Method | `GET` (and `HEAD` excluded) |
| Accept | `Accept` includes `text/html` |
| Origin | `Sec-Fetch-Site` is **not** `same-origin`. Internal navigations are excluded — the denominator counts arrivals, not page views |
| Prefetch | Excluded when `Sec-Purpose: prefetch` or `Purpose: prefetch` is present |
| Path exclusions | Anything matched by `isExternalAnalyticsExcludedPathname` (capability/bearer paths), plus `/api/*`, `/_next/*`, static assets, health checks, and the `Disallow` set in `app/robots.ts` |
| Bots/crawlers | Excluded from the denominator via a conservative user-agent check, and **counted separately** so exclusion volume is visible rather than silent |
| Missing headers | If `Sec-Fetch-*` headers are absent (older clients), fall back to `Accept: text/html` + `GET`; **count these in a distinct `indeterminate` bucket** rather than assuming eligibility |

**Not "visits" and not "sessions"** — session semantics would require privacy-safe deduplication, explicitly out of scope.

### 4.9 Aggregate collector — not `operational_metrics` per request

**`operational_metrics` is an append-only aggregate-snapshot table** — `(metric_name, metric_value, dimensions, recorded_at)`. One row per landing request would violate its aggregate-only contract, add a per-request timestamp, and put a write on the middleware hot path. **Rejected.**

Instead:

- **Fixed time bucket:** UTC hour. The bucket key is `(metric_name, bucket_start)`.
- **Atomic aggregation:** a single upsert-and-increment against a dedicated counter table with a unique key on `(metric_name, bucket_start, dimension_key)`. **No request-level rows and no per-request timestamps.** Dimensions are limited to the enum value and the eligibility bucket.
- **Never on the request hot path.** Increments are fire-and-forget from a route that does not block the response, or batched. **Measurement failure must never delay, degrade, or fail a patient request** — this is the binding constraint, above data completeness.
- **Fail-open:** any collector error is swallowed after a Sentry breadcrumb. A dropped increment is acceptable; a delayed patient request is not.
- **Under-count is expected and must be disclosed** in every report that uses the denominator.
- Rolled-up hourly totals may be snapshotted into `operational_metrics` for dashboarding — that is its correct use.

### 4.10 Contract tests

1. All negative fixtures in §4.11.
2. **Three-surface parity** — identical input yields the identical engine and enum across all three consumers. This is the test that makes divergence impossible to reintroduce.
3. **Behavioural anti-substring tests, not a source scan.** The previous draft banned every `.includes()` in the module, which is wrong — exact array membership legitimately uses `.includes()`. Replace with: type-level enforcement that the registry is a closed literal set, plus behavioural assertions that lookalike hosts and superstring UTM values do not match.
4. Enum derivation runs on the **untagged** path (the §2.2 regression).
5. Write-once holds across authenticated insert, guest insert, guest reconstruction, idempotency collision, and retry payment.
6. Finalisation preserves the value while setting `paid_at`.
7. **No referrer query string or fragment** in cookie, session storage, local storage, DB, Stripe, PostHog, logs, or Sentry.
8. `NULL` and `none` are distinguished in every report.

### 4.11 Required negative fixtures

| Input | Must classify as | Guards |
|---|---|---|
| `utm_source=bing`, referrer `https://www.bing.com/search?q=...` | organic search | §3.1 `bing` token |
| referrer `https://www.bing.com/` (no `/chat`) | organic search | path-prefix collapse |
| `utm_source=youtube`, referrer `https://www.youtube.com/` | referral | §3.1 `you` token |
| `utm_source=meta`, `utm_medium=cpc` | other paid | §3.1 `meta` token |
| `utm_campaign=gemini_test`, no AI source or referrer | direct/unknown | §3.2 campaign contamination |
| referrer `https://you.com/search?q=...` | **organic search** | §4.3 ambiguity ruling |
| referrer `https://kagi.com/search?q=...` | **organic search** | §4.3 |
| referrer `https://foryou.com.au/` | referral | suffix collapse |
| referrer `https://notchatgpt.com.example/` | referral | suffix-match correctness |
| referrer `https://openai.com/blog/...` | referral | §4.1 provenance removal |
| `utm_source=x`, referrer empty | direct/unknown | short-token catastrophe |
| `utm_source=chatgpt.com.evil.example` | direct/unknown | exact-equality UTM |
| referrer `https://www.google.com/search?q=...` | organic search | **AI Mode is not separable — must not be guessed** |

### 4.12 Documentation (same commit)

`CLAUDE.md` — the §4.0 canon correction plus the pipeline description (enum, derivation point, `httpOnly` cookie, privacy posture, new columns, three-surface consolidation), then `scripts/sync-agent-doc.sh` → `AGENTS.md` (never hand-edited) · `docs/ARCHITECTURE.md` Core Tables + the counter table · `docs/SECURITY.md` — why the enum is non-PHI, and the §4.6 sanitisation fix · migration count with production receipt.

---

## 5. What this measures — and the conclusion it cannot support

**The previous draft's zero-result conclusion was invalid and is withdrawn.** It said that zero detections on a healthy denominator, with ChatGPT detection working, would demonstrate a real Copilot conversion ceiling. That does not follow, for three independent reasons:

1. **BWT's 5.5K aggregates surfaces this instrument cannot see** — Copilot, Bing AI summaries, and unnamed partner integrations. §4.2 narrows detection to identifiable Copilot traffic, so most of that citation volume is outside scope by construction.
2. **ChatGPT detection working proves nothing about Copilot detection.** They are different hosts with different tagging behaviour; ChatGPT appends `utm_source=chatgpt.com`, and there is no evidence Copilot does anything equivalent. A working detector for one is not a validated detector for the other.
3. **Microsoft states citation activity does not indicate placement or importance**, so citation volume was never a promise of click volume in the first place.

**Corrected interpretation, pre-committed:**

| Result after ≥30 days | Permitted conclusion |
|---|---|
| Non-trivial Copilot detections | A measurement hole existed. Re-baseline the channel mix before any Phase 2 reasoning |
| Zero, on a healthy denominator | **"No recognised Copilot signal detected."** Nothing more. Not a ceiling, not an absence of arrivals |
| Zero, on a small or zero denominator | **The instrument is broken.** Fix it; conclude nothing |

**A real ceiling claim requires a prerequisite this spec does not deliver: a controlled known-positive Copilot click** — a deliberate click from a real Copilot answer, end-to-end, confirming the detector fires. **Until that positive control passes, no zero result may be reported as a channel finding**, and Phase 2 Outcome C may not be triggered by this instrument alone.

**Also outside scope:** Google AI Mode and AI Overviews clicks (structurally indistinguishable — negative fixture in §4.11), and referrer-stripped arrivals, which land in `none`. **`none` is not evidence of absence.**

---

## 6. Out of scope

Session deduplication · weakening any sanitiser · persisting raw referrers or query strings · new identifiers · Stripe metadata changes · Phase 1 or Phase 2 experiment work · GA4 (PostHog is the stack; Google's referrer list is reference only for registry provenance).

---

## 7. Implementation sequencing

1. **This spec passes gate review.** ← current
2. **Operator approves the §4.0 canon change.** Hard gate — if declined, stop.
3. **PR 1 — shared classifier + fixtures.** Pure module, exact matching, registry with provenance, `other_ai` mapping, precedence rules, behavioural tests, three-surface parity. **No schema change.** Independently valuable: it fixes the §3 live bugs.
4. **PR 2 — authoritative capture.** `httpOnly` cookie derivation, the §4.6 sanitisation fix in both writers, migration, full guest and authenticated persistence, aggregate collector, reporting.
5. **Positive control:** a known-good Copilot click validating end-to-end capture. **Required before any zero result is interpreted.**
6. Thirty days of forward data, then report the §5 count with its permitted conclusion only.

PR 1 is shippable on its own **only because** its API, precedence, mapping, and fixtures are now specified — the previous draft's version was not, and calling it independently shippable was premature.

---

## 8. Appendix A — Phase 0 read-only audit: AI fetcher access

Run 2026-07-30. **Result: clean, no action required.** Independently reproduced by the gate reviewer (24 public-fetch checks, all 200).

| Check | Finding |
|---|---|
| `vercel.json` | No firewall, bot-management, or user-agent rules |
| `middleware.ts` | **No user-agent handling of any kind** |
| Live fetch, 8 distinct AI/crawler UAs × 3 paths | **All 200**, identical to browser baseline (ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, Claude-User, Claude-SearchBot, bingbot, DuckAssistBot) |

The concern that `ChatGPT-User` / `Perplexity-User` / `Meta-ExternalFetcher` were dying at a WAF challenge is **not supported**.

**Residual limitation:** spoofed user agents from a consumer IP. A dashboard-level rule keyed on IP reputation or TLS fingerprint would not appear here; confirming that is an operator dashboard check. Residual risk low; not a blocker.

This also supports the parent plan's decision not to add robots.txt blocks for `Claude-User`, `DuckAssistBot`, `Amzn-SearchBot`, or `MistralAI-User` — already served under the catch-all allow.

---

## 9. Gate review adjudication (2026-07-30)

All findings verified against the code before acceptance.

### Standards

| # | Finding | Verification | Resolution |
|---|---|---|---|
| 1 | Raw-referrer privacy claim untruthful | Both writers persist the full `Referer`/`document.referrer`; the attribution cookie has **no `httpOnly`** and a 30-day `maxAge` | §2.3 documents reality; §4.6 mandates sanitising both writers with proof tests across 8 sinks |
| 2 | Proposal contradicts canon | `CLAUDE.md:380`: *"do not add more referrer/click-id capture"* | §4.0 names the exact clause, requires operator approval, and voids the spec if declined |
| 3 | `operational_metrics` is not a request counter | Schema is `(metric_name, metric_value, dimensions, recorded_at)`, append-only snapshots | §4.9 rejects per-request rows; specifies hourly buckets, atomic upsert-increment, fail-open, and no hot-path blocking |
| 4 | Drafts fork controlled claims | `clinical_review_sequence` exists at `lib/marketing/approved-claims.ts:192` with branch-aware wording | Drafts corrected to the approved text verbatim; LegitScript separated from the directory listing |
| 5 | `file-map.md` stale timestamp | Read "Last updated: 2026-07-27" | Updated |
| 6 | Spec not linked to a ranked item | ROADMAP §4 | Header inherits **rank 1** (truth and measurement gate) and its checkpoint |
| — | Em dashes in public draft copy | `lib/marketing/voice.ts:164–181` bans the em dash across marketing surfaces, CI-scanned by `voice-guard` | Stripped from every send-ready copy block |
| — | Wikidata HQ inferred | Registered office ≠ headquarters | Property removed pending a direct receipt |

### Specification

| # | Finding | Resolution |
|---|---|---|
| 1 | **Zero cannot establish a ceiling** — the worst finding, and mine | §5 rewritten: permitted conclusion is *"no recognised Copilot signal detected"*; a controlled known-positive Copilot click is a prerequisite before any zero is interpreted |
| 2a | `bing_ai` in parent, dropped in spec | Removed from both; parent correction tracked as a follow-up. Instrument explicitly narrowed to identifiable Copilot traffic |
| 2b | Bare You.com required negative, spec made it `other_ai` | Parent wins — You.com and Kagi classify as organic search, both added as negative fixtures |
| 2c | Registry/enum collapse undefined | §4.4 defines `AiEngine` vs `AiSourceEnum`, an explicit mapping table, and the `other_ai` consumer contract |
| 2d | `openai.com` / `edgeservices.bing.com` lacked provenance | Both removed; every registry entry now carries a receipt, and `openai.com/blog` is a negative fixture |
| 2e | Admin classifier called "correct" | Downgraded to "best conservative starting point" — it still substring-matches |
| 3 | Denominator not executable | §4.8 specifies `Sec-Fetch-*`, method, Accept, same-origin exclusion, prefetch, path exclusions, bot handling, missing-header fallback with an `indeterminate` bucket |
| 4 | Precedence/trust/attribution model unbound | §4.5 fixes first-AI-touch write-once, precedence order, later-Copilot representation, `NULL` vs `none`, classifier versioning, and a separate `httpOnly` server-derived cookie |
| 5 | Enum should stay out of Stripe | §4.7 persists on the intake before session creation; finalisation reads and preserves only |
| 6 | Source-scan `.includes()` ban brittle | §4.10 replaces it with type-level and behavioural tests — exact array membership legitimately uses `.includes()` |
| 7 | P0.1 not send-ready | Approved-claim text applied, certification split, reverify-immediately-before-publication step added |

**Accepted in return:** the WAF audit within its stated scope, independently reproduced.
