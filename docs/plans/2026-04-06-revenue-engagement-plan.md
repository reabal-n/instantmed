# Revenue & Engagement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 5 revenue/engagement features: GSC fix, abandoned checkout sequence, referral CTA in emails, review request system, Rx subscription nudge.

**Architecture:** All new email jobs follow the existing cron pattern (find candidates via Supabase query, check opt-out, send via Resend, log to email_outbox, mark sent column). New React email templates use `BaseEmail` component. New cron routes use `verifyCronRequest` + Sentry error handling.

**Tech Stack:** Next.js 16 App Router, Supabase, Resend, Vercel Cron, React Email components

---

### Task 1: Fix GSC Duplicate FAQPage Schema

**Files:**
- Modify: `components/blog/article-template.tsx:185-217`

**Step 1: Strip microdata from FAQSection**

Remove `itemScope`, `itemProp`, `itemType` attributes from the FAQSection component. Keep the `<details>` elements and all visual content — only remove schema markup attributes.

In `components/blog/article-template.tsx`, the FAQSection (line 191) has:
```tsx
<div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
```

And each FAQ item (lines 195-215) has `itemScope`, `itemProp="mainEntity"`, `itemType="https://schema.org/Question"`, plus nested `itemScope`, `itemProp="acceptedAnswer"`, `itemType="https://schema.org/Answer"`, and `itemProp="name"` / `itemProp="text"`.

Strip ALL of these. The JSON-LD `<FAQSchema>` in `app/blog/[slug]/page.tsx:205` is the canonical schema (Google's preferred format).

**Step 2: Verify**

Run: `pnpm typecheck`
Expected: PASS — no type errors (these are HTML attributes, removal is always safe)

**Step 3: Commit**

```bash
git add components/blog/article-template.tsx
git commit -m "fix: remove duplicate FAQPage microdata from blog ArticleTemplate

JSON-LD FAQSchema in blog page template is the canonical schema.
Microdata in FAQSection duplicated it, causing GSC 'Duplicate field FAQPage' error."
```

---

### Task 2: DB Migration — New Tracking Columns

**Files:**
- Create: `supabase/migrations/20260406000001_email_engagement_columns.sql`

**Step 1: Write migration**

```sql
-- Add email engagement tracking columns to intakes table
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS abandoned_followup_sent_at timestamptz;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS review_email_sent_at timestamptz;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS review_followup_sent_at timestamptz;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS subscription_nudge_sent_at timestamptz;
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260406000001_email_engagement_columns.sql
git commit -m "feat: add email engagement tracking columns to intakes"
```

---

### Task 3: Abandoned Checkout 2-Email Sequence

**Files:**
- Create: `components/email/templates/abandoned-checkout-followup.tsx`
- Modify: `lib/email/abandoned-checkout.ts`
- Modify: `components/email/templates/abandoned-checkout.tsx` (warmer subject)

#### Step 1: Update existing email subject

In `components/email/templates/abandoned-checkout.tsx`, update the subject function:

```tsx
export function abandonedCheckoutSubject(serviceName: string) {
  return `Hey, you left something behind — your ${serviceName} request is waiting`
}
```

#### Step 2: Create followup template

Create `components/email/templates/abandoned-checkout-followup.tsx`:

```tsx
import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  List,
  colors,
} from "../base-email"
import { COMPANY_NAME, ABN } from "@/lib/constants"

export interface AbandonedCheckoutFollowupProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
}

export function abandonedCheckoutFollowupSubject(serviceName: string) {
  return `Last call — your ${serviceName} request expires soon`
}

export function AbandonedCheckoutFollowupEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: AbandonedCheckoutFollowupProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText={`Your ${serviceName} request won't be saved much longer`} appUrl={appUrl}>
      <Heading>Your request expires soon</Heading>

      <Text>Hi {firstName},</Text>
      <Text>
        Just a heads up — your <strong>{serviceName}</strong> request is still waiting,
        but we can&apos;t hold it forever. Most people finish in under 2 minutes.
      </Text>

      <Box>
        <Text style={{ margin: 0, fontSize: "14px", color: colors.textBody }}>
          <strong>1,200+ Australians</strong> used InstantMed this month for fast,
          hassle-free medical documents — no phone call, no waiting room.
        </Text>
      </Box>

      <Button href={resumeUrl}>Complete your request</Button>

      <Text muted small>
        If you&apos;ve already sorted this out or changed your mind, no worries —
        just ignore this email.
      </Text>
    </BaseEmail>
  )
}

