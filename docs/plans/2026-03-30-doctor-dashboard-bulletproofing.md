# Doctor Dashboard Bulletproofing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the doctor dashboard and clinical pipeline across five areas: keyboard shortcuts, auto-approval visibility, patient comms, delivery confirmation, and cert pipeline failure recovery.

**Architecture:** All changes are additive. No schema renames. Each task is independent and can be committed separately.

**Tech Stack:** Next.js 15 App Router · React 19 · Supabase PostgreSQL · Resend webhooks · Vercel Cron

---

## Task 1: Keyboard Shortcuts — Add A (approve) and D (decline)

**Context:** `j`/`k`/`Enter`/`Escape` already exist in `queue-client.tsx:351-390`. Missing: `a` to approve, `d` to open decline dialog.

**Files:**
- Modify: `app/doctor/queue/queue-client.tsx:358-385`

**Step 1: Add `a` and `d` cases to the existing switch statement**

In the `handleKeyDown` function at `queue-client.tsx:358`, after the `Escape` case, add:

```typescript
        case "a": // Approve (or open review for med certs)
          if (expandedId) {
            e.preventDefault()
            const intake = filteredIntakes.find((r) => r.id === expandedId)
            if (intake) {
              const service = intake.service as { type?: string } | undefined
              handleApprove(intake.id, service?.type)
            }
          }
          break
        case "d": // Open decline dialog
          if (expandedId) {
            e.preventDefault()
            setDeclineDialog(expandedId)
          }
          break
```

**Step 2: Update the keyboard hint in the dashboard page**

`app/doctor/dashboard/page.tsx:93` currently shows `⌘?`. Update the hint to show available shortcuts:

```tsx
<div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60 font-mono">
  <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">j</kbd>
  <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">k</kbd>
  <span className="text-muted-foreground/40">navigate</span>
  <span className="mx-1 text-muted-foreground/20">·</span>
  <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">a</kbd>
  <span className="text-muted-foreground/40">approve</span>
  <span className="mx-1 text-muted-foreground/20">·</span>
  <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">d</kbd>
  <span className="text-muted-foreground/40">decline</span>
</div>
```

**Step 3: Verify manually**
- Open `/doctor/dashboard` in browser
- Press `j` to select first item, press `a` → should approve (or open review panel for med certs)
- Press `j` again, press `d` → decline dialog should open
- Press `Escape` → dialog closes

**Step 4: Commit**
```bash
git add app/doctor/queue/queue-client.tsx app/doctor/dashboard/page.tsx
git commit -m "feat: add a/d keyboard shortcuts for approve/decline in doctor queue"
```

---

## Task 2: Auto-Approval Hit Rate in Doctor Dashboard Stats

**Context:** `getAutoApprovalMetrics()` already fetches `todayAttempted`, `todayApproved`, `todayIneligible`, `todayFailed`, `todayRevoked`. Dashboard passes only `aiApprovedToday` and `aiRevokedToday` to `IntakeMonitor`. Need to surface hit rate (approved / eligible attempts).

**Files:**
- Modify: `app/doctor/dashboard/page.tsx:71-78`
- Modify: `components/doctor/intake-monitor.tsx`

**Step 1: Pass additional metrics to IntakeMonitor**

In `app/doctor/dashboard/page.tsx`, update `enrichedMonitoringStats`:

```typescript
  const enrichedMonitoringStats = {
    ...monitoringStats,
    slaBreached: slaData.breached,
    slaApproaching: slaData.approaching,
    aiApprovedToday: autoApprovalMetrics?.todayApproved,
    aiRevokedToday: autoApprovalMetrics?.todayRevoked,
    aiAttemptedToday: autoApprovalMetrics?.todayAttempted,
    aiIneligibleToday: autoApprovalMetrics?.todayIneligible,
    todayEarnings,
  }
```

**Step 2: Add fields to IntakeMonitorStats interface**

In `components/doctor/intake-monitor.tsx`, add to `IntakeMonitorStats`:

```typescript
  aiAttemptedToday?: number
  aiIneligibleToday?: number
```

**Step 3: Add hit rate calculation and display**

In `IntakeMonitor`, after the existing `approvalRate` calculation (around line 107), add:

```typescript
  // AI auto-approval hit rate: approved / eligible (attempted - ineligible)
  const aiEligibleAttempts = (stats.aiAttemptedToday ?? 0) - (stats.aiIneligibleToday ?? 0)
  const aiHitRate = aiEligibleAttempts > 0
    ? Math.round(((stats.aiApprovedToday ?? 0) / aiEligibleAttempts) * 100)
    : null
```

In the render, find where `aiApprovedToday` is shown (around line 230) and expand it to show hit rate:

```tsx
{(stats.aiApprovedToday != null && (stats.aiAttemptedToday ?? 0) > 0) && (
  <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
    <Sparkles className="h-3.5 w-3.5" />
    <span>{stats.aiApprovedToday} AI approved</span>
    {aiHitRate !== null && (
      <span className="text-muted-foreground">({aiHitRate}% hit rate)</span>
    )}
  </div>
)}
```

**Step 4: Update monitoring API route to include new fields**

Find `/api/doctor/monitoring-stats` route (used for client-side refresh in `IntakeMonitor`) and ensure it returns the same new fields. Search for the route:

```bash
grep -r "monitoring-stats" /Users/rey/Desktop/instantmed/app/api/ --include="*.ts" -l
```

Add `aiAttemptedToday` and `aiIneligibleToday` to its response shape.

**Step 5: Verify**
- Check `/doctor/dashboard` — stats bar should show e.g. "3 AI approved (75% hit rate)"
- When 0 attempts, hit rate should not render

**Step 6: Commit**
```bash
git add app/doctor/dashboard/page.tsx components/doctor/intake-monitor.tsx
git commit -m "feat: show AI auto-approval hit rate in doctor dashboard stats"
```

---

## Task 3: Patient "Still Reviewing" Email at 45 Minutes

**Context:** `follow_up_sent_at` column exists on `intakes` (migration `20260327041848`). No email template for this. The `retry-auto-approval` cron runs every 3 minutes and processes intakes 2-60 minutes old — it's the right place to send the 45-min follow-up.

**Files:**
- Create: `components/email/templates/still-reviewing.tsx`
- Modify: `app/api/cron/retry-auto-approval/route.ts`

**Step 1: Create the email template**

Create `components/email/templates/still-reviewing.tsx`:

```tsx
import {
  Body, Container, Head, Heading, Html, Preview,
  Section, Text, Button, Hr, Tailwind,
} from "@react-email/components"

interface StillReviewingEmailProps {
  patientName: string
  requestType: string
  requestId: string
}

export function StillReviewingEmail({
  patientName,
  requestType,
  requestId,
}: StillReviewingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Update on your {requestType} — still with our doctor</Preview>
      <Tailwind>
        <Body className="bg-[#F8F7F4] font-sans">
          <Container className="mx-auto py-10 px-4 max-w-xl">
            <Heading className="text-2xl font-semibold text-gray-900 mb-2">
              Your request is still being reviewed
            </Heading>
            <Text className="text-gray-600 text-base">
              Hi {patientName},
            </Text>
            <Text className="text-gray-600 text-base">
              Your {requestType} is with our doctor and taking a little longer than usual. We haven't forgotten about you — our doctor is working through the queue and will complete your review shortly.
            </Text>
            <Text className="text-gray-600 text-base">
              You'll receive a separate email the moment your request has been reviewed.
            </Text>
            <Section className="mt-6">
              <Button
                href={`https://instantmed.com.au/patient/requests/${requestId}`}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                View your request
              </Button>
            </Section>
            <Hr className="border-gray-200 my-8" />
            <Text className="text-gray-400 text-xs">
              InstantMed · support@instantmed.com.au · 0450 722 549
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export const stillReviewingSubject = (requestType: string) =>
  `Still reviewing your ${requestType} — thanks for your patience`
