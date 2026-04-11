# Email System Overhaul — Design Doc

**Date:** 2026-04-11  
**Scope:** base-email.tsx, all ~30 templates, new magic-link template, Supabase auth webhook  
**Trigger:** Brand voice inconsistency, serif font bug, bare Supabase magic link, crowded footer, weak review prompt

---

## Problems Being Solved

1. **Magic link email** is Supabase default (bare-bones "Follow this link to login: Log In") — not in our Resend pipeline, zero brand
2. **Payment receipt** is clinical in tone, receipt block dominates hierarchy, "Receipt Details" heading renders serif in some email clients
3. **Footer** is 5 stacked lines, too much noise — crowded and hard to scan
4. **Google review badge** looks amateurish — tiny G circle, cramped layout, buried in footer
5. **Referral CTA** sits in the middle of the body, breaking hierarchy
6. **Subject lines** are inconsistent (30 templates, no shared voice guide)
7. **Em dashes** everywhere — AI tell, must be removed globally
8. **Serif font bug** — HeroBlock `<h1>` and Heading components lack inline `fontFamily`, causing email clients to fall back to system serif
9. **Verification code box** oversized relative to its utility

---

## Design Decisions

### 1. Supabase Auth Webhook

**Mechanism:** Configure Supabase "Send Email" auth hook pointing at `POST /api/webhooks/supabase-auth`. Supabase signs the request with a JWT using the project's JWT secret (`SUPABASE_AUTH_WEBHOOK_HOOK_SECRET`). We validate with `jose`.

**Handled types:**
- `magiclink` → new `MagicLinkEmail` template
- `recovery` → new `PasswordResetEmail` template (simple, reuses same structure)
- `signup` → route to existing `WelcomeEmail` if available, else MagicLinkEmail
- `email_change` → plain magic-link style with "Confirm your new email" copy

**Magic link URL construction:**
```
${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}
```

**New env vars:**
- `SUPABASE_AUTH_WEBHOOK_HOOK_SECRET` — JWT secret Supabase uses to sign hook payloads

**Supabase config:** Authentication > Hooks > Send Email > HTTP endpoint = `${APP_URL}/api/webhooks/supabase-auth`

---

### 2. Base Email: Font Fix

**Root cause:** `HeroBlock` renders `<h1>` without inline `fontFamily`. The `<style>` block sets `font-family !important` on `h1` but several email clients (Apple Mail, Samsung Mail) apply their system serif fallback for heading tags regardless.

**Fix:** Add `fontFamily` inline to every heading element in `HeroBlock`, `Heading`, and `VerificationCode` components.

---

### 3. Google Review CTA Redesign

**Removed:** Blue G circle, cramped 3-column table layout, generic "Help others find fast, easy healthcare" copy

**New design:**
```
+------------------------------------------+
|  ⭐⭐⭐⭐⭐                              |
|                                          |
|  "If we saved you a trip to the GP,     |
|   a quick Google review would mean      |
|   the world to us."                     |
|                                          |
|  [  Leave a Google review   ]            |
+------------------------------------------+
```

- Centered, generous padding, soft border
- Stars: emoji row (★★★★★) in amber, large font
- Copy: warm/personal, no em dashes
- Button: full-width blue, same style as primary CTA
- Replaces `showFooterReview` prop with `showReviewCTA` (rename for clarity)

**Where it appears:**
- `med-cert-patient.tsx` (cert ready)
- `script-sent.tsx` (eScript sent)
- `prescription-approved.tsx` (Rx approved)
- `ed-approved.tsx`, `hair-loss-approved.tsx`, `womens-health-approved.tsx`, `weight-loss-approved.tsx`, `consult-approved.tsx` (specialty approvals)

**Does NOT appear on:** payment-receipt, payment-confirmed, declined, failed, reminder, magic-link emails

---

### 4. Footer Restructure

**From (5+ lines):**
```
Privacy · Terms · Manage preferences
Made with care in Australia 🌤️
Trusted by 3,000+ Australians · 5 ★ on Google
InstantMed Pty Ltd · ABN 64 694 559 334
Level 1/457-459 Elizabeth St, Surry Hills NSW 2010
```

**To (3 lines):**
```
Privacy · Terms · Manage preferences
Made with care in Australia 🌤️ · Trusted by 3,000+ Australians · 5 ★ on Google
InstantMed Pty Ltd · ABN 64 694 559 334 · Level 1/457-459 Elizabeth St, Surry Hills NSW 2010
```

---

### 5. Referral CTA Relocation

**From:** Placed manually in individual templates mid-body (after verification code)

**To:** Optional prop `showReferral={boolean}` on `BaseEmail`. Renders as a single compact line just above the footer divider — not a standalone section. Remove from individual template bodies.

