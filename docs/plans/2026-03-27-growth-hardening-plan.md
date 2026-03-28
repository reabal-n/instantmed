# Growth Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the funnel and add revenue mechanics before Google Ads start — covering real-time patient notifications, post-approval cross-sell, lifecycle email, and referral attribution.

**Architecture:** Seven targeted improvements across patient portal, email templates, and cron infrastructure. All changes are additive — no refactors. Each task is independently deployable.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.9, Supabase Realtime, Resend, Vercel Cron, PostHog, Tailwind v4

---

## Context

Platform is soft-launched with real patients. Google Ads pending LegitScript certification. Key gaps found in audit:
- Real-time status notifications only work on the intake detail page — not the dashboard
- Post-payment confirmation page has stale "30 minutes" copy
- `complete-account` form uses `glass-card` (deprecated surface pattern)
- No cross-sell after approval — revenue dead-end at highest intent moment
- No lifecycle follow-up emails post-approval
- Referral `?ref=` attribution is not captured or tracked anywhere

**Brand voice rules (enforce in all copy):** Plainspoken, confident, dry. No urgency language. No "sorted", "fast", "instant". No medical emojis (💊💉). Voice test: would a calm GP say this?

---

## Task 1: Global real-time status notifications in patient portal

**Problem:** `IntakeStatusListener` uses Supabase Realtime but only mounts on `/patient/intakes/[id]`. If a patient is on their dashboard and a doctor sets `pending_info`, they won't know until they navigate away and come back.

**Solution:** Add a `GlobalIntakeNotifications` component to `PatientShellContent` that subscribes to ALL the patient's intakes and fires toasts from anywhere in the portal.

**Files:**
- Create: `components/patient/global-intake-notifications.tsx`
- Modify: `app/patient/patient-shell.tsx`

---

**Step 1: Create the component**