```

**Step 2: Export from templates index**

In `components/email/templates/index.ts`, add:
```typescript
export { StillReviewingEmail, stillReviewingSubject } from "./still-reviewing"
```

**Step 3: Add the send logic to the retry-auto-approval cron**

In `app/api/cron/retry-auto-approval/route.ts`, after the intake query but before the auto-approval loop, add follow-up email sending for intakes 45+ minutes old that haven't had a follow-up sent.

Find where the `eligibleIntakes` are fetched (around line 50) and add a parallel query:

```typescript
    // Also: send "still reviewing" emails for intakes 45+ min old without follow-up sent
    const fortyFiveMinAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString()
    const { data: followUpCandidates } = await supabase
      .from("intakes")
      .select(`
        id, patient_id, category, subtype,
        patient:profiles!patient_id(full_name, email)
      `)
      .eq("status", "paid")
      .is("follow_up_sent_at", null)
      .lt("paid_at", fortyFiveMinAgo)
      .not("patient_id", "is", null)
      .limit(20)

    if (followUpCandidates && followUpCandidates.length > 0) {
      const { sendEmail } = await import("@/lib/email/send-email")
      const { StillReviewingEmail, stillReviewingSubject } = await import(
        "@/components/email/templates/still-reviewing"
      )
      const React = await import("react")

      await Promise.allSettled(
        followUpCandidates.map(async (intake) => {
          const patientRaw = intake.patient as
            | { full_name: string; email: string }[]
            | { full_name: string; email: string }
            | null
          const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
          if (!patient?.email) return

          const requestType = formatRequestType(intake.category, intake.subtype)

          try {
            await sendEmail({
              to: patient.email,
              toName: patient.full_name || undefined,
              subject: stillReviewingSubject(requestType),
              template: React.createElement(StillReviewingEmail, {
                patientName: patient.full_name || "there",
                requestType,
                requestId: intake.id,
              }),
              emailType: "still_reviewing",
              intakeId: intake.id,
              patientId: intake.patient_id,
            })
            // Mark sent so we don't send twice
            await supabase
              .from("intakes")
              .update({ follow_up_sent_at: new Date().toISOString() })
              .eq("id", intake.id)
          } catch (err) {
            logger.error("Failed to send still-reviewing email", { intakeId: intake.id }, err as Error)
          }
        })
      )
    }
```

You'll need a `formatRequestType` helper. Copy the one from `lib/email/send-status.ts:155-166` or import it if it's exported.

**Step 4: Add "still_reviewing" to email type allowlist**

Search for where `emailType` is validated (likely in `lib/email/send-email.ts` or a Zod schema) and add `"still_reviewing"` to the allowed types.

```bash
grep -n "emailType\|email_type\|still_reviewing" /Users/rey/Desktop/instantmed/lib/email/send-email.ts
grep -rn "request_approved.*request_declined\|EmailType" /Users/rey/Desktop/instantmed/types/ /Users/rey/Desktop/instantmed/lib/ 2>/dev/null | head -10
```

**Step 5: Test locally**
- Manually trigger the cron via curl with `Authorization: Bearer $CRON_SECRET`
- Check Supabase `email_outbox` table for new `still_reviewing` rows
- Check `intakes.follow_up_sent_at` is set

**Step 6: Commit**
```bash
git add components/email/templates/still-reviewing.tsx components/email/templates/index.ts app/api/cron/retry-auto-approval/route.ts
git commit -m "feat: send patient 'still reviewing' email at 45 minutes via cron"
```

---

## Task 4: Resend Delivery Confirmation — Add email_opened_at to issued_certificates

**Context:** `app/api/webhooks/resend/route.ts:371` already tries to write `email_opened_at` to `issued_certificates` but the column doesn't exist yet. One migration fixes this permanently.

**Files:**
- Create: `supabase/migrations/20260330000001_add_email_opened_at_to_issued_certificates.sql`

**Step 1: Create migration**

```sql
-- Add email delivery tracking to issued_certificates
ALTER TABLE issued_certificates
  ADD COLUMN IF NOT EXISTS email_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;

