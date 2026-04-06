# Revenue & Engagement Improvements

**Date:** 2026-04-06
**Status:** Approved
**Scope:** GSC fix, abandoned checkout sequence, referral visibility, review request system, Rx subscription nudge

---

## 1. Fix: GSC Duplicate FAQPage Schema

**Problem:** Google Search Console reports "Duplicate field 'FAQPage'" on blog articles (e.g., `/blog/is-telehealth-bulk-billed-australia`). Two FAQPage schemas on one page — JSON-LD from `<FAQSchema>` in the blog page template AND microdata (`itemType="https://schema.org/FAQPage"`) in `ArticleTemplate`'s `FAQSection`.

**Fix:** Strip microdata attributes (`itemScope`, `itemProp`, `itemType`) from `FAQSection` in `components/blog/article-template.tsx`. Keep JSON-LD (Google's preferred format). The `<details>` FAQ elements stay — just without schema markup.

**Files:** `components/blog/article-template.tsx`

---

## 2. Abandoned Checkout Email Sequence (2 emails)

**Current state:** Single email at 1h mark via hourly cron. Tracks `abandoned_email_sent_at`.

**Upgrade:**

| Email | Timing | Subject | Tone |
|-------|--------|---------|------|
| Nudge | 1h after checkout start | "Hey {name}, you left something behind" | Warm, no pressure |
| Last call | 24h after checkout start | "Last call — your {service} request expires soon" | Gentle urgency, social proof |

**Changes:**
- Add `abandoned_followup_sent_at` column to `intakes` table
- Modify `findAbandonedCheckouts()` to also find 24h-old intakes where nudge was sent but followup wasn't
- New email template: `components/email/templates/abandoned-checkout-followup.tsx`
- Update subject line on existing email to be warmer
- Both emails: `canSendMarketingEmail()` check, `List-Unsubscribe` header

---

## 3. Referral CTA in Approval Emails

**Current state:** Referral mention only in day-3 follow-up. Not in any approval/delivery email.

**Change:** Create `ReferralCTA` component in `components/email/base-email.tsx` (alongside existing `GoogleReviewCTA`). Add to all approval/delivery templates:

- `med-cert-patient.tsx`
- `prescription-approved.tsx`
- `consult-approved.tsx`
- `script-sent.tsx`
- `ed-approved.tsx`
- `hair-loss-approved.tsx`
- `weight-loss-approved.tsx`
- `womens-health-approved.tsx`

Pattern: below `GoogleReviewCTA`, add referral link with $5 credit offer.

---

## 4. Review Request System (2 dedicated emails)

**Email 1 — Day 2 post-approval:**
- Subject: "Quick favour? ⭐"
- Warm, personal: "Hey {name}, glad we could help... if you've got 30 seconds, a Google review means the world."
- Big "Leave a Review ⭐" button → Google Review URL
- Tracks `review_email_sent_at` on intakes

**Email 2 — Day 7 post-approval (if no review click):**
- Subject: "Still happy with us? 😊"
- Lighter touch, gentle nudge
- Same review button
- Tracks `review_followup_sent_at` on intakes

**New files:**
- `components/email/templates/review-request.tsx`
- `components/email/templates/review-followup.tsx`
- `lib/email/review-request.ts` (find + send logic)
- `app/api/cron/review-request/route.ts`

**Cron:** Daily, finds approved intakes at day 2 and day 7. Checks `canSendMarketingEmail()`.

---

## 5. Repeat Rx Subscription Nudge (day 30)

**Target:** Patients who completed a one-off repeat script (not subscribed).

**Email at day 30:**
- Subject: "Time for your next script? Save with a subscription"
- Shows savings: $29.95 one-off vs $19.95/mo subscription
- CTA → `/request?service=prescription`
- Tracks `subscription_nudge_sent_at` on intakes

**New files:**
- `components/email/templates/subscription-nudge.tsx`
- `lib/email/subscription-nudge.ts`
- `app/api/cron/subscription-nudge/route.ts`

**Cron:** Daily, finds repeat script intakes approved ~30 days ago with no active subscription and no nudge sent.

---

## 6. Express Review

**Decision:** Keep default OFF. Default ON feels too aggressive for a healthcare product.

No code changes.

---

## Email Timeline (post-approval)

| Day | Email | Purpose |
|-----|-------|---------|
| 0 | Approval email | Certificate/script delivery + review CTA + referral CTA |
| 2 | Review request | Dedicated review ask, warm tone |
| 3 | Follow-up reminder | Consult upsell (existing, unchanged) |
| 7 | Review follow-up | Gentle nudge if no review click |
| 30 | Subscription nudge | Repeat Rx only, subscription offer |

---

## DB Migration

New columns on `intakes` table:
- `abandoned_followup_sent_at` timestamptz
- `review_email_sent_at` timestamptz
- `review_followup_sent_at` timestamptz
- `subscription_nudge_sent_at` timestamptz

---

## Tone Guidelines

All new emails use warm, informal Australian English:
- First name only ("Hi Sarah" not "Dear Ms Smith")
- Conversational ("glad we could help" not "we are pleased to inform you")
- Sparing emoji use (subject lines and key CTAs only)
- No clinical language unless medically necessary
- Short paragraphs, mobile-friendly
