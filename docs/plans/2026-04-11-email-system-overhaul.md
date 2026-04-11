# Email System Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring every transactional email up to brand standard — warm voice, no serif bugs, a review CTA that actually converts, a clean footer, a proper magic-link email, and zero em dashes.

**Architecture:** All changes are in `components/email/base-email.tsx` (shared primitives), individual templates in `components/email/templates/`, and a new API route for the Supabase auth webhook. No new dependencies required — `jose` is already available via Supabase's SDK. Testing via `pnpm typecheck` (types compile) and the admin email preview at `/admin/emails/preview`.

**Tech Stack:** React 18, React Email (JSX rendered server-side), Resend, Supabase Auth Hooks, Next.js 15 App Router

---

## Task 1: Fix Serif Font Bug in Base Email Primitives

**Problem:** `HeroBlock` renders `<h1>` without `fontFamily` inline. The CSS `!important` rule in the `<style>` block doesn't override system serif on Apple Mail / Samsung Mail for heading tags.

**Files:**
- Modify: `components/email/base-email.tsx` — `HeroBlock`, `Heading`, `VerificationCode` components

**Step 1: Add `fontFamily` inline to `HeroBlock` h1**

In `HeroBlock`, find the `<h1>` element (around line 752). Add `fontFamily` to its style:

```tsx
<h1
  style={{
    margin: subtitle ? "0 0 4px 0" : "0",
    fontSize: "22px",
    fontWeight: "700",
    color: colors.text,
    letterSpacing: "-0.4px",
    lineHeight: "1.4",
    fontFamily,  // ADD THIS
  }}
>
```

**Step 2: Add `fontFamily` to `Heading` component**

In `Heading` (around line 430), add `fontFamily` to the style object:

```tsx
<Tag
  style={{
    margin: `0 0 ${sizes[as].marginBottom} 0`,
    fontSize: sizes[as].fontSize,
    fontWeight: "600",
    color: colors.text,
    lineHeight: "1.5",
    letterSpacing: sizes[as].letterSpacing,
    fontFamily,  // ADD THIS
  }}
>
```

**Step 3: Add `fontFamily` to `VerificationCode` number span**

In `VerificationCode` (around line 630), find the `<p>` that renders the code. Change its `fontFamily` to the mono stack (keep mono for the number, but ensure the label above also gets sans-serif).

The label `<p>` (the "VERIFICATION CODE" label) should get `fontFamily` added. The code number already has a mono fontFamily override, which is correct.

**Step 4: Verify typecheck**

```bash
pnpm typecheck
```
Expected: no errors

**Step 5: Commit**

```bash
git add components/email/base-email.tsx
git commit -m "fix(email): add inline fontFamily to heading elements to prevent serif fallback"
```

---

## Task 2: Compact VerificationCode + Remove Redundant Label

**Files:**
- Modify: `components/email/base-email.tsx` — `VerificationCode` component (around line 611)

**Step 1: Update `VerificationCode` component**

Replace the entire `VerificationCode` component with this slimmed-down version:

```tsx
export function VerificationCode({ code, verifyUrl }: VerificationCodeProps) {
  return (
    <div
      className="email-code-block"
      style={{
        backgroundColor: colors.surfaceSubtle,
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "8px 12px",
        margin: "12px 0",
        textAlign: "center" as const,
      }}
    >
      <p
        aria-label={`Verification code: ${code.split("").join(" ")}`}
        style={{
          margin: 0,
          fontSize: "15px",
          fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
          fontWeight: "700",
          color: colors.text,
          letterSpacing: "3px",
        }}
      >
        {code}
      </p>
      {verifyUrl && (
        <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: colors.textMuted, fontFamily }}>
          Verify at{" "}
          <a href={verifyUrl} style={{ color: colors.accent, textDecoration: "none" }}>
            {verifyUrl.replace("https://", "")}
          </a>
        </p>
      )}
    </div>
  )
}
```

Key changes: removed "VERIFICATION CODE" label, reduced padding (`8px 12px`), reduced font size (`15px`), added `fontFamily` fallback on the verify URL text.