-- Index for quick lookup of unconfirmed certs
CREATE INDEX IF NOT EXISTS idx_issued_certs_email_opened
  ON issued_certificates (email_opened_at)
  WHERE email_opened_at IS NULL;

COMMENT ON COLUMN issued_certificates.email_opened_at IS 'Set by Resend webhook on first email.opened event. Confirms patient received certificate.';
COMMENT ON COLUMN issued_certificates.resend_count IS 'Number of times doctor has manually resent the certificate email.';
```

**Step 2: Apply migration**

```bash
supabase db push
```

Or via Supabase MCP if available.

**Step 3: Verify the Resend webhook now works**

The code in `app/api/webhooks/resend/route.ts:368-375` already has the write. Once the column exists, it will start populating automatically when patients open emails.

**Step 4: Commit**
```bash
git add supabase/migrations/20260330000001_add_email_opened_at_to_issued_certificates.sql
git commit -m "feat: add email_opened_at + resend_count to issued_certificates for delivery tracking"
```

---

## Task 5: Certificate Failure Visibility + Doctor Resend Action

**Context:** After a cert is issued, there's no way to see if the email bounced or was never opened, or for the doctor to resend. This task adds a "Resend Certificate" action to the doctor's intake review panel, visible when delivery is uncertain.

**Files:**
- Create: `app/actions/resend-certificate.ts`
- Modify: `components/doctor/intake-review-panel.tsx` (or wherever cert delivery status is shown)
- Modify: `lib/cert/execute-approval.ts` (or) Create a resend function that reuses send logic

**Step 1: Find where the intake review panel shows certificate status**

```bash
grep -n "certificate\|email_sent_at\|issued_cert" /Users/rey/Desktop/instantmed/components/doctor/intake-review-panel.tsx | head -20
```

Read the relevant section of `intake-review-panel.tsx` to understand where cert info is displayed.

**Step 2: Create the resend action**

Create `app/actions/resend-certificate.ts`:

```typescript
"use server"

import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientSubject } from "@/components/email/templates/med-cert-patient"
import React from "react"

const logger = createLogger("resend-certificate")