Copy: "Know someone who needs this? Give them $5 off and get $5 yourself."

---

### 6. Payment Receipt Restructure

**New hierarchy:**
1. HeroBlock — "You're all set!" / `amount · serviceName` subtitle / success variant
2. Warm body — "Hey [Name], your [service] is with a doctor now. We'll send it over the moment it's done, usually within the hour."
3. CTA button — "Track your request"
4. Divider
5. Tax receipt card — distinct `#F5F7F9` background, `border-radius: 10px`, explicit `fontFamily` on all text:
   - Small all-caps header: `TAX RECEIPT · INSTANTMED PTY LTD · ABN 64 694 559 334`
   - Rows: Service, Amount paid, GST included, Date, Reference

**No:** `<Heading as="h3">` inside the receipt — use styled `<p>` with explicit font-family to prevent serif

---

### 7. Verification Code Component

- Reduce padding: `10px 16px` -> `8px 12px`
- Reduce number size: `18px` -> `15px`  
- Remove "VERIFICATION CODE" label (context already provides this)
- Keep mono font, keep dark color

---

### 8. Subject Line Standards

**Voice rules:**
- First name wherever available: `[Name], your cert is ready 🎉`
- Australian casual: "All sorted!" not "All sorted,"
- No em dashes: use comma, period, or restructure
- No colons mid-sentence: use comma
- No "Reminder:" prefix
- Emoji: positive-only (cert ready, script ready, welcome, approved); none on failed/declined/retries

**Key fixes:**
| Template | Current | Fixed |
|---|---|---|
| payment-receipt | `Payment confirmed: ${service}` | `[Name], payment received for your ${service}` |
| payment-confirmed | `Payment received, ${amount} for your ${requestType} ✅` | `Payment received for your ${requestType} ✅` |
| request-received | `All sorted — your ${requestType} is with a doctor 👍` | `All sorted! Your ${requestType} is with a doctor 👍` |
| decline-reengagement | `We're still here to help — other options for you` | `We're still here to help. Other options for you` |
| exit-intent-reminder | `Your ${service} — ready when you are` | `Your ${service} is ready when you are` |
| abandoned-checkout-followup | `Last call — your ${service} request expires soon` | `Last call! Your ${service} expires soon` |
| payment-failed | `Heads up: there was a hiccup...` | `Heads up, there was a hiccup...` |
| repeat-rx-reminder | `Reminder: Time to renew...` | `Time to renew your ${medication} prescription` |
| payment-retry | `Just a heads up: your payment needs another go` | `Just a heads up, your payment needs another go` |
| follow-up-reminder | `Checking in: how are you feeling?` | `Checking in, how are you feeling?` |
| subscription-nudge | `Time for your next script? Save with a subscription` | `Time for your next script? Save on every refill` |

---

### 9. Em Dash Removal (Global)

All instances of ` — ` in email templates and base-email.tsx replaced with:
- ` — ` between clauses: split into two sentences, or use `, `
- ` — ` at end of a phrase leading into detail: use `. ` or `, `

This applies to both subject lines and body copy.

---

### 10. Magic Link Email Template

**Structure:**
- HeroBlock — 🔑 "Log in to InstantMed" / "Tap below to continue" / info variant
- Body: "One tap and you're in. This link expires in 60 minutes and works once only."
- CTA: "Log in to InstantMed" (full-width blue button)
- Security: small muted text — "Didn't request this? You can ignore this email safely. Your account is secure."
- `showFooterReview={false}`, `showReferral={false}`

---

## Files Changed

| File | Change |
|---|---|
| `components/email/base-email.tsx` | Font fix (h1/h2/h3 inline fontFamily), new GoogleReviewCTA, footer collapse, showReferral prop, VerificationCode compact, rename showFooterReview |
| `components/email/templates/payment-receipt.tsx` | Full restructure |
| `components/email/templates/magic-link.tsx` | New file |
| `app/api/webhooks/supabase-auth/route.ts` | New file |
| `components/email/templates/med-cert-patient.tsx` | Remove ReferralCTA, update showReviewCTA |
| `components/email/templates/request-received.tsx` | Subject fix, em dash removal |
| `components/email/templates/payment-confirmed.tsx` | Subject fix |
| `components/email/templates/payment-receipt.tsx` | Subject fix |
| All ~30 templates | Subject line + em dash audit |
| `docs/OPERATIONS.md` | Add SUPABASE_AUTH_WEBHOOK_HOOK_SECRET env var |
| `docs/SECURITY.md` | Add webhook secret entry |

---

## Out of Scope

- Email A/B testing or analytics tracking on CTA clicks (PostHog events)
- New approval email templates
- Template previews/live reload dev tooling
- Parchment or Stripe webhook email changes