**Step 2: Verify typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add components/email/base-email.tsx
git commit -m "fix(email): compact VerificationCode component, remove redundant label"
```

---

## Task 3: Redesign Google Review CTA + Rename Prop

**Files:**
- Modify: `components/email/base-email.tsx` — `GoogleReviewCTA`, `BaseEmail` interface, footer section

**Step 1: Rename `showFooterReview` to `showReviewCTA` in `BaseEmailProps`**

```tsx
interface BaseEmailProps {
  children: React.ReactNode
  previewText?: string
  appUrl?: string
  showReviewCTA?: boolean   // was: showFooterReview
  showReferral?: boolean    // NEW (Task 4)
}
```

Update the destructure in `BaseEmail`:
```tsx
export function BaseEmail({ children, previewText, appUrl = "https://instantmed.com.au", showReviewCTA = false, showReferral = false }: BaseEmailProps) {
```

Note: default is now `false` — only opt-in on success emails. This is a change from the current default `true`.

**Step 2: Replace `GoogleReviewCTA` component**

Replace the entire `GoogleReviewCTA` component with:

```tsx
interface GoogleReviewCTAProps {
  href: string
}

export function GoogleReviewCTA({ href }: GoogleReviewCTAProps) {
  const trackingHref = `${href}${href.includes("?") ? "&" : "?"}utm_source=email&utm_medium=review_cta&utm_campaign=review`
  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "20px 24px",
        margin: "24px 0 8px",
        textAlign: "center" as const,
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontSize: "22px", letterSpacing: "2px", lineHeight: "1" }}>
        ★★★★★
      </p>
      <p
        style={{
          margin: "0 0 16px 0",
          fontSize: "14px",
          color: colors.textBody,
          lineHeight: "1.6",
          fontFamily,
        }}
      >
        If we saved you a trip to the GP, a quick Google review would mean the world to us.
      </p>
      <a
        href={trackingHref}
        style={{
          display: "inline-block",
          padding: "12px 28px",
          backgroundColor: colors.accent,
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "600",
          textDecoration: "none",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
          fontFamily,
        }}
      >
        Leave a Google review
      </a>
    </div>
  )
}
```

**Step 3: Move review CTA into the content area of `BaseEmail` (not footer)**

In `BaseEmail`, the review CTA should render inside the content cell, just before the footer divider. Find the `{/* Footer */}` `<tr>` and add the CTA just before it, inside the content `<tr>`:

The content `<tr>` currently just wraps `{children}`. Change it to:

```tsx
{/* Content */}
<tr>
  <td
    className="email-content"
    style={{
      padding: "32px 40px 40px 40px",
      backgroundColor: colors.cardBg,
    }}
  >
    {children}
    {showReviewCTA && (
      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
    )}
    {showReferral && (
      <ReferralCTA appUrl={appUrl} />
    )}
  </td>
</tr>
```

**Step 4: Simplify footer — remove the Google review pill from footer entirely**

In the footer `<tbody>`, remove the entire `{showFooterReview && (...)}` block. The review CTA now lives in the content area, not the footer. The footer only has the links + legal text.

**Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: TypeScript errors on all templates that use `showFooterReview` — this is expected and will be fixed in Task 9.

**Step 6: Commit**

```bash
git add components/email/base-email.tsx
git commit -m "feat(email): redesign review CTA — warm copy, prominent placement, remove from footer"
```

---

## Task 4: Simplify `ReferralCTA` + Add `showReferral` to `BaseEmail`

The `ReferralCTA` component is already defined in `base-email.tsx`. This task simplifies its copy and integrates it via the `showReferral` prop added in Task 3.

**Files:**
- Modify: `components/email/base-email.tsx` — `ReferralCTA` component
- Modify: `components/email/templates/med-cert-patient.tsx` — remove manual `<ReferralCTA />`

**Step 1: Update `ReferralCTA` copy**

Find `ReferralCTA` in `base-email.tsx` and replace its inner `<p>`:

```tsx
export function ReferralCTA({ appUrl }: ReferralCTAProps) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "12px 0 0",
        borderTop: `1px solid ${colors.borderLight}`,
        margin: "16px 0 0",
      }}
    >
      <p style={{ margin: 0, fontSize: "13px", color: colors.textMuted, lineHeight: "1.6", fontFamily }}>
        Know someone who needs this?{" "}
        <a
          href={`${appUrl}/patient?tab=referrals&utm_source=email&utm_medium=referral_cta&utm_campaign=referral`}
          style={{ color: colors.accent, fontWeight: 600, textDecoration: "none" }}
        >
          Give them $5 off and get $5 yourself
        </a>
      </p>
    </div>
  )
}
```

Key changes: smaller font (`13px`), muted color, rendered near footer — not a prominent section.

**Step 2: Remove `<ReferralCTA />` from `med-cert-patient.tsx`**

Open `components/email/templates/med-cert-patient.tsx`. Remove the `<ReferralCTA appUrl={appUrl} />` line and the `ReferralCTA` import. Add `showReferral` prop instead:

```tsx
<BaseEmail
  previewText="Your medical certificate is approved and ready to download 🎉"
  appUrl={appUrl}
  showReviewCTA   // was showFooterReview (renamed in Task 3)
  showReferral