// HTML string render for cron job
export function renderAbandonedCheckoutFollowupEmail(props: AbandonedCheckoutFollowupProps): string {
  // ... (follow same HTML pattern as abandoned-checkout.tsx renderAbandonedCheckoutEmail)
  // Key differences: "Last call" heading, social proof, "Complete your request" CTA
}
```

The `renderAbandonedCheckoutFollowupEmail` function must follow the exact same HTML structure as `renderAbandonedCheckoutEmail` in `abandoned-checkout.tsx` — full HTML email with table layout, logo, footer. Change: heading, body copy (social proof + urgency), CTA text.

#### Step 3: Modify abandoned-checkout.ts

Add `findAbandonedFollowups()` and `sendAbandonedCheckoutFollowupEmail()` functions.

In `lib/email/abandoned-checkout.ts`:

1. Add import for followup template:
```tsx
import { renderAbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "@/components/email/templates/abandoned-checkout-followup"
```

2. Add new finder for 24h followups:
```tsx
export async function findAbandonedFollowups(): Promise<AbandonedIntake[]> {
  const supabase = createServiceRoleClient()

  // Find intakes 24-48h old that got the 1h nudge but not the followup
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id, patient_id, category, subtype, created_at, guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .eq("status", "pending_payment")
    .or("payment_status.eq.pending,payment_status.is.null")
    .gte("created_at", fortyEightHoursAgo)
    .lte("created_at", twentyFourHoursAgo)
    .not("abandoned_email_sent_at", "is", null)  // must have received nudge
    .is("abandoned_followup_sent_at", null)

  if (error) {
    logger.error("Failed to fetch abandoned followups", { error: error.message })
    return []
  }

  return (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    const guestEmail = (item as { guest_email?: string }).guest_email
    return {
      ...item,
      patient: patient?.email ? patient : (guestEmail ? { email: guestEmail, first_name: null } : patient)
    }
  }) as AbandonedIntake[]
}
```

3. Add followup sender:
```tsx
export async function sendAbandonedFollowupEmail(intake: AbandonedIntake): Promise<boolean> {
  // Same pattern as sendAbandonedCheckoutEmail but:
  // - Uses renderAbandonedCheckoutFollowupEmail
  // - Uses abandonedCheckoutFollowupSubject(serviceName)
  // - email_type: "abandoned_checkout_followup"
  // - Updates abandoned_followup_sent_at (not abandoned_email_sent_at)
  // - Same canSendMarketingEmail check + List-Unsubscribe headers
}
```

4. Update `processAbandonedCheckouts()` to also process followups:
```tsx
export async function processAbandonedCheckouts(): Promise<{ sent: number; failed: number; followupSent: number; followupFailed: number; skipped?: boolean }> {
  const releaseLock = await acquireCronLock()
  if (releaseLock === null) return { sent: 0, failed: 0, followupSent: 0, followupFailed: 0, skipped: true }

  try {
    // Process 1h nudges
    const abandonedIntakes = await findAbandonedCheckouts()
    let sent = 0, failed = 0
    for (const intake of abandonedIntakes) {
      const success = await sendAbandonedCheckoutEmail(intake)
      if (success) sent++; else failed++
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Process 24h followups
    const followupIntakes = await findAbandonedFollowups()
    let followupSent = 0, followupFailed = 0
    for (const intake of followupIntakes) {
      const success = await sendAbandonedFollowupEmail(intake)
      if (success) followupSent++; else followupFailed++
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    logger.info("Processed abandoned checkouts", { sent, failed, followupSent, followupFailed })
    return { sent, failed, followupSent, followupFailed }
  } finally {
    await releaseLock()
  }
}
```

#### Step 4: Verify

Run: `pnpm typecheck`

#### Step 5: Commit

```bash
git add components/email/templates/abandoned-checkout-followup.tsx lib/email/abandoned-checkout.ts components/email/templates/abandoned-checkout.tsx
git commit -m "feat: add abandoned checkout 24h followup email with social proof"
```

---

### Task 4: ReferralCTA Component in Approval Emails

**Files:**
- Modify: `components/email/base-email.tsx` (add `ReferralCTA` component)
- Modify 8 templates: `med-cert-patient.tsx`, `prescription-approved.tsx`, `consult-approved.tsx`, `script-sent.tsx`, `ed-approved.tsx`, `hair-loss-approved.tsx`, `weight-loss-approved.tsx`, `womens-health-approved.tsx`

#### Step 1: Add ReferralCTA to base-email.tsx

Add below the existing `GoogleReviewCTA` component (after line 695):

```tsx
interface ReferralCTAProps {
  appUrl: string
}

export function ReferralCTA({ appUrl }: ReferralCTAProps) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "16px 0 4px",
        borderTop: `1px solid ${colors.borderLight}`,
        margin: "4px 0 0 0",
      }}
    >
      <p style={{ margin: 0, fontSize: "14px", color: colors.textBody, lineHeight: "1.6" }}>
        Know someone who could use InstantMed?{" "}
        <a href={`${appUrl}/referrals`} style={{ color: colors.accent, fontWeight: 600, textDecoration: "none" }}>
          Refer a friend — you both get $5 off
        </a>
      </p>
    </div>
  )
}
```

#### Step 2: Add ReferralCTA to all 8 approval templates

For each template, add below the existing `GoogleReviewCTA`:

```tsx
import { GoogleReviewCTA, ReferralCTA, colors } from "../base-email"
// ...
<GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
<ReferralCTA appUrl={appUrl} />
```

**Special case — `med-cert-patient.tsx`:** Already has an inline referralCode block (lines 71-93). Remove that inline block and replace with the shared `ReferralCTA` component. Remove the `referralCode` prop from the interface since it's no longer used.

#### Step 3: Verify

Run: `pnpm typecheck`

#### Step 4: Commit

```bash
git add components/email/base-email.tsx components/email/templates/
git commit -m "feat: add ReferralCTA to all approval/delivery email templates"
```

---

### Task 5: Review Request System (Day 2 + Day 7)

**Files:**
- Create: `components/email/templates/review-request.tsx`
- Create: `components/email/templates/review-followup.tsx`
- Create: `lib/email/review-request.ts`
- Create: `app/api/cron/review-request/route.ts`

#### Step 1: Create review-request template

`components/email/templates/review-request.tsx`:

Uses `BaseEmail` with warm tone. Subject: "Quick favour? ⭐". Body: personal, conversational ("Hey {firstName}, glad we could help..."). Big "Leave a Review ⭐" button linking to `GOOGLE_REVIEW_URL`. Props: `patientName`, `serviceName`, `appUrl`.

Needs both React component and `renderReviewRequestEmail()` HTML string function (same pattern as other templates).

#### Step 2: Create review-followup template

`components/email/templates/review-followup.tsx`:

Lighter touch. Subject: "Still happy with us? 😊". Gentler nudge. Same review button. Props: `patientName`, `appUrl`.

#### Step 3: Create review-request.ts

`lib/email/review-request.ts`:

Follow exact pattern of `lib/email/follow-up-reminder.ts`:

```tsx
import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendViaResend } from "./resend"
import { renderReviewRequestEmail } from "@/components/email/templates/review-request"
import { renderReviewFollowupEmail } from "@/components/email/templates/review-followup"
import { getAppUrl } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { canSendMarketingEmail } from "@/app/actions/email-preferences"

