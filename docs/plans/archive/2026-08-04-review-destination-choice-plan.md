> **ARCHIVED 2026-08-07 — BLOCKED as written, superseded by the shipped inline destination choice.**
> External review (2026-08-07) blocked this plan's implementation: the "91% destination drop-off" premise conflated three non-joinable evidence types (aggregate PostHog occurrences, keyed email traversals, separately-recorded public totals); the /review interstitial would have moved the bearer capability key into a rendered URL under strict-origin-when-cross-origin; and per-destination "completion rates" are not derivable from any instrument we run. What shipped instead: two labelled destinations inline on the two post-delivery cards via an allowlisted destination token on the existing /api/review-redirect (ProductReview primary, Google secondary), reported as SELECTION SHARES only. Email stays ProductReview-direct. Do not execute the workstreams below.

# Review destination choice — implementation plan

> **Status:** DRAFT, awaiting review. Nothing built yet.
> **Author:** Claude (Opus 5), 2026-08-04. Recon by Fable 5.
> **Decision owner:** operator. This plan partially reverses a deliberate 2026-07-09 decision — see §2.

---

## 1. The problem, in numbers

| Signal | 90 days | Source |
|---|---|---|
| In-app review CTA clicks (`review_cta_clicked`) | **21** | PostHog |
| Email review clicks (`review_request_unique_traversal`) | **2** | PostHog |
| Review emails delivered | 126 (of 183 sent, 194 rows) | `email_outbox` |
| **ProductReview public reviews** | **2** | `operational_metrics.productreview_review_total`, snapshot 2026-07-23 |

~23 people clicked through to ProductReview with clear intent. **2 posted. ~91% dropped off at the destination.**

ProductReview requires sign-in *after* writing, plus a 10-word minimum. The ask is not the constraint — the destination is. In-app asks already outperform the email 10:1, so placement and timing are not the constraint either.

**The trajectory that should decide this.** `docs/plans/2026-07-30-ai-organic-growth-plan.md` targets 60 reviews. At ~2 per 90 days, ProductReview reaches 60 in roughly **seven years**. The current single-destination strategy is not converging on its own goal.

### Correcting two earlier claims

Recorded so the review does not inherit them:

1. **"Nobody clicks, so the destination is not the constraint."** Wrong — derived from the email funnel alone. In-app clicks are 10× the email and bounce at the destination.
2. **"The placement fix made it worse" (survey, 8.0% → 4.9%).** Not supportable — order volume tripled and the mix shifted from ~0% to 50% paid in the same window. Different cohorts. The correct claim is narrower: the rate sits in a 5–8% band and placement changes have not moved it out.

---

## 2. What this reverses, and what it does not

`components/patient/review-nudge-card.tsx` was **`GoogleReviewCard`**, linking straight to Google with a 5-star badge. It was repointed to ProductReview and de-starred on **2026-07-09**, deliberately, because ProductReview is the "#1 off-site citation blocker" — the AU surface answer engines cite, entity-linked from `sameAs`, with Trustpilot's arm intentionally left empty (`TRUSTPILOT_REVIEW_URL` defaults to `""`) to concentrate volume on the keystone.

**This plan does not restore that.** It does not point any ask at Google, does not restore star imagery, and does not change the default destination. It adds a **choice at the moment intent is already proven**, keeping ProductReview first and framed for its strategic value.

**Downside is bounded and worth stating plainly:** ProductReview is currently accruing ~2 reviews per 90 days. There is very little volume left to cannibalise. The realistic worst case is that ProductReview stays where it is while Google accrues; the realistic best case is both rise because ~19 bouncing users per quarter now complete somewhere.

---

## 3. Design

### 3.1 Why not two icons in the card

The operator's proposal was two icons side by side in the ask itself. The evidence argues against putting the choice there:

- The **initial** ask is the low-intent moment. Adding a decision where people are least committed typically lowers total action.
- By **post-click**, intent is proven — that is exactly where optionality converts rather than deters.
- A post-click choice yields **per-destination completion rates**, which turns the GEO-vs-volume trade-off from an argument into a measurement.

So: one button in the ask (unchanged), the choice on an interstitial.

### 3.2 Why an interstitial page, not a modified redirect

`/api/review-redirect/route.ts` is a privacy-hardened 302. `lib/__tests__/review-redirect-privacy.test.ts` asserts **`status === 302` on every path**, plus `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, and that the click key never appears in `Location`. Converting it into a rendering page would break that pin and weaken a deliberate privacy posture.

Instead: **add a page, keep the route a 302.**

```
ask (card or email)
      │  ①  →  /review?utm_*&review_click_key=…        [new page, noindex]
      │            consumes the key, fires the SAME event as today
      │
      ├── ②a → /api/review-redirect?destination=productreview&utm_*  → 302 off-site
      └── ②b → /api/review-redirect?destination=google&utm_*         → 302 off-site