>
```

Also remove `ReferralCTA` from the import:
```tsx
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  VerificationCode,
} from "../base-email"
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/email/base-email.tsx components/email/templates/med-cert-patient.tsx
git commit -m "feat(email): move ReferralCTA to BaseEmail showReferral prop, simplify copy"
```

---

## Task 5: Collapse Footer to 3 Lines

**Files:**
- Modify: `components/email/base-email.tsx` — footer `<tr>` (the last `<tr>` in the footer `<tbody>`)

**Step 1: Replace the footer text block**

Find the `<td style={{ padding: "20px 40px", textAlign: "center" }}>` that contains the 5 stacked `<p>` tags. Replace the entire content with:

```tsx
<td style={{ padding: "20px 40px", textAlign: "center" as const }}>
  {/* Legal links */}
  <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: colors.textSecondary, lineHeight: "1.8", fontFamily }}>
    <a href={`${appUrl}/privacy`} style={{ color: colors.textSecondary, textDecoration: "none" }}>Privacy</a>
    <span style={{ margin: "0 8px", color: colors.border }}>·</span>
    <a href={`${appUrl}/terms`} style={{ color: colors.textSecondary, textDecoration: "none" }}>Terms</a>
    <span style={{ margin: "0 8px", color: colors.border }}>·</span>
    <a href={UNSUBSCRIBE_PLACEHOLDER} style={{ color: colors.textSecondary, textDecoration: "none" }}>Manage preferences</a>
  </p>
  {/* Trust + Google */}
  <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: colors.textMuted, fontFamily }}>
    Made with care in Australia 🌤️ · Trusted by {patientFloor.toLocaleString()}+ Australians · {GOOGLE_REVIEWS.rating} ★ on Google
  </p>
  {/* Legal entity */}
  <p style={{ margin: 0, fontSize: "11px", color: colors.textMuted, fontFamily }}>
    {COMPANY_NAME} · ABN {ABN} · {COMPANY_ADDRESS_SHORT}
  </p>