```tsx
// components/patient/global-intake-notifications.tsx
"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface GlobalIntakeNotificationsProps {
  patientId: string
}

const STATUS_MESSAGES: Record<string, { title: string; description: string; type: "success" | "info" | "warning" }> = {
  pending_info: {
    title: "Your doctor has a question",
    description: "Additional information is needed before your request can be approved.",
    type: "info",
  },
  approved: {
    title: "Request approved",
    description: "Your document is ready. Head to your dashboard to download it.",
    type: "success",
  },
  declined: {
    title: "Request declined",
    description: "Check your email for the reason and next steps.",
    type: "warning",
  },
  in_review: {
    title: "Under review",
    description: "A doctor is now looking at your request.",
    type: "info",
  },
  awaiting_script: {
    title: "Prescription approved",
    description: "Your eScript is being prepared — watch for an SMS.",
    type: "success",
  },
  completed: {
    title: "Request complete",
    description: "Your request has been fully processed.",
    type: "success",
  },
}

export function GlobalIntakeNotifications({ patientId }: GlobalIntakeNotificationsProps) {
  const router = useRouter()
  const pathname = usePathname()
  // Track last-known statuses to only notify on actual changes
  const knownStatuses = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!patientId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`patient-intakes-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const intakeId = payload.new.id as string
          const newStatus = payload.new.status as string
          const prevStatus = knownStatuses.current[intakeId]

          // Skip if status hasn't changed or we're already on this intake's page
          if (newStatus === prevStatus) return
          if (pathname === `/patient/intakes/${intakeId}`) return

          knownStatuses.current[intakeId] = newStatus

          const message = STATUS_MESSAGES[newStatus]
          if (!message) return

          const toastFn = message.type === "success" ? toast.success
            : message.type === "warning" ? toast.warning
            : toast.info

          toastFn(message.title, {
            description: message.description,
            action: {
              label: "View",
              onClick: () => router.push(`/patient/intakes/${intakeId}`),
            },
            duration: 8000,
          })

          // Refresh dashboard data
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId, pathname, router])

  return null
}
```

**Step 2: Wire into patient shell**

Modify `app/patient/patient-shell.tsx`.

Change `PatientShellContent` to accept `patientId`:
```tsx
// Before
function PatientShellContent({ children }: { children: ReactNode }) {

// After
function PatientShellContent({ children, patientId }: { children: ReactNode; patientId: string }) {
```

Add the import at top of file:
```tsx
import { GlobalIntakeNotifications } from "@/components/patient/global-intake-notifications"
```

Add the component inside `PatientShellContent` return, right after the opening fragment:
```tsx
return (
  <>
    <GlobalIntakeNotifications patientId={patientId} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
      {children}
    </div>
    <MobileNav />
  </>
)
```

Change `PatientShellProps` to include `patientId`:
```tsx
interface PatientShellProps {
  children: ReactNode
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}
```

Pass `patientId` from `PatientShell` to `PatientShellContent` in `PatientShell`'s render:
```tsx
// In PatientShell's AuthenticatedShell children:
<PatientShellContent patientId={user.id}>
  {children}
</PatientShellContent>
```

**Step 3: Check the patient layout passes user.id correctly**

```bash
cat /Users/rey/Desktop/instantmed/app/patient/layout.tsx
```

The layout passes `user` to `PatientShell`. Verify `user.id` is the Supabase profile ID (not Clerk user ID) — it must match the `patient_id` column in `intakes`. Cross-check with `getAuthenticatedUserWithProfile` return shape.

**Step 4: Typecheck**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
```

Expected: no new errors.

**Step 5: Commit**

```bash
git add components/patient/global-intake-notifications.tsx app/patient/patient-shell.tsx
git commit -m "feat: global real-time intake status notifications in patient portal"
```

---

## Task 2: Fix stale "30 minutes" copy in post-payment confirmation

**Problem:** `confirmed-client.tsx` still says "Most requests are reviewed within 30 minutes during business hours" — this was cleaned up everywhere else but missed here.

**Files:**
- Modify: `app/patient/intakes/confirmed/confirmed-client.tsx`

---

**Step 1: Find the line**

```bash
grep -n "30 minutes\|reviewed within" /Users/rey/Desktop/instantmed/app/patient/intakes/confirmed/confirmed-client.tsx
```

**Step 2: Update the copy**

Find:
```tsx
Most requests are reviewed within 30 minutes during business hours
```

Replace with:
```tsx
Reviewed within hours, most days.
```

**Step 3: Typecheck and commit**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
git add app/patient/intakes/confirmed/confirmed-client.tsx
git commit -m "copy: fix stale '30 minutes' claim in post-payment confirmation"
```

---

## Task 3: Fix deprecated glass-card surface on complete-account form

**Problem:** `complete-account-form.tsx` uses `glass-card` class (deprecated — design system uses solid depth cards). Used on two card surfaces in the same file.

**Files:**
- Modify: `app/auth/complete-account/complete-account-form.tsx`

---

**Step 1: Replace both instances**

Find (appears twice — lines ~63 and ~76):
```tsx
className="p-8 glass-card"
```

Replace both with:
```tsx
className="p-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]"
```

**Step 2: Typecheck and commit**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
git add app/auth/complete-account/complete-account-form.tsx
git commit -m "ui: replace glass-card with solid depth surface on complete-account form"
```

---

## Task 4: Post-approval cross-sell card on intake detail page

**Problem:** After a cert or script is approved, the patient hits a dead-end. No next action. Highest-intent moment in the product goes unused.

**Spec:**
- Appears below the document card, above the submitted answers, only when `approved` or `completed`
- Service-aware — shows relevant next service
- Quiet, one card, no popup — not aggressive
- `med_certs` → prescription renewal ($29.95)
- `common_scripts` / `repeat_rx` → GP consult ($49.95)
- `consults` → medical certificate ($19.95)
- Default → nothing rendered

**Files:**
- Create: `components/patient/cross-sell-card.tsx`
- Modify: `app/patient/intakes/[id]/client.tsx`

---

**Step 1: Create the component**

```tsx
// components/patient/cross-sell-card.tsx
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface CrossSellCardProps {
  serviceType: string | undefined
}

interface CrossSellConfig {
  headline: string
  description: string
  price: string
  href: string
  cta: string
}

function getCrossSell(serviceType: string | undefined): CrossSellConfig | null {
  switch (serviceType) {
    case "med_certs":
      return {
        headline: "Need a prescription renewal?",
        description: "A doctor reviews repeat medication requests the same way — no appointment needed.",
        price: "from $29.95",
        href: "/request?service=prescription",
        cta: "Renew a prescription",
      }
    case "common_scripts":
    case "repeat_rx":
      return {
        headline: "Need a GP consultation?",
        description: "For ongoing conditions, referrals, or anything that needs a more detailed review.",
        price: "from $49.95",
        href: "/request?service=consult",
        cta: "Start a consultation",
      }
    case "consults":
      return {
        headline: "Need a medical certificate?",
        description: "For time off work, school, or caring for someone else. Reviewed the same way.",
        price: "from $19.95",
        href: "/request?service=med-cert",
        cta: "Get a certificate",
      }
    default:
      return null
  }
}

export function CrossSellCard({ serviceType }: CrossSellCardProps) {
  const config = getCrossSell(serviceType)
  if (!config) return null

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Also available
          </p>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {config.headline}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.description}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{config.price}</p>
        </div>
        <Link
          href={config.href}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {config.cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
```

**Step 2: Add to intake detail client**

In `app/patient/intakes/[id]/client.tsx`, add the import at top:
```tsx
import { CrossSellCard } from "@/components/patient/cross-sell-card"
```

Find the line after the `EmailVerificationGate` closing tag (after the document card, around line 502):
```tsx
          )}

          {/* Action Buttons */}
          {canCancel && (
```

Insert the cross-sell between them:
```tsx
          )}

          {/* Cross-sell — shown after approval, service-aware */}
          {(intake.status === "approved" || intake.status === "completed") && (
            <CrossSellCard serviceType={intake.service?.type} />
          )}

          {/* Action Buttons */}
          {canCancel && (
```

Note: `intake.service` is typed as `{ name?: string; short_name?: string } | undefined` on the component. You may need to cast it:
```tsx
serviceType={(intake.service as { type?: string } | undefined)?.type}
```

**Step 3: Typecheck**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/patient/cross-sell-card.tsx app/patient/intakes/[id]/client.tsx
git commit -m "feat: post-approval cross-sell card on intake detail page"
```

---

## Task 5: Post-approval cross-sell in approval email templates

**Problem:** The cert and script approval emails dead-end after the download/action CTA. Adding a subtle "also available" section costs nothing and recovers returning patients who open email rather than visiting the dashboard.

**Spec:**
- One short section below the existing content, above the footer "Questions?" text
- Quiet, text-only link — no large buttons, no banners
- Med cert email → prescription renewal link
- Prescription approved email → consult link
- Copy must pass brand voice test (no urgency, no hype)

**Files:**
- Modify: `components/email/templates/med-cert-patient.tsx`
- Modify: `components/email/templates/prescription-approved.tsx`

---

**Step 1: Update med-cert-patient.tsx**

In `components/email/templates/med-cert-patient.tsx`, find the `Text muted small` element near the bottom (the "Questions?" text):
```tsx
      <Text muted small>
        Questions? Reply to this email or visit our{" "}
```

Insert before it:
```tsx
      <Text muted small style={{ textAlign: "center" as const }}>
        Need to renew a prescription?{" "}
        <a href={`${appUrl}/request?service=prescription`} style={{ color: colors.accent, fontWeight: 500 }}>
          Repeat prescriptions from $29.95
        </a>
      </Text>

```

**Step 2: Update prescription-approved.tsx**

In `components/email/templates/prescription-approved.tsx`, find the "Questions?" `Text` element:
```tsx
      <Text muted small>
        Questions? Reply to this email or visit our{" "}
```

Insert before it:
```tsx
      <Text muted small style={{ textAlign: "center" as const }}>
        Need a GP consultation?{" "}
        <a href={`${appUrl}/request?service=consult`} style={{ color: colors.accent, fontWeight: 500 }}>
          Consultations from $49.95
        </a>
      </Text>

```

**Step 3: Typecheck and commit**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
git add components/email/templates/med-cert-patient.tsx components/email/templates/prescription-approved.tsx
git commit -m "feat: post-approval cross-sell links in approval email templates"
```

---

## Task 6: Day-3 follow-up email for med cert patients

**Problem:** After a cert is approved, silence. No follow-up. A gentle check-in 3 days later creates a second touchpoint, surfaces the consult product, and builds the patient relationship.

**Spec:**
- Sends 72–96 hours after cert approval (one-time, not repeating)
- Med-cert intakes only (`service.type = med_certs` or `category = medical_certificate`)
- Gate: new `follow_up_sent_at` column on `intakes`
- Respects marketing opt-out (`canSendMarketingEmail`)
- List-Unsubscribe header (Spam Act)
- Cron runs daily at 11am AEST
- Copy: human, brief, not salesy — GP voice

**Files:**
- Create: `components/email/templates/follow-up-reminder.tsx`
- Create: `app/api/cron/follow-up-reminder/route.ts`
- New migration for `follow_up_sent_at` column
- Modify: `vercel.json`

---

**Step 1: Create migration**

```bash
cd /Users/rey/Desktop/instantmed
supabase migration new add_follow_up_sent_at_to_intakes
```

Edit the generated file in `supabase/migrations/`:
```sql
-- Add follow-up email tracking to intakes
ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz DEFAULT NULL;

-- Index for cron query performance
CREATE INDEX IF NOT EXISTS idx_intakes_follow_up
  ON intakes (status, category, approved_at, follow_up_sent_at)
  WHERE follow_up_sent_at IS NULL;

COMMENT ON COLUMN intakes.follow_up_sent_at IS
  'When the day-3 post-approval follow-up email was sent. NULL = not yet sent.';
```

```bash
supabase db push
```

**Step 2: Create email template**

```tsx
// components/email/templates/follow-up-reminder.tsx
import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  colors,
} from "../base-email"

export interface FollowUpReminderEmailProps {
  patientName: string
  appUrl?: string
}

export function FollowUpReminderEmail({
  patientName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: FollowUpReminderEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Checking in — how are you feeling?"
      appUrl={appUrl}
    >
      <Text>Hi {firstName},</Text>

      <Text>
        Just checking in. It&apos;s been a few days since your medical certificate was approved —
        hope you&apos;re on the mend.
      </Text>

      <Text>
        If symptoms are hanging around or you need ongoing care, a GP consultation might be
        worth considering. Same process — fill in a form, a doctor reviews it.
      </Text>

      <Button href={`${appUrl}/request?service=consult`}>
        Start a consultation
      </Button>

      <Text muted small style={{ textAlign: "center" as const }}>
        GP consultations from $49.95
      </Text>

      <Text muted small>
        If you&apos;re all good — great. No action needed.
      </Text>

      <Text muted small>
        To stop these check-in emails,{" "}
        <a href={`${appUrl}/patient/settings?unsubscribe=marketing`} style={{ color: colors.accent }}>
          unsubscribe here
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const followUpReminderSubject = "Checking in — how are you feeling?"
```

**Step 3: Export from template index**

In `components/email/templates/index.ts`, add:
```ts
export { FollowUpReminderEmail, followUpReminderSubject } from "./follow-up-reminder"
export type { FollowUpReminderEmailProps } from "./follow-up-reminder"
```

**Step 4: Create cron handler**

```ts
// app/api/cron/follow-up-reminder/route.ts
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendViaResend } from "@/lib/email/resend"
import { FollowUpReminderEmail, followUpReminderSubject } from "@/components/email/templates"
import { renderToString } from "react-dom/server"
import { createElement } from "react"
import { canSendMarketingEmail } from "@/app/actions/email-preferences"
import { createLogger } from "@/lib/observability/logger"
import { getAppUrl } from "@/lib/env"

// Vercel Cron auth
const CRON_SECRET = process.env.CRON_SECRET

const log = createLogger("follow-up-reminder")

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // Auth check — Vercel passes this header from cron config
  const authHeader = req.headers.get("authorization")
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const appUrl = getAppUrl()

  // Find med-cert intakes approved 72–96 hours ago with no follow-up sent
  const now = new Date()
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()
  const ninetyFiveHoursAgo = new Date(now.getTime() - 95 * 60 * 60 * 1000).toISOString()

  const { data: intakes, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      category,
      patient:profiles!patient_id(email, full_name, first_name)
    `)
    .in("status", ["approved", "completed"])
    .eq("category", "medical_certificate")
    .gte("approved_at", ninetyFiveHoursAgo)
    .lte("approved_at", seventyTwoHoursAgo)
    .is("follow_up_sent_at", null)
    .limit(50)

  if (error) {
    log.error("Failed to fetch follow-up candidates", { error: error.message })
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const intake of intakes ?? []) {
    const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
    const email = patient?.email
    const fullName = patient?.full_name || patient?.first_name || "there"

    if (!email || !intake.patient_id) {
      skipped++
      continue
    }

    // Respect marketing opt-out
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      skipped++
      continue
    }

    const html = renderToString(
      createElement(FollowUpReminderEmail, { patientName: fullName, appUrl })
    )

    const unsubscribeUrl = `${appUrl}/patient/settings?unsubscribe=marketing`

    const result = await sendViaResend({
      to: email,
      subject: followUpReminderSubject,
      html,
      tags: [
        { name: "category", value: "follow_up_reminder" },
        { name: "intake_id", value: intake.id },
      ],
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })

    if (result.success) {
      await supabase
        .from("intakes")
        .update({ follow_up_sent_at: new Date().toISOString() })
        .eq("id", intake.id)
      sent++
      log.info("Sent follow-up email", { intakeId: intake.id })
    } else {
      log.error("Failed to send follow-up email", { intakeId: intake.id, error: result.error })
      skipped++
    }

    // Rate limit buffer
    await new Promise(r => setTimeout(r, 100))
  }

  return NextResponse.json({ sent, skipped, total: (intakes ?? []).length })
}
```

**Important:** Check whether `approved_at` column exists on `intakes`. Run:
```bash
grep -r "approved_at" /Users/rey/Desktop/instantmed/supabase/migrations --include="*.sql" | tail -5
```

If the column doesn't exist, use `updated_at` as a proxy — change the query filter from `approved_at` to `updated_at` in the cron handler.

**Step 5: Add to vercel.json**

In `vercel.json`, add to the `crons` array:
```json
{
  "path": "/api/cron/follow-up-reminder",
  "schedule": "0 1 * * *"
}
```

(1am UTC = ~11am AEST)

**Step 6: Typecheck**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
```