```

### 3.3 Backward compatibility — non-negotiable

**Emails already delivered contain the old `/api/review-redirect?…&review_click_key=…` URL and will keep being clicked for months.** The route must stay fully backward-compatible:

- With **no** `destination` param → behaviour is **byte-for-byte unchanged** (keyed/`review_request` → `PRODUCTREVIEW_REVIEW_URL`; otherwise `getRotatingReviewUrl`).
- `destination` is a **strict allowlist** (`"google" | "productreview"`), resolved server-side to a constant. **It is never a URL and never interpolated** — same allowlist discipline the route already applies to `utm_source`/`utm_medium`/`utm_campaign` via `allowedDimension()`. An unknown value falls back to current behaviour.

This is an open-redirect-shaped surface. It must not become one.

### 3.4 Measurement semantics

| Event | When | Notes |
|---|---|---|
| `review_request_unique_traversal` | key consumed on `/review` load | **Unchanged meaning** ("clicked the email link") and unchanged properties, so the existing funnel RPC and admin card keep working |
| `review_cta_clicked` | non-keyed arrival on `/review` | Unchanged meaning ("clicked an in-app card") |
| `review_destination_chosen` *(new)* | button click on `/review` | `{ destination, source, medium }` — aggregate-only, no identifiers |

Key consumption moves from the 302 to the `/review` server render. Consumption stays single-use and idempotent (`consume_review_request_click` returns `false` on a second call, and the page still renders), so no user-facing behaviour changes. Note the pre-existing caveat is unchanged: email security scanners that fetch links can consume a key. That risk exists identically today.

---

## 4. Work items

### W1 — `/review` interstitial page
**New:** `app/review/page.tsx` (server component).

- `robots: { index: false, follow: false }` — matches `app/heard-thanks/page.tsx`.
- Reads `utm_source` / `utm_medium` / `utm_campaign` / `review_click_key` through the **same allowlist helper** the route uses. Extract `allowedDimension()` and the three `Set`s into `lib/reviews/review-link-params.ts` so page and route cannot drift.
- On render: if a valid key → `consumeReviewClickKey()` → on `true`, capture `review_request_unique_traversal` with **exactly today's four properties**. Else if medium is a card medium → capture `review_cta_clicked`. Wrapped in try/catch: **measurement failure must never block the page**, matching the route's existing posture.
- Renders two plain buttons, ProductReview first:
  - **ProductReview** — "Helps people find us in AI search. Has a short sign-in at the end."
  - **Google** — "Quickest if you're already signed in to Google."
- Copy is honest about the friction on each, so the choice is informed rather than a coin-flip.
- **No star glyphs, no ratings, no review counts** (ADVERTISING_COMPLIANCE.md §6).

### W2 — `destination` param on the redirect
**Modify:** `app/api/review-redirect/route.ts`.

- Add allowlisted `destination`; resolve to `PRODUCTREVIEW_REVIEW_URL` or `GOOGLE_REVIEW_URL`.
- Capture `review_destination_chosen`.
- **Absent/unknown `destination` → existing code path, untouched.**
- Preserve all existing headers and the 302.

### W3 — Point the asks at `/review`
**Modify:** `components/patient/review-ask-card.tsx`, `components/patient/review-nudge-card.tsx`, `lib/email/components/templates/review-request.tsx`.

- Swap `/api/review-redirect` → `/review`, same query params.
- Card copy stays destination-neutral.
- Email keeps `review_click_key`; only the path changes.

> **This breaks a contract pin and must be updated in the same commit.**
> `lib/__tests__/review-cta-destination-contract.test.ts:77` asserts
> `expect(reviewAskCardSource).toContain("/api/review-redirect")`, and the file
> header documents the email redirecting "through /api/review-redirect".
> Retarget those assertions to `/review` and update the header comment — the
> *intent* of the pin (asks route through a tracked internal hop, never
> hard-code an off-site destination) is preserved and should be re-stated in the
> assertion message. Do not weaken it to a substring that both paths satisfy.

### W4 — Fix the `post_delivery` medium bug *(pre-existing, small)*
`ReviewAskCard` sends `utm_medium="post_delivery"`, which is **not** in `REVIEW_MEDIA`, so it is silently coerced to `review_cta`. The in-app card's medium has therefore never been recorded distinctly. Either add `post_delivery` to the allowlist or change the card to send `review_cta`. **Prefer adding it to the allowlist** — it preserves a real distinction between the delivery-moment ask and the dashboard nudge.

### W5 — Route `/heard-thanks` through the same path *(consistency)*
`app/heard-thanks/page.tsx` links **directly** to `GOOGLE_REVIEW_URL` with a **⭐ glyph** — untracked, and the only surface still using a star while the destination contract bans stars elsewhere. Point it at `/review?utm_source=heard_thanks&utm_medium=review_cta&utm_campaign=review` and drop the glyph.

### W6 — Contract test updates *(deliberate, not incidental)*
- `lib/__tests__/review-cta-destination-contract.test.ts` — three separate changes, each deliberate:
  1. **Retarget** the `/api/review-redirect` assertion (line 77) and the file-header comment to `/review`, per the note in W3.
  2. **Keep unchanged** the pins that the cards and email name no off-site destination (`/productreview\.com\.au|g\.page|trustpilot/i`), carry no star glyphs, and contain no "Google review" copy. Those still hold — only `/review` names destinations.
  3. **Add** a pin for `app/review/page.tsx`: exactly two destinations, both present, no stars, no counts, no ratings.
- The `getRotatingReviewUrl` ProductReview pin (months 0,1,5,6,11 → `productreview.com.au`, never `g.page`) **stays as-is**. The default destination is not changing.
- `lib/__tests__/review-redirect-privacy.test.ts` — keep every 302 and header pin; add: `destination=google` → Google, `destination=productreview` → ProductReview, **unknown/absent → today's exact behaviour**, and a case asserting a URL-valued `destination` is ignored rather than followed.
- **New:** `/review` page test — key consumed once, correct event properties, measurement failure still renders, no identifiers in captures.

### W7 — Google review total metric
Add a `google_review_total` snapshot alongside `productreview_review_total` in `operational_metrics`, recorded the same manual-admin way. Without it, the experiment has no denominator on the Google side and cannot be judged.

---

## 5. How we will know if it worked

**Baseline (2026-08-04):** 23 click-throughs / 90d → 2 reviews (~9% completion). ProductReview total 2, Google total unknown until W7.

**Checkpoint: 30 days after ship.** Compare:
- `review_destination_chosen` split (Google vs ProductReview)
- completion rate per destination (chosen → total delta)
- **ProductReview total — did it fall below its current run-rate?**

**Decision rules, set in advance:**
- Total reviews up and ProductReview flat-or-up → **keep**.
- Total reviews meaningfully up but ProductReview at zero for 30d → **operator call**: order volume vs citation keystone. Do not let this resolve silently by default.
- No change in total → **revert W3** (point asks back at `/api/review-redirect`); the interstitial was a wasted hop.

Revert is cheap by construction: W3 is a path swap, and W2 is additive and inert without a `destination` param.

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Open redirect via `destination` | **High** | Strict allowlist → server constant. Never a URL. Pinned by test (W6). |
| Extra hop lowers click-through | Medium | The hop only follows a proven click. Measurable via `review_destination_chosen` ÷ `review_cta_clicked`; revert rule in §5. |
| GEO keystone starves | Medium | ProductReview listed first with the AI-search framing; only ~2/90d to lose; 30-day checkpoint with an explicit operator decision. |
| Key consumed on interstitial then abandoned | Low | Already single-use today; consumption is idempotent and never blocks. No change in user-facing behaviour. |
| Email scanners consume keys | Low | Pre-existing and unchanged by this plan. |
| Compliance drift (stars/counts) | Medium | No stars or counts on `/review`; W5 removes the last ⭐; pinned by W6. |

---

## 7. Explicitly out of scope

- Changing the **default** destination or `getRotatingReviewUrl` rotation.
- Restoring star imagery or displaying any rating/count on our surfaces (s133 line, ADVERTISING_COMPLIANCE.md §6).
- Trustpilot — its arm stays empty.
- The attribution survey. Separate instrument, separate decision. It is **not** being removed; the earlier recommendation to remove it was withdrawn.
- Review-email timing, cadence, and eligibility. Unchanged.

---

## 8. Open questions for the reviewer

1. **Order and framing on `/review`** — ProductReview first (protects the keystone) or Google first (maximises volume)? Plan assumes ProductReview first.
2. **Should the email skip the interstitial?** Its click-through is already 2/90d; an extra hop there may be a real cost for negligible benefit. Arguable that only in-app asks (21/90d) route via `/review`, with the email continuing straight to ProductReview.
3. **W5** — is folding `/heard-thanks` in scope creep, or the right consistency fix?
4. **Is the 30-day checkpoint long enough** at ~7 clicks/month to distinguish signal from noise? A 60-day window may be needed for a real read.