</td>
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add components/email/base-email.tsx
git commit -m "feat(email): collapse footer to 3 lines"
```

---

## Task 6: Restructure `request-received.tsx`

This is the email sent after payment. Currently: receipt box in the middle, em dashes in body copy, `showFooterReview={false}`.

**Files:**
- Modify: `components/email/templates/request-received.tsx`

**Step 1: Full file replacement**

Replace the entire file contents:

```tsx
/**
 * Request Received Email Template
 *
 * Sent after Stripe payment succeeds.
 * Hierarchy: warm confirm + CTA first, tax receipt at the bottom.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Divider,
  colors,
} from "../base-email"
import { COMPANY_NAME, ABN } from "@/lib/constants"

export interface RequestReceivedEmailProps {
  patientName: string
  requestType: string
  amount: string
  requestId: string
  isGuest?: boolean
  paidAt?: string
  appUrl?: string
}

export function requestReceivedSubject(requestType: string) {
  return `All sorted! Your ${requestType} is with a doctor 👍`
}

export function RequestReceivedEmail({
  patientName,
  requestType,
  amount,
  requestId,
  isGuest,
  paidAt,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: RequestReceivedEmailProps) {
  const firstName = patientName.split(" ")[0]
  const dateStr = paidAt || new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const gst = (parseFloat(amount.replace(/[^0-9.]/g, "")) / 11).toFixed(2)

  return (
    <BaseEmail
      previewText={`Payment confirmed for your ${requestType}. A doctor is on it now.`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="You're all set!"
        subtitle={`${requestType} · ${amount}`}
        variant="success"
      />

      <Text>Hey {firstName},</Text>

      <Text>
        Your <strong>{requestType}</strong> is with a doctor now.
        We'll send it over the moment it's done, usually within the hour.
      </Text>

      <Button href={`${appUrl}/track/${requestId}`}>
        Track your request
      </Button>

      {isGuest && (
        <Text small muted style={{ textAlign: "center" as const }}>
          Want to track this on your dashboard?{" "}
          <a href={`${appUrl}/auth/complete-account?intake_id=${requestId}`} style={{ color: colors.accent, fontWeight: 500 }}>
            Create a free account
          </a>
        </Text>
      )}

      <Divider />

      {/* Tax receipt — at the bottom, for reference */}
      <div
        style={{
          backgroundColor: "#F5F7F9",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            margin: "0 0 14px 0",
            fontSize: "10px",
            fontWeight: "700",
            color: "#64748B",
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          Tax Receipt · {COMPANY_NAME} · ABN {ABN}
        </p>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              { label: "Service", value: requestType },
              { label: "Amount paid", value: amount, bold: true },
              { label: "GST included", value: `$${gst}` },
              { label: "Date", value: dateStr },
              { label: "Reference", value: requestId.slice(0, 8).toUpperCase() },
            ].map(({ label, value, bold }) => (
              <tr key={label}>
                <td
                  style={{
                    padding: "9px 0",
                    fontSize: "13px",
                    color: "#64748B",
                    borderBottom: "1px solid #F1F5F9",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "9px 0",
                    fontSize: "13px",
                    fontWeight: bold ? 600 : 400,
                    color: "#1E293B",
                    textAlign: "right" as const,
                    borderBottom: "1px solid #F1F5F9",
                    fontFamily: label === "Reference"
                      ? "'SF Mono', 'Fira Code', Consolas, monospace"
                      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </BaseEmail>
  )
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add components/email/templates/request-received.tsx
git commit -m "feat(email): restructure request-received — CTA first, receipt at bottom, warm voice"
```

---

## Task 7: Restructure `payment-receipt.tsx`

Same restructure pattern as Task 6. This is the receipt sent from a different trigger (direct Stripe webhook vs the request-received path).

**Files:**
- Modify: `components/email/templates/payment-receipt.tsx`

**Step 1: Full file replacement**

```tsx
/**
 * Payment Receipt Email Template
 *
 * Sent to patient after successful payment.
 * Hierarchy: warm confirm + CTA first, tax receipt at the bottom.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Divider,
  colors,
} from "../base-email"
import { COMPANY_NAME, ABN } from "@/lib/constants"

export interface PaymentReceiptEmailProps {
  patientName: string
  serviceName: string
  amount: string
  intakeRef: string
  paidAt: string
  dashboardUrl: string
  appUrl?: string
}

export function paymentReceiptEmailSubject(serviceName: string, firstName?: string) {
  return firstName
    ? `${firstName}, payment received for your ${serviceName} ✅`
    : `Payment received for your ${serviceName} ✅`
}

export function PaymentReceiptEmail({
  patientName,
  serviceName,
  amount,
  intakeRef,
  paidAt,
  dashboardUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentReceiptEmailProps) {
  const firstName = patientName.split(" ")[0]
  const gst = (parseFloat(amount.replace(/[^0-9.]/g, "")) / 11).toFixed(2)

  return (
    <BaseEmail
      previewText={`Payment confirmed for your ${serviceName}. A doctor is on it now.`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="You're all set!"
        subtitle={`${serviceName} · ${amount}`}
        variant="success"
      />

      <Text>Hey {firstName},</Text>

      <Text>
        Your <strong>{serviceName}</strong> is with a doctor now.
        We'll send it over the moment it's done, usually within the hour.
      </Text>

      <Button href={dashboardUrl}>Track your request</Button>

      <Divider />

      {/* Tax receipt */}
      <div
        style={{
          backgroundColor: "#F5F7F9",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            margin: "0 0 14px 0",
            fontSize: "10px",
            fontWeight: "700",
            color: "#64748B",
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          Tax Receipt · {COMPANY_NAME} · ABN {ABN}
        </p>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              { label: "Service", value: serviceName },
              { label: "Amount paid", value: amount, bold: true },
              { label: "GST included", value: `$${gst}` },
              { label: "Date", value: paidAt },
              { label: "Reference", value: intakeRef },
            ].map(({ label, value, bold }) => (
              <tr key={label}>
                <td
                  style={{
                    padding: "9px 0",
                    fontSize: "13px",
                    color: "#64748B",
                    borderBottom: "1px solid #F1F5F9",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "9px 0",
                    fontSize: "13px",
                    fontWeight: bold ? 600 : 400,
                    color: "#1E293B",
                    textAlign: "right" as const,
                    borderBottom: "1px solid #F1F5F9",
                    fontFamily: label === "Reference"
                      ? "'SF Mono', 'Fira Code', Consolas, monospace"
                      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </BaseEmail>
  )
}
```

Note: `paymentReceiptEmailSubject` signature changed to accept optional `firstName` — update callers if needed (check `lib/email/senders.ts`).

**Step 2: Check callers**

```bash
grep -r "paymentReceiptEmailSubject" /Users/rey/Desktop/instantmed/lib /Users/rey/Desktop/instantmed/app
```

Update any caller to pass `firstName` if available.

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/email/templates/payment-receipt.tsx
git commit -m "feat(email): restructure payment-receipt — warm voice, receipt at bottom"
```

---

## Task 8: Enable Review CTA on Approved Templates

All approved-state templates need `showReviewCTA` added. Also fix `showFooterReview` references to `showReviewCTA`.

**Files (all need the prop rename + showReviewCTA where appropriate):**
- `components/email/templates/med-cert-patient.tsx` — already done in Task 4 (showReviewCTA + showReferral)
- `components/email/templates/script-sent.tsx` — add `showReviewCTA`
- `components/email/templates/prescription-approved.tsx` — add `showReviewCTA`
- `components/email/templates/ed-approved.tsx` — add `showReviewCTA`
- `components/email/templates/hair-loss-approved.tsx` — add `showReviewCTA`
- `components/email/templates/womens-health-approved.tsx` — add `showReviewCTA`
- `components/email/templates/weight-loss-approved.tsx` — add `showReviewCTA`
- `components/email/templates/consult-approved.tsx` — add `showReviewCTA`
- All other templates — change `showFooterReview={false}` to remove it (default is now false)

**Step 1: Find all `showFooterReview` references**

```bash
grep -r "showFooterReview" /Users/rey/Desktop/instantmed/components/email
```

**Step 2: For each file using `showFooterReview={false}` — remove the prop entirely** (default is now false)

**Step 3: For each approved template in the list above — add `showReviewCTA` to `<BaseEmail>`:**

Pattern for each:
```tsx
<BaseEmail
  previewText="..."
  appUrl={appUrl}
  showReviewCTA   // ADD
>
```

For `med-cert-patient.tsx` also keep `showReferral` (done in Task 4).

**Step 4: Typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add components/email/templates/
git commit -m "feat(email): enable review CTA on all approved templates"
```

---

## Task 9: Subject Line Audit + Em Dash Removal (All Templates)

Apply these changes across all templates. Em dashes (`—`) must be replaced everywhere.

**Files:** All files in `components/email/templates/`

**Step 1: Global em dash search**

```bash
grep -r " — " /Users/rey/Desktop/instantmed/components/email/
```

**Step 2: Fix subject lines + body copy per template**

Apply these exact changes:

**`request-received.tsx`** (done in Task 6): `"All sorted — your..."` → `"All sorted! Your..."`

**`payment-receipt.tsx`** (done in Task 7): already fixed

**`payment-confirmed.tsx`**:
- Subject: `"Payment received, ${amount} for your ${requestType} ✅"` → `"Payment received for your ${requestType} ✅"`
- Body: any `—` in copy → replace with `. ` or `, `

**`decline-reengagement.tsx`**:
- Subject: `"We're still here to help — other options for you"` → `"We're still here to help. Other options for you"`

**`exit-intent-reminder.tsx`**:
- Subject: `"Your ${service} — ready when you are"` → `"Your ${service} is ready when you are"`

**`abandoned-checkout-followup.tsx`**:
- Subject: `"Last call — your ${service} request expires soon"` → `"Last call! Your ${service} expires soon"`

**`payment-failed.tsx`**:
- Subject: `"Heads up: there was a hiccup..."` → `"Heads up, there was a hiccup..."`

**`payment-retry.tsx`**:
- Subject: `"Just a heads up: your payment needs another go"` → `"Just a heads up, your payment needs another go"`

**`repeat-rx-reminder.tsx`**:
- Subject: `"Reminder: Time to renew your ${medication} prescription"` → `"Time to renew your ${medication} prescription"`

**`follow-up-reminder.tsx`**:
- Subject: `"Checking in: how are you feeling?"` → `"Checking in, how are you feeling?"`

**`subscription-nudge.tsx`**:
- Subject: `"Time for your next script? Save with a subscription"` → `"Time for your next script? Save on every refill"`

**`referral-credit.tsx`**:
- Subject: `"You've earned a ${creditAmount} credit!"` → `"${firstName}, you've got a ${creditAmount} credit!"` (add firstName param if available, else keep as is)

**Body copy em dash sweep:** For each template, grep for ` — ` and replace with `. ` or `, ` based on sentence structure. Also replace any ` — ` in preview text strings.

**Step 3: Verify no em dashes remain**

```bash
grep -r " — " /Users/rey/Desktop/instantmed/components/email/
```
Expected: zero results

**Step 4: Typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add components/email/templates/
git commit -m "fix(email): standardize subject lines, remove all em dashes, warm voice audit"
```

---

## Task 10: Create Magic Link Email Template

**Files:**
- Create: `components/email/templates/magic-link.tsx`
- Modify: `components/email/templates/index.ts`

**Step 1: Create `magic-link.tsx`**

```tsx
/**
 * Magic Link Email Template
 *
 * Sent via Supabase auth hook when a user requests a magic link login.
 * Replaces the bare-bones Supabase default.
 */

import * as React from "react"
import { BaseEmail, HeroBlock, Text, Button, colors } from "../base-email"

export interface MagicLinkEmailProps {
  loginUrl: string
  email?: string
  appUrl?: string
}

export const magicLinkEmailSubject = "Your InstantMed login link"

export function MagicLinkEmail({
  loginUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: MagicLinkEmailProps) {
  return (
    <BaseEmail
      previewText="Tap the button to log in to InstantMed. Expires in 60 minutes."
      appUrl={appUrl}
    >
      <HeroBlock
        icon="🔑"
        headline="Your login link"
        subtitle="Tap below to continue"
        variant="info"
      />

      <Text>
        One tap and you're in. This link expires in 60 minutes and works once only.
      </Text>

      <Button href={loginUrl}>Log in to InstantMed</Button>

      <Text small muted style={{ textAlign: "center" as const }}>
        Didn't request this? You can safely ignore this email. Your account is secure.
      </Text>

      <Text small muted style={{ textAlign: "center" as const, marginTop: "4px" }}>
        Having trouble?{" "}
        <a href={`${appUrl}/auth/login`} style={{ color: colors.accent, textDecoration: "none" }}>
          Go to the login page
        </a>
      </Text>
    </BaseEmail>
  )
}
```

**Step 2: Export from `index.ts`**

Add after the last export:
```tsx
// --- Magic Link (Supabase auth hook) ---
export { MagicLinkEmail, magicLinkEmailSubject } from "./magic-link"
export type { MagicLinkEmailProps } from "./magic-link"
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/email/templates/magic-link.tsx components/email/templates/index.ts
git commit -m "feat(email): add MagicLinkEmail template"
```

---

## Task 11: Create Supabase Auth Webhook Route

**Files:**
- Create: `app/api/webhooks/supabase-auth/route.ts`
- Modify: `docs/OPERATIONS.md` — add env var entry

**Step 1: Create the webhook route**

```tsx
/**
 * Supabase Auth Email Hook
 *
 * Intercepts Supabase auth emails (magic link, password reset, signup confirm)
 * and sends branded versions via Resend + React Email.
 *
 * Configure in Supabase: Authentication > Hooks > Send Email
 * URL: https://instantmed.com.au/api/webhooks/supabase-auth
 *
 * Validation: Supabase signs the payload as a JWT using the hook secret.
 * Set SUPABASE_AUTH_WEBHOOK_HOOK_SECRET in env vars.
 */

import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
import { MagicLinkEmail, magicLinkEmailSubject } from "@/components/email/templates/magic-link"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("supabase-auth-webhook")

interface SupabaseAuthHookPayload {
  user: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
      first_name?: string
    }
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: "magiclink" | "signup" | "recovery" | "invite" | "email_change" | "reauthentication"
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_AUTH_WEBHOOK_HOOK_SECRET
  if (!secret) {
    log.error("SUPABASE_AUTH_WEBHOOK_HOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  // Validate JWT
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
  }
  const token = authHeader.slice(7)

  let payload: SupabaseAuthHookPayload
  try {
    const secretBytes = new TextEncoder().encode(secret)
    const { payload: verified } = await jwtVerify(token, secretBytes)
    payload = verified as unknown as SupabaseAuthHookPayload
  } catch {
    log.warn("Supabase auth webhook JWT verification failed")
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const { user, email_data } = payload
  const { email_action_type, token_hash, redirect_to, site_url } = email_data
  const to = user.email
  const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || site_url
  const loginUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || appUrl}`

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "InstantMed <hello@instantmed.com.au>"

  if (!apiKey) {
    log.error("RESEND_API_KEY not configured")
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
  }

  // Only handle action types we have templates for
  const handledTypes = ["magiclink", "signup", "recovery", "invite", "email_change", "reauthentication"]
  if (!handledTypes.includes(email_action_type)) {
    log.info("Unhandled auth email type, letting Supabase handle it", { email_action_type })
    return NextResponse.json({ success: true })
  }

  let subject: string
  let html: string

  // All types use MagicLinkEmail — same "tap to continue" pattern
  // Different copy per type via subject line
  const subjectMap: Record<string, string> = {
    magiclink: "Your InstantMed login link",
    signup: firstName ? `Welcome, ${firstName}! Confirm your email` : "Confirm your InstantMed email",
    recovery: "Reset your InstantMed password",
    invite: "You've been invited to InstantMed",
    email_change: "Confirm your new email address",
    reauthentication: "Confirm your InstantMed identity",
  }
  subject = subjectMap[email_action_type] ?? "Your InstantMed link"

  html = await renderEmailToHtml(
    MagicLinkEmail({
      loginUrl,
      email: to,
      appUrl,
    })
  )

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    log.error("Supabase auth email send failed", { to, email_action_type, status: response.status, body })
    return NextResponse.json({ error: "Email send failed" }, { status: 500 })
  }

  log.info("Supabase auth email sent", { to, email_action_type })
  return NextResponse.json({ success: true })
}
```

**Step 2: Add to middleware dev-route block**

Open `middleware.ts`. The Supabase auth webhook is a production route, no changes needed. But verify `/api/webhooks/supabase-auth` is NOT blocked in the middleware's dev-route patterns.

```bash
grep -n "webhooks" /Users/rey/Desktop/instantmed/middleware.ts
```

Confirm it's not blocked.

**Step 3: Add env var to OPERATIONS.md**

Open `docs/OPERATIONS.md`. Find the env vars table and add:

```
| `SUPABASE_AUTH_WEBHOOK_HOOK_SECRET` | Supabase Auth | JWT secret Supabase uses to sign auth hook payloads. Get from Supabase > Auth > Hooks > your hook's secret. Required for magic link email interception. |
```

**Step 4: Register the webhook in Supabase dashboard**

This is a manual step. Instructions for the operator:
1. Go to Supabase Dashboard > Authentication > Hooks
2. Add a "Send Email" hook
3. Set endpoint URL: `https://instantmed.com.au/api/webhooks/supabase-auth`
4. Copy the generated secret into `SUPABASE_AUTH_WEBHOOK_HOOK_SECRET` env var in Vercel

**Step 5: Check `renderEmailToHtml` exists**

```bash
grep -n "renderEmailToHtml\|renderToHtml\|renderEmail" /Users/rey/Desktop/instantmed/lib/email/react-renderer-server.ts
```

If the function name differs, update the import accordingly.

**Step 6: Typecheck**

```bash
pnpm typecheck
```

**Step 7: Commit**

```bash
git add app/api/webhooks/supabase-auth/route.ts docs/OPERATIONS.md
git commit -m "feat(email): add Supabase auth webhook — branded magic link via Resend"
```

---

## Task 12: Final Verification

**Step 1: Full typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean

**Step 2: Check email preview**

Start the dev server and open the admin email preview:

```bash
pnpm dev
```

Navigate to `/admin/emails/preview` and spot-check:
- `request-received` — receipt at bottom, no serif, warm voice
- `payment-receipt` — same
- `med-cert-patient` — review CTA prominent, referral near footer, no serif
- `magic-link` — new template renders
- Any template — footer is 3 compact lines

**Step 3: Verify zero em dashes**

```bash
grep -r " — " /Users/rey/Desktop/instantmed/components/email/
```
Expected: zero results

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(email): final verification pass — all templates clean"
```

---

## Out of Scope

- Supabase dashboard configuration (manual operator step — see Task 11 Step 4)
- Google logo PNG asset (current star emoji approach covers this)
- PostHog click tracking on review CTA
- Email A/B testing
