# P0.2 specification — AI-source attribution enum + shared classifier

> **Status: specification for review. No code, schema, or config change is authorised by this document.**
>
> **Parent:** `docs/plans/2026-07-30-ai-organic-growth-plan.md` §3 P0.2. **Authority:** Reference only. `docs/ROADMAP.md` is the sole active priority queue.
>
> **Purpose:** answer one question — *does Microsoft/Copilot AI citation produce any measurable arrival?* — and fix the classifier divergence that currently makes any answer untrustworthy. Written 2026-07-30 against verified code state.
>
> **Review gate:** this specification goes to review **before** any implementation branch opens. Implementation lands in its own PR with its own review.

---

## 1. Why this exists

Bing Webmaster Tools AI Performance reports **5.5K citations / 90d** (Jul: 2,920 in 28 days, 2.4× June) across Microsoft Copilot, Bing AI summaries, and select partner integrations. Attributed Copilot orders: **zero**. Every AI-referral order ever recorded is `chatgpt.com` (3 → 4 → 11 → 21, Apr → Jul).

That gap has two candidate explanations — a real conversion ceiling, or a measurement hole — and the current code cannot distinguish them. It also cannot be resolved retrospectively (§2). So the deliverable is prospective instrumentation plus a trustworthy classifier, producing a **count**, not an adjective.

**Non-goal:** this specification does not attempt to prove that Bing citation drives revenue. That is the parent plan's Phase 2, and it is gated on Phase 1. This work only makes the measurement possible.

---

## 2. Verified code state (the constraints)

### 2.1 Both retrospective routes are closed — by deliberate privacy controls

| Location | Behaviour | Consequence |
|---|---|---|
| `lib/analytics/attribution-storage.ts` → `cleanUrlOrPath` | Returns `${parsed.origin}${path}` for cross-origin; catch branch does `.split("?")[0]` | Referrer query strings are **never persisted**. Any historical `showconv`-style Copilot marker is gone |
| `lib/analytics/posthog-privacy.ts` → `sanitizePostHogUrl` | Returns `${parsed.origin}${pathname}`; docstring states it removes every query parameter and fragment | The PostHog `$referrer` retrospective read is **disproven**. Do not attempt it |

**These are correct privacy controls and this specification does not weaken either.** The enum is derived *before* sanitisation and only a bounded value is kept.

### 2.2 The capture gap is an early return, not missing referrer handling

`lib/analytics/middleware-attribution.ts` → `captureAttributionToCookie`:

```
for (const key of ATTRIBUTION_PARAM_KEYS) { ...collect... }
if (!captured.utm_source) { ...deriveChannelFromClickIds(params)... }
if (Object.keys(captured).length === 0) return response   // ← the gap
...
const referrer = req.headers.get("referer") ?? existing.referrer
```

It **does** read `Referer` — but only after that early return. So a tagged arrival gets a referrer and an **untagged arrival exits first**. Untagged is exactly the case we need: Copilot and organic assistants that append no UTM.

> An earlier draft of the parent plan claimed this function never reads `Referer`. That was wrong and is corrected here and in the plan.

### 2.3 Three divergent classifiers — and the admin one is already right

| Surface | Match method | List | Verdict |
|---|---|---|---|
| `lib/analytics/ai-referral.ts` | `utmSource.includes(pattern.split(".")[0])` — **first token of the host as a substring** | 13 hosts | **Broken — live false positives, §3** |
| `lib/analytics/source-classification.ts` | `containsAny()` substring over `[utm_source, utm_campaign, referrer, host]` | 7 patterns | **Weak — substring + campaign-name contamination** |
| `lib/admin/ai-attribution-breakdown.ts` | `.includes()` over **curated unambiguous tokens** | 9 tokens | **Correct by design — use as the base** |

The admin surface's own docstring already states the principle: it *"deliberately EXCLUDE\[s\] ambiguous hosts (`bing`, `you.com`) that would over-count ordinary search traffic as AI."* Someone solved this problem once. The fix is to **promote that approach**, harden it, and make the other two consume it — not to invent a fourth list.

---

## 3. Live defects found (fix, then measure)

These are current-behaviour bugs, discovered while grounding this spec. They matter because they bias the number we are about to instrument.

### 3.1 `ai-referral.ts` first-token substring matching

`utmSource.includes(pattern.split(".")[0])` reduces each host to its first label and substring-matches it:

| Host in map | Reduced token | False positive |
|---|---|---|
| `bing.com/chat` | `bing` | **`utm_source=bing` — ordinary Bing organic — classifies as Copilot** |
| `you.com` | `you` | **`utm_source=youtube` classifies as You.com** |
| `meta.ai` | `meta` | **`utm_source=meta` — Meta ads — classifies as Meta AI** |
| `chat.openai.com` | `chat` | Any source containing `chat` |
| `poe.com` | `poe` | Any source containing `poe` |
| `kagi.com` | `kagi` | Narrow, but same class |

**Blast radius is bounded but real:** this function only fires the PostHog `ai_referral` event; it does not write persisted order attribution. So it inflates an event stream, not revenue counts. It is still the exact failure mode the shared classifier must make impossible.

### 3.2 `source-classification.ts` substring + campaign contamination

`AI_PATTERNS = ["chatgpt","perplexity","claude","gemini","copilot","poe.com","you.com"]`, matched against `[utm_source, utm_campaign, referrer, host].join(" ")`.

- **`utm_campaign` is in the match token**, so a campaign named `gemini_test` or `claude-launch` classifies the order as an AI referral.
- `you.com` as a substring matches any host containing it.
- Missing relative to the admin list: `openai`, `phind`, `meta.ai`. Missing entirely: `grok`/`x.ai`, `deepseek`, `mistral`/Le Chat, `duck.ai`.

**This surface does drive operator-facing channel labels** (`AttributionChip`, the intake ledger), so its errors are visible in decisions.

### 3.3 Consequence for the parent plan's honesty clause

This is the concrete mechanism behind *"detected share with unknown bias"* rather than *"floor"*. Referrer stripping deflates the AI bucket; **substring matching inflates it.** Both directions are live, neither is calibrated. The parent plan's §7 wording stands and is now evidenced.

*(The baseline table in the parent plan §1 is unaffected: its AI rows were verified to be literally `chatgpt.com`, and its query checked AI patterns before search patterns.)*

---

## 4. Specification

### 4.1 One shared classifier — exact matching only

New module, single owner, consumed by all three surfaces.

**Matching rules, binding:**

1. **Host matching is exact-or-suffix on a parsed hostname.** Parse the referrer with `new URL()`, take `hostname`, strip a leading `www.`, then match `host === domain || host.endsWith("." + domain)`. The existing `matchesHost` helper in `source-classification.ts` already implements this — reuse it.
2. **UTM matching is exact on the whole normalised value**, not substring. `utm_source=chatgpt.com` matches; `utm_source=bingbot-test` does not match anything.
3. **Never substring-match, and never reduce a host to its first label.** No `.includes()` on host or UTM fields in the new module.
4. **`utm_campaign` is not an AI signal** and must not be part of the match token.
5. **No short tokens, ever.** `x.ai` is registered as the exact host `x.ai` (plus `grok.com`), never as the token `x`. A token shorter than 5 characters requires an explicit comment justifying it and a negative fixture.
6. **Path-qualified hosts are matched as host + path prefix**, not as a host substring: `bing.com/chat` becomes `{ host: "bing.com", pathPrefix: "/chat" }`, so bare `bing.com` cannot match it.

**Registry** (host → engine), consolidating all three lists:

`chatgpt.com`, `chat.openai.com`, `openai.com` → ChatGPT · `perplexity.ai` → Perplexity · `gemini.google.com`, `bard.google.com` → Gemini · `copilot.microsoft.com`, `bing.com/chat`, `edgeservices.bing.com` → Copilot · `claude.ai` → Claude · `grok.com`, `x.ai` → Grok · `chat.deepseek.com` → DeepSeek · `chat.mistral.ai` → Le Chat · `duck.ai` → DuckAssist · `meta.ai` → Meta AI · `poe.com` → Poe · `phind.com` → Phind · `kagi.com` → Kagi · `you.com` → You.com

**UTM registry:** exact values only — `chatgpt.com`, `perplexity`, `perplexity.ai`, `copilot`, `gemini`, `claude.ai`. Anything not exactly listed is not an AI source.

### 4.2 Required negative fixtures

The contract test fails if any of these classify as AI:

| Input | Must classify as | Guards against |
|---|---|---|
| `utm_source=bing`, referrer `https://www.bing.com/search?q=...` | organic search | §3.1 `bing` token |
| referrer `https://www.bing.com/` (no `/chat`) | organic search | path-prefix collapse |
| `utm_source=youtube`, referrer `https://www.youtube.com/` | referral | §3.1 `you` token |
| `utm_source=meta`, `utm_medium=cpc` | other paid | §3.1 `meta` token |
| `utm_campaign=gemini_test`, no AI source or referrer | direct/unknown | §3.2 campaign contamination |
| referrer `https://foryou.com.au/` | referral | `you.com` suffix collapse |
| referrer `https://notchatgpt.com.example/` | referral | suffix-match correctness |
| `utm_source=x`, referrer empty | direct/unknown | short-token catastrophe |
| referrer `https://www.google.com/search?q=...` | organic search | AI-Mode traffic is **not** separable — must not be guessed as AI |

**Ambiguous-by-policy — decide explicitly, do not leave to chance:** `you.com` and `kagi.com` are search engines with AI answer modes, so a bare visit is not necessarily an AI referral. **Ruling for this spec: classify them as `other_ai` and keep them out of the headline AI-referral figure**, matching the admin surface's existing conservatism. Record the decision in the module docstring.

### 4.3 The enum and where it is derived

**Values (closed set):** `chatgpt` · `copilot` · `perplexity` · `gemini` · `claude` · `grok` · `other_ai` · `none`.

**Derivation point:** in middleware, **before** any sanitisation, and **before** the `Object.keys(captured).length === 0` early return — so untagged arrivals are covered. Inputs: the `Referer` header and the exact `utm_source` value.

**Privacy, binding:**
- The raw referrer string is used **in-process only** and discarded immediately. Only the enum value leaves the derivation.
- **No new identifier, no PHI, no free text, no raw query string persisted anywhere.**
- The enum is a low-cardinality, non-identifying category. It must not be combined with anything that could re-identify.
- Existing sanitisation in `attribution-storage.ts` and `posthog-privacy.ts` is **unchanged**.

### 4.4 Persistence — mandatory and complete, not conditional

An earlier draft said "schema migration if a column is required". **It is required, and the full path is in scope or the enum is not built at all — there is no half version.**

1. **Migration:** add a nullable enum/text column to `intakes` (e.g. `ai_source_detected`). Follow the `CLAUDE.md` migration discipline — apply, verify in production, record the receipt, update the migration count in `CLAUDE.md` and regenerate `AGENTS.md`. Note the known MCP `apply_migration` generated-version gotcha and reconcile `schema_migrations` to the file timestamp.
2. **Both checkout paths carry it end to end:**
   - **Guest** — cookie → guest checkout → intake row → Stripe session → payment finalisation.
   - **Authenticated** — cookie → authenticated checkout → intake row → payment finalisation.
   - **Retry payment** must preserve the original value and must not overwrite it with a later, session-derived one.
3. **Write-once semantics:** first non-`none` value wins, mirroring `heard_about_us`. A later navigation must not overwrite an earlier detection.
4. **Payment finalisation must not drop it** — the value has to survive the webhook/fallback confirmation path that sets `paid_at`.
5. All reporting uses canonical `paid_at` / `refunded_at` windows.

### 4.5 Capture-validation counter

Without a denominator, "zero detections" is uninterpretable.

- **Denominator: eligible landing requests** — requests that reached the derivation point and were eligible for classification. **Not "visits" and not "sessions"** — session semantics would require privacy-safe deduplication, which is explicitly out of scope here.
- Excluded from eligibility: capability/bearer paths already excluded by `isExternalAnalyticsExcludedPathname`, and internal or health-check traffic.
- Emit an aggregate-only counter: eligible landing requests, detections by enum value. **No identity, aggregate only** — the `operational_metrics` table is the appropriate shape.
- Report format, fixed: **"N detections among M eligible landing requests and K orders over \[closed window\]."**

### 4.6 Contract tests

1. All negative fixtures in §4.2.
2. **Parity:** all three surfaces return the same engine for the same input — the test that makes divergence impossible to reintroduce.
3. **No-substring guard:** the module contains no `.includes()` on host or UTM fields, and no token shorter than 5 characters without a justifying comment.
4. Enum derivation runs on the untagged path (the §2.2 regression).
5. Write-once semantics hold across guest, authenticated, and retry-payment paths.
6. Raw referrer query strings are absent from every persisted surface after derivation.