**Step 7: Commit**

```bash
git add components/email/templates/follow-up-reminder.tsx \
        app/api/cron/follow-up-reminder/route.ts \
        vercel.json \
        supabase/migrations/
git commit -m "feat: day-3 follow-up email cron for med cert patients"
```

---

## Task 7: Referral `?ref=` attribution capture and PostHog tracking

**Problem:** The referral card generates `?ref=<code>` links but nothing captures them. When a referred patient arrives at the site, the ref code is lost. The referral API returns stub stats (confirmed by comment: "full referral tracking to be built post-launch").

**Scope of this task:** Capture the `?ref=` param into a cookie, fire a PostHog event, and pass the ref code through to Stripe checkout metadata. Full credit application (DB, webhooks, ledger) is post-launch scope.

**Files:**
- Create: `components/shared/referral-capture.tsx`
- Modify: `app/page.tsx` (marketing homepage — add the capture component)
- Check: `lib/stripe/checkout.ts` or equivalent — add ref code to Stripe session metadata

---

**Step 1: Create the capture component**

```tsx
// components/shared/referral-capture.tsx
"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { capture } from "@/lib/analytics/capture"

const REF_COOKIE = "instantmed_ref"
const REF_COOKIE_TTL_DAYS = 30

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function ReferralCapture() {
  const searchParams = useSearchParams()
  const ref = searchParams.get("ref")

  useEffect(() => {
    if (!ref || typeof document === "undefined") return

    // Store for 30 days — persists across pages until checkout
    setCookie(REF_COOKIE, ref, REF_COOKIE_TTL_DAYS)

    // Fire PostHog event for attribution visibility
    capture("referral_link_clicked", {
      referral_code: ref,
      source: "url_param",
    })
  }, [ref])

  return null
}
```