const logger = createLogger("review-request")

// SERVICE_NAMES map (same as abandoned-checkout.ts)

// findReviewRequestCandidates(): approved intakes 48-72h ago, review_email_sent_at IS NULL
// findReviewFollowupCandidates(): approved intakes 7-8 days ago, review_email_sent_at NOT NULL, review_followup_sent_at IS NULL

// sendReviewRequestEmail(intake): check canSendMarketingEmail, send via Resend, log to email_outbox, mark review_email_sent_at
// sendReviewFollowupEmail(intake): same pattern, mark review_followup_sent_at

// processReviewRequests(): find + send both day-2 and day-7 emails
```

Key query patterns:
- Day 2: `.in("status", ["approved", "completed"])`, `.is("review_email_sent_at", null)`, approved 48-72h ago
- Day 7: `.not("review_email_sent_at", "is", null)`, `.is("review_followup_sent_at", null)`, approved 7-8 days ago

#### Step 4: Create cron route

`app/api/cron/review-request/route.ts`:

Follow exact pattern of `app/api/cron/abandoned-checkouts/route.ts`. Uses `verifyCronRequest`, calls `processReviewRequests()`, captures errors to Sentry.

#### Step 5: Verify

Run: `pnpm typecheck`

#### Step 6: Commit

```bash
git add components/email/templates/review-request.tsx components/email/templates/review-followup.tsx lib/email/review-request.ts app/api/cron/review-request/route.ts
git commit -m "feat: add review request system — day-2 ask + day-7 followup"
```

---

### Task 6: Repeat Rx Subscription Nudge (Day 30)

**Files:**
- Create: `components/email/templates/subscription-nudge.tsx`
- Create: `lib/email/subscription-nudge.ts`
- Create: `app/api/cron/subscription-nudge/route.ts`

#### Step 1: Create subscription-nudge template

`components/email/templates/subscription-nudge.tsx`:

Subject: "Time for your next script? Save with a subscription". Shows savings comparison: $29.95 one-off vs $19.95/mo. CTA → `/request?service=prescription`. Warm tone.

#### Step 2: Create subscription-nudge.ts

`lib/email/subscription-nudge.ts`:

Same pattern. Query: repeat script intakes (`category = 'prescription'`, `subtype = 'repeat'`), approved ~30 days ago (29-31 day window), no active subscription (check `subscriptions` table), `subscription_nudge_sent_at IS NULL`.

#### Step 3: Create cron route

`app/api/cron/subscription-nudge/route.ts`:

Same pattern as review-request.

#### Step 4: Verify & Commit

```bash
git add components/email/templates/subscription-nudge.tsx lib/email/subscription-nudge.ts app/api/cron/subscription-nudge/route.ts
git commit -m "feat: add day-30 subscription nudge for repeat Rx patients"
```

---

### Task 7: Register Cron Jobs

**Files:**
- Modify: `vercel.json`

Add two new cron entries:

```json
{
  "path": "/api/cron/review-request",
  "schedule": "0 10 * * *"
},
{
  "path": "/api/cron/subscription-nudge",
  "schedule": "0 11 * * *"
}
```

Daily at 10am and 11am AEST (reasonable times for Australian patients).

#### Commit

```bash
git add vercel.json
git commit -m "feat: register review-request and subscription-nudge cron jobs"
```

---

### Task 8: Final Verification

Run: `pnpm typecheck && pnpm build`

Verify all new files compile and no type errors introduced.