### 4.7 Documentation (Doc Maintenance Policy — required, same commit)

- `CLAUDE.md` — attribution/analytics pipeline section: the enum, its derivation point, the privacy posture, the new column, and the three-surface consolidation. Then `scripts/sync-agent-doc.sh` → `AGENTS.md` (never hand-edit `AGENTS.md`).
- `docs/ARCHITECTURE.md` — Core Tables + the new column.
- `docs/SECURITY.md` — confirm the enum is non-PHI and record why.
- Migration count in `CLAUDE.md`/`AGENTS.md` with the production receipt.

---

## 5. What this measures, and what it cannot

**Can answer:** whether any arrival carries a Copilot/Bing-AI referrer signal at all, at what rate against a known denominator, and whether the AI channel is genuinely ChatGPT-only or merely *measured* as ChatGPT-only.

**Cannot answer:**
- **Whether Bing citation causes revenue** — that is Phase 2, needs treatment/control, and this only supplies the instrument.
- **Google AI Mode / AI Overviews clicks** — they arrive as plain `google.com` organic and are structurally indistinguishable. The classifier must **not** guess (negative fixture in §4.2).
- **Referrer-stripped arrivals** — in-app browsers and some free-tier paths send nothing. These land in `none`, and `none` is not evidence of absence.

**Pre-committed interpretation, so it cannot be chosen after the fact:**

| Result after ≥30 days | Reading |
|---|---|
| Non-trivial detections | Measurement hole was real. Re-baseline the channel mix before any Phase 2 conclusion |
| **Zero** detections on a healthy denominator (M large, ChatGPT detections present) | Copilot citations genuinely do not produce arrivals — a real ceiling. Supports Phase 2 Outcome C |
| Zero detections **and** a small or zero denominator | **The instrument is broken.** Fix it; conclude nothing about the channel |

That third row is the one worth pre-committing: a broken collector and a real ceiling look identical in the headline number.

---

## 6. Out of scope

Session-level deduplication · weakening any existing sanitiser · persisting raw referrers or query strings · any new identifier · client-side classification changes beyond consuming the shared module · Phase 1 or Phase 2 experiment work · GA4 (we are on PostHog; Google's published referrer list is used only as a reference for the registry).

---

## 7. Implementation sequencing

1. **This specification is reviewed and approved.** ← current gate
2. Shared classifier module + negative fixtures + parity tests. **No schema change.** Own PR, own review — independently valuable, since it fixes the §3 live bugs.
3. Migration + derivation + full persistence path + counter. Own PR, own review, production receipt.
4. Reporting surfaces consume the enum; scorecard row 9 goes live.
5. Thirty days of forward data, then report the §5 count.

Step 2 is deliberately separable: the classifier defects are worth fixing on their own merits whether or not the enum is ever built.

---

## Appendix A — companion Phase 0 read-only audit: AI fetcher access

Run 2026-07-30. **Result: clean, no action required.**

| Check | Finding |
|---|---|
| `vercel.json` | No firewall, bot-management, or user-agent rules. Only region, ignoreCommand, a www→apex redirect, and crons |
| `middleware.ts` | **No user-agent handling of any kind** — no bot detection, no crawler branching |
| Live fetch, 8 distinct AI/crawler user agents × `/`, `/medical-certificate`, `/prescriptions` | **All 200.** ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, Claude-User, Claude-SearchBot, bingbot, DuckAssistBot — identical to the browser baseline |

**Conclusion:** the parent plan's concern that `ChatGPT-User` / `Perplexity-User` / `Meta-ExternalFetcher` (which ignore robots.txt by vendor documentation) might be dying at a WAF challenge is **not supported**. Nothing is challenging them.

**Residual limitation, stated rather than glossed:** this tested spoofed user agents from a consumer IP. A Vercel dashboard-level firewall rule keyed on something other than user agent — IP reputation, TLS fingerprint, rate — would not necessarily show up. Confirming that requires the Vercel dashboard Firewall tab, which is an operator check. Given no repo-level config and no observed challenge, the residual risk is low and this is **not** a blocker for any phase.

**This also supports the parent plan's decision not to add robots.txt blocks** for `Claude-User`, `DuckAssistBot`, `Amzn-SearchBot`, or `MistralAI-User`: they are already served under the `User-Agent: *` allow, and the audit confirms nothing upstream is interfering.