**Step 2: Add to homepage and request page**

Referral links point to `/?ref=<code>`. Add `ReferralCapture` to the homepage.

In `app/page.tsx`, import and add to the page render. Since `useSearchParams` requires Suspense, wrap it:

```tsx
import { Suspense } from "react"
import { ReferralCapture } from "@/components/shared/referral-capture"

// Add inside the page component return, before other content:
<Suspense fallback={null}>
  <ReferralCapture />
</Suspense>
```

**Step 3: Pass ref code to Stripe checkout**

Find the checkout session creation. Run:
```bash
grep -rn "createCheckoutSession\|checkout.*session\|Stripe.*checkout" /Users/rey/Desktop/instantmed/lib/stripe --include="*.ts" | head -10
```

In the checkout session creation function, read the ref cookie from request headers and add to Stripe session metadata:

```ts
// Read ref cookie utility (server-side)
function getRefCodeFromCookies(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(/instantmed_ref=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}
```

In the Stripe `checkout.sessions.create` call, add to `metadata`:
```ts
metadata: {
  intake_id: intakeId,
  patient_id: patientId,
  // existing fields...
  referral_code: refCode || "",
}
```

**Step 4: Typecheck**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
```

**Step 5: Commit**

```bash
git add components/shared/referral-capture.tsx app/page.tsx
git commit -m "feat: capture ?ref= referral param into cookie + PostHog attribution"
```

---

## Final verification

After all tasks:

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck && pnpm build
```

Expected: build succeeds, no type errors.

Spot-check in dev:
1. Load `/?ref=testcode` — check PostHog for `referral_link_clicked` event, check cookie `instantmed_ref=testcode`
2. Approve a test intake as doctor — check that patient dashboard shows toast notification (not just the intake detail page)
3. Navigate to an approved intake — confirm cross-sell card appears below the document download
4. Check `/patient/intakes/confirmed` — verify "Reviewed within hours, most days." is shown
5. Check `/auth/complete-account` — verify solid card surface (no glass blur)

---

## Summary

| Task | Files touched | Complexity |
|------|--------------|------------|
| 1. Global notifications | 2 files | Medium |
| 2. Confirmed page copy | 1 file | Trivial |
| 3. Complete-account surface | 1 file | Trivial |
| 4. Cross-sell on intake detail | 2 files | Low |
| 5. Cross-sell in emails | 2 files | Low |
| 6. Day-3 follow-up cron | 3 files + migration | Medium |
| 7. Referral attribution | 2 files + 1 modify | Medium |