export async function resendCertificateAction(
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireRole(["doctor", "admin"])
  if (!user) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()

  // Fetch the issued certificate and patient details
  const { data: cert, error: certError } = await supabase
    .from("issued_certificates")
    .select(`
      id, storage_path, certificate_number, resend_count,
      intake:intakes!intake_id (
        id, category, patient_id,
        patient:profiles!patient_id (full_name, email)
      )
    `)
    .eq("intake_id", intakeId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .single()

  if (certError || !cert) {
    return { success: false, error: "Certificate not found" }
  }

  // Throttle: max 3 resends
  if ((cert.resend_count ?? 0) >= 3) {
    return { success: false, error: "Maximum resends reached. Contact support." }
  }

  const intake = Array.isArray(cert.intake) ? cert.intake[0] : cert.intake
  const patient = Array.isArray(intake?.patient) ? intake.patient[0] : intake?.patient

  if (!patient?.email) {
    return { success: false, error: "Patient email not found" }
  }

  try {
    // Generate a signed URL for the certificate (valid 7 days)
    const { data: signedUrl } = await supabase.storage
      .from("certificates")
      .createSignedUrl(cert.storage_path, 7 * 24 * 60 * 60)

    if (!signedUrl) {
      return { success: false, error: "Could not generate certificate link" }
    }

    await sendEmail({
      to: patient.email,
      toName: patient.full_name || undefined,
      subject: medCertPatientSubject,
      template: React.createElement(MedCertPatientEmail, {
        patientName: patient.full_name || "there",
        certificateUrl: signedUrl.signedUrl,
        certificateNumber: cert.certificate_number,
        requestId: intakeId,
        isResend: true,
      }),
      emailType: "request_approved",
      intakeId,
      patientId: intake?.patient_id ?? "",
      certificateId: cert.id,
    })

    // Increment resend count and clear email_opened_at so tracking resets
    await supabase
      .from("issued_certificates")
      .update({
        resend_count: (cert.resend_count ?? 0) + 1,
        email_opened_at: null, // Reset — will be set again when patient opens resent email
      })
      .eq("id", cert.id)

    logger.info("Certificate resent by doctor", {
      intakeId,
      certId: cert.id,
      doctorId: user.profile.id,
      resendCount: (cert.resend_count ?? 0) + 1,
    })

    return { success: true }
  } catch (err) {
    logger.error("Failed to resend certificate", { intakeId }, err as Error)
    return { success: false, error: "Failed to send email" }
  }
}
```

**Step 3: Check MedCertPatientEmail props**

```bash
grep -n "interface.*Props\|isResend" /Users/rey/Desktop/instantmed/components/email/templates/med-cert-patient.tsx | head -10
```

If `isResend` isn't an existing prop, either add it (to prefix subject with "Resent: ") or just use the email as-is — both are fine. Only add `isResend` if you need to change the subject line.

**Step 4: Add resend button to the intake review panel**

Find the certificate section in `components/doctor/intake-review-panel.tsx`:

```bash
grep -n "certificate\|issued_cert\|email_sent_at" /Users/rey/Desktop/instantmed/components/doctor/intake-review-panel.tsx | head -20
```

In the certificate section, add a "Resend" button visible when the cert exists:

```tsx
{cert && (
  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
    <div className="flex items-center gap-2 text-sm">
      <FileCheck className="h-4 w-4 text-success" />
      <span>Certificate issued</span>
      {cert.email_opened_at ? (
        <Badge className="bg-success-light text-success border-success-border text-xs">
          Email opened
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Awaiting confirmation
        </Badge>
      )}
    </div>
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
      disabled={isResending || (cert.resend_count ?? 0) >= 3}
      onClick={() => handleResend()}
    >
      {isResending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
      {(cert.resend_count ?? 0) > 0 ? `Resent (${cert.resend_count})` : "Resend"}
    </Button>
  </div>
)}
```

Add `isResending` state and `handleResend` function in the panel component:

```typescript
const [isResending, setIsResending] = useState(false)

const handleResend = async () => {
  setIsResending(true)
  const result = await resendCertificateAction(intakeId)
  setIsResending(false)
  if (result.success) {
    toast.success("Certificate email resent")
    router.refresh()
  } else {
    toast.error(result.error || "Failed to resend")
  }
}
```

**Step 5: Fetch email_opened_at and resend_count in the panel data query**

The panel loads intake data via a server query. Find where `issued_certificates` is selected and add the new columns:

```bash
grep -n "issued_certificates\|email_sent_at" /Users/rey/Desktop/instantmed/components/doctor/intake-review-panel.tsx /Users/rey/Desktop/instantmed/lib/data/intakes.ts | head -20
```

Update the select to include `email_opened_at, resend_count`.

**Step 6: Test the flow**

1. Find an approved intake with a certificate in the doctor portal
2. Open the intake review panel
3. Should see "Certificate issued" + "Awaiting confirmation" badge
4. Click "Resend" → toast success → resend_count increments in DB
5. When patient opens the email, Resend webhook will set `email_opened_at` → badge changes to "Email opened"

**Step 7: Commit**
```bash
git add app/actions/resend-certificate.ts components/doctor/intake-review-panel.tsx
git commit -m "feat: certificate delivery status + doctor resend action in review panel"
```

---

## Final: Deploy

```bash
git push origin main
vercel --prod
```

Verify in production:
- Keyboard shortcuts work in doctor queue (j/k/a/d)
- AI hit rate shows in stats bar
- Stale-queue or retry-auto-approval cron sends follow-up emails (check `email_outbox` after 45+ min test intake)
- `issued_certificates.email_opened_at` is populated when Resend fires `email.opened`
- Resend button visible in doctor review panel for approved intakes
