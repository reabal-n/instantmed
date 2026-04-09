# Med Cert Pathway Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the med cert pathway for Google Ads launch: add the missing Telegram 1h doctor alert, canonicalise wait time copy to "Under 1 hour" from a single source of truth, and audit all user-facing timing claims.

**Architecture:** Three independent workstreams executed in order — DB migration first (needed by the cron), then cron code, then copy audit. The canonical value lives in `lib/social-proof.ts`; all UI should derive from `SOCIAL_PROOF.certTurnaroundLabel`. SEO editorial content (states.ts, competitor-comparisons.ts) intentionally left at "~30 min" — it's a valid differentiator claim, not an ad landing destination.

**Tech Stack:** Next.js 15 App Router · TypeScript · Supabase Postgres · Telegram Bot API (already wired via `lib/notifications/telegram.ts`) · Vercel Cron · `supabase db push`

---

## Task 1: DB Migration — `doctor_telegram_alert_sent_at`

**Files:**
- Create: `supabase/migrations/20260410000002_doctor_telegram_alert.sql`

**Step 1: Create the migration file**

```sql
-- supabase/migrations/20260410000002_doctor_telegram_alert.sql
-- Tracks whether the doctor has been Telegram-alerted for a stale intake.
-- Prevents repeated hourly pings for the same intake.

ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS doctor_telegram_alert_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_intakes_doctor_telegram_alert
  ON intakes (status, doctor_telegram_alert_sent_at)
  WHERE status = 'paid';
```

**Step 2: Apply the migration**

```bash
supabase db push
```

Expected: `Applied 1 migration` (or similar). If you see "already applied", check `supabase migration list` — you may need `supabase migration repair`.

**Step 3: Verify column exists**

```bash
supabase db execute --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'intakes' AND column_name = 'doctor_telegram_alert_sent_at';"
```

Expected: one row with `doctor_telegram_alert_sent_at | timestamp with time zone`.

**Step 4: Commit**

```bash
git add supabase/migrations/20260410000002_doctor_telegram_alert.sql
git commit -m "feat(db): add doctor_telegram_alert_sent_at to intakes"
```

---

## Task 2: Stale Queue Cron — Add Telegram 1h Doctor Alert

**Files:**
- Modify: `app/api/cron/stale-queue/route.ts`

**Step 1: Read the current file**

Open `app/api/cron/stale-queue/route.ts`. Note the structure:
- Lines 1–10: imports
- Lines 10–30: constants + GET handler start
- Lines 71–131: patient delay emails block
- Lines 133–151: stuck `awaiting_script` block
- Lines 153–165: return

**Step 2: Add import for Telegram**

At the top of the file, after the existing imports (after the `import * as Sentry` line), add:

```typescript
import { sendTelegramAlert, escapeMarkdown } from "@/lib/notifications/telegram"
```

**Step 3: Add the `DOCTOR_ALERT_THRESHOLD_HOURS` constant**

After the existing `PATIENT_EMAIL_THRESHOLD_HOURS` constant (line 12), add:

```typescript
// Doctor gets a Telegram alert after this long (once per intake)
const DOCTOR_ALERT_THRESHOLD_HOURS = 1
```

**Step 4: Update the JSDoc comment on the GET handler**

Change line 27's comment from:
```
 * - Sends a Telegram queue summary to the doctor if any requests have been waiting 1h+
```
to:
```
 * - Sends a Telegram alert (once per intake) to the doctor for requests waiting 1h+
```

**Step 5: Insert the Telegram alert block**

After the patient delay email `try/catch` block (which ends around line 131, just before the `// ── Stuck awaiting_script` comment), insert:

```typescript
    // ── Doctor Telegram Alert (1h+ wait, once per intake) ───────────────────
    let doctorAlertsQueued = 0
    try {
      const doctorAlertThreshold = new Date(now.getTime() - DOCTOR_ALERT_THRESHOLD_HOURS * 60 * 60 * 1000)

      const { data: staleDoctorAlerts } = await supabase
        .from("intakes")
        .select(`id, category, paid_at, patient:profiles!patient_id(full_name)`)
        .eq("status", "paid")
        .lt("paid_at", doctorAlertThreshold.toISOString())
        .is("doctor_telegram_alert_sent_at", null)
        .limit(10)

      if (staleDoctorAlerts && staleDoctorAlerts.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
        const lines = staleDoctorAlerts.map((intake) => {
          const patientRaw = intake.patient as
            | { full_name: string }[]
            | { full_name: string }
            | null
          const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
          const firstName = escapeMarkdown((patient?.full_name || "Patient").split(" ")[0])
          const waitMins = Math.round(
            (now.getTime() - new Date(intake.paid_at as string).getTime()) / 60000
          )
          const refId = intake.id.slice(0, 8).toUpperCase()
          const label = escapeMarkdown(formatServiceType(intake.category as string | null))
          return `• [${refId}](${appUrl}/doctor/intakes/${intake.id}) \\— ${firstName} \\— ${label} \\— ${waitMins}min`
        }).join("\n")

        const count = staleDoctorAlerts.length
        const countLabel = count > 1 ? `${count} requests` : `1 request`
        const msg = `⏰ *${escapeMarkdown(countLabel)} waiting 1h\\+*\n\n${lines}\n\n[Open queue →](${appUrl}/doctor/queue)`
        await sendTelegramAlert(msg)

        // Mark alerted so this intake doesn't trigger again
        await supabase
          .from("intakes")
          .update({ doctor_telegram_alert_sent_at: now.toISOString() })
          .in("id", staleDoctorAlerts.map((i) => i.id))

        doctorAlertsQueued = staleDoctorAlerts.length
        logger.info("Doctor Telegram alert sent for stale queue", { count: doctorAlertsQueued })
      }
    } catch (doctorAlertError) {
      logger.error("Error in doctor Telegram alert block", {}, doctorAlertError as Error)
      Sentry.captureException(doctorAlertError, {
        tags: { subsystem: "stale-queue", stage: "doctor_telegram_alert" },
      })
    }
```

**Step 6: Update the return JSON to include the new metric**

Find the `return NextResponse.json({` block (last ~10 lines of the handler) and add `doctor_alerts_sent: doctorAlertsQueued` to the response object:

```typescript
    return NextResponse.json({
      success: true,
      stale_count: totalStale,
      delay_emails_sent: delayEmailsSent,
      doctor_alerts_sent: doctorAlertsQueued,
      stuck_awaiting_script: stuckScriptCount ?? 0,
      checked_at: now.toISOString(),
    })
```

**Step 7: Type-check**

```bash
pnpm typecheck 2>&1 | grep stale-queue
```

Expected: no errors for that file.

**Step 8: Commit**

```bash
git add app/api/cron/stale-queue/route.ts
git commit -m "feat(cron): add Telegram 1h doctor alert for stale queue — was missing despite comment"
```

---

## Task 3: Canonicalise Social Proof — Add `certTurnaroundLabel`

**Files:**
- Modify: `lib/social-proof.ts`
- Modify: `components/marketing/live-wait-time.tsx`

**Step 1: Update `lib/social-proof.ts`**

Find the `certTurnaroundMinutes` line (line 60):
```typescript
  /** Typical turnaround for certificates specifically — must stay under 30 min */
  certTurnaroundMinutes: 20,
```

Replace with:
```typescript
  /** Canonical customer-facing promise for med cert turnaround. All UI must derive from certTurnaroundLabel. */
  certTurnaroundMinutes: 60,
  /** Human-readable canonical wait time label — single source of truth for all marketing copy. */
  certTurnaroundLabel: "Under 1 hour",
```

**Step 2: Update `SOCIAL_PROOF_DISPLAY.certTurnaround`**

Find line 94:
```typescript
  certTurnaround: `${SOCIAL_PROOF.certTurnaroundMinutes} min`,
```

Replace with:
```typescript
  certTurnaround: SOCIAL_PROOF.certTurnaroundLabel,
```

**Step 3: Update `live-wait-time.tsx`**

In `components/marketing/live-wait-time.tsx`, find the `SERVICE_CONFIG['med-cert']` block. Change the `waitLabel`:

From:
```typescript
    waitLabel: `Under ${SOCIAL_PROOF.certTurnaroundMinutes} min`,
```

To:
```typescript
    waitLabel: SOCIAL_PROOF.certTurnaroundLabel,
```

**Step 4: Type-check**

```bash
pnpm typecheck 2>&1 | grep -E "social-proof|live-wait"
```

Expected: no errors.

**Step 5: Commit**

```bash
git add lib/social-proof.ts components/marketing/live-wait-time.tsx
git commit -m "feat(social-proof): canonicalise cert turnaround to 'Under 1 hour' — single source of truth"
```

---

## Task 4: Patient UX Copy — Success Page

**Files:**
- Modify: `components/patient/what-happens-next.tsx`

**Step 1: Fix the reassurance badge (line 136)**

Find:
```typescript
              {isMedCert ? "Typically delivered in under 30 minutes" : "Doctors are reviewing requests now"}
```

Replace with:
```typescript
              {isMedCert ? "Typically delivered in under 1 hour" : "Doctors are reviewing requests now"}
```

**Step 2: Fix the FAQ item (line 37)**

Find:
```typescript
    answer: "Medical certificates are typically issued in under 30 minutes, available 24/7. Prescriptions and consultations are reviewed within 1–2 hours during operating hours (8am–10pm AEST).",
```

Replace with:
```typescript
    answer: "Medical certificates are typically issued within 1 hour, available 24/7. Prescriptions and consultations are reviewed within 1–2 hours during operating hours (8am–10pm AEST).",
```

**Step 3: Type-check the file**

```bash
pnpm typecheck 2>&1 | grep what-happens-next
```

Expected: no errors.

**Step 4: Commit**

```bash
git add components/patient/what-happens-next.tsx
git commit -m "fix(copy): update post-payment success page turnaround from 30min to 1 hour"
```

---

## Task 5: Microcopy Dictionary

**Files:**
- Modify: `lib/microcopy/med-cert-v2.ts`

**Step 1: Update `global.turnaround`**

Find line 16:
```typescript
    turnaround: "Usually reviewed within 30 minutes, available 24/7",
```

Replace with:
```typescript
    turnaround: "Usually reviewed within 1 hour, available 24/7",
```

**Step 2: Commit**

```bash
git add lib/microcopy/med-cert-v2.ts
git commit -m "fix(copy): update med-cert microcopy turnaround to 1 hour"
```

---

## Task 6: Pricing Section Comparison Table

**Files:**
- Modify: `components/marketing/sections/pricing-section.tsx`

**Step 1: Find the comparison row**

In `comparisonRows` array (around line 230), find:
```typescript
  { label: 'Turnaround *', instant: '~38 min avg', gp: 'Requires booking', walkin: '2–4 hours', instantHighlight: true },
```

Replace with:
```typescript
  { label: 'Turnaround *', instant: 'Under 1 hour', gp: 'Requires booking', walkin: '2–4 hours', instantHighlight: true },
```

**Step 2: Commit**

```bash
git add components/marketing/sections/pricing-section.tsx
git commit -m "fix(copy): update pricing comparison turnaround to 'Under 1 hour'"
```

---

## Task 7: Audience Pages — `/for/tradies`, `/for/students`, `/for/shift-workers`, `/for/corporate`

**Files:**
- Modify: `app/for/tradies/page.tsx`
- Modify: `app/for/students/page.tsx`
- Modify: `app/for/shift-workers/page.tsx`
- Modify: `app/for/corporate/page.tsx`

### `app/for/tradies/page.tsx`

**Step 1: Fix metadata description (line 12)**

Find:
```typescript
  description: "Get your medical certificate without leaving the job site. 15-minute turnaround. Valid for all employers. No appointments, no waiting rooms. Built for tradies.",
```
Replace with:
```typescript
  description: "Get your medical certificate without leaving the job site. Under 1 hour. Valid for all employers. No appointments, no waiting rooms. Built for tradies.",
```

**Step 2: Fix OG description (line 22)**

Find:
```typescript
    description: "Get your med cert without leaving the site. 15-minute turnaround. Valid for all employers.",
```
Replace with:
```typescript
    description: "Get your med cert without leaving the site. Under 1 hour. Valid for all employers.",
```

**Step 3: Fix hero subheadline JSX (line 77)**

Find:
```typescript
                    Woke up crook? Get your medical certificate on your phone in <strong>15 minutes</strong>. No doctor visits, no time off site, no stuffing around.
```
Replace with:
```typescript
                    Woke up crook? Get your medical certificate on your phone. No doctor visits, no time off site, no stuffing around.
```
(Remove the time claim from the hero body — it's covered by the badge below.)

**Step 4: Fix the speed badge (line 94)**

Find:
```typescript
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
```
Replace with:
```typescript
                      <span className="font-medium text-muted-foreground">Under 1 hour</span>
```

**Step 5: Fix the Speed Stats section (line 121)**

Find:
```typescript
                      <div className="text-2xl font-bold mb-1 text-dawn-600">15 min</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
```
Replace with:
```typescript
                      <div className="text-2xl font-bold mb-1 text-dawn-600">&lt; 1 hr</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
```

**Step 6: Fix "Why tradies use this" card (line 149)**

Find:
```typescript
                      desc: "15-minute turnaround. Have your cert before your boss even asks.",
```
Replace with:
```typescript
                      desc: "Under 1 hour. Have your cert before your boss even asks.",
```

**Step 7: Fix FAQ answer (if present) — check for "15 minutes" in faqSchema**

In the `faqSchema` object near the top of the page, find:
```typescript
          text: "Yes. Complete the questionnaire on your phone in about 2 minutes. Your certificate is reviewed by a doctor and delivered to your email — typically within 15 minutes. No need to leave the site.",
```
Replace with:
```typescript
          text: "Yes. Complete the questionnaire on your phone in about 2 minutes. Your certificate is reviewed by a doctor and delivered to your email — typically within 1 hour. No need to leave the site.",
```

---

### `app/for/students/page.tsx`

**Step 8: Fix metadata description (line 12)**

Find:
```typescript
  description: "Get a medical certificate for university special consideration or missed exams. 15-minute turnaround. Accepted by all Australian universities. No GP wait times.",
```
Replace with:
```typescript
  description: "Get a medical certificate for university special consideration or missed exams. Under 1 hour. Accepted by all Australian universities. No GP wait times.",
```

**Step 9: Fix OG description (line 23)**

Find:
```typescript
    description: "Get your medical certificate for special consideration in 15 minutes. Accepted by all Australian unis.",
```
Replace with:
```typescript
    description: "Get your medical certificate for special consideration in under 1 hour. Accepted by all Australian unis.",
```

**Step 10: Grep remaining "15 min" in the file**

```bash
grep -n "15 min\|15-min" app/for/students/page.tsx
```

Fix any remaining instances (badge, stat block, FAQ) following the same pattern as tradies above.

---

### `app/for/shift-workers/page.tsx`

**Step 11: Fix metadata description (line 12)**

Find:
```typescript
  description: "Get a medical certificate any time of day or night. 15-minute turnaround. Perfect for nurses, hospitality, retail, and anyone working outside 9-5. Valid for all employers.",
```
Replace with:
```typescript
  description: "Get a medical certificate any time of day or night. Under 1 hour, available 24/7. Perfect for nurses, hospitality, retail, and anyone working outside 9-5. Valid for all employers.",
```

**Step 12: Fix OG description (line 23)**

Find:
```typescript
    description: "Get your med cert any time. 15-minute turnaround. Perfect for shift workers.",
```
Replace with:
```typescript
    description: "Get your med cert any time. Under 1 hour, available 24/7. Perfect for shift workers.",
```

**Step 13: Grep and fix remaining "15 min" instances**

```bash
grep -n "15 min\|15-min" app/for/shift-workers/page.tsx
```

---

### `app/for/corporate/page.tsx`

**Step 14: Fix metadata description (line 12)**

Find:
```typescript
  description: "Get a medical certificate before HR asks. 15-minute turnaround, delivered to your inbox. Professional, discreet, valid for all employers. No time off work needed.",
```
Replace with:
```typescript
  description: "Get a medical certificate before HR asks. Under 1 hour, delivered to your inbox. Professional, discreet, valid for all employers. No time off work needed.",
```

**Step 15: Grep and fix all remaining "15 min" instances**

```bash
grep -n "15 min\|15-min" app/for/corporate/page.tsx
```

Fix each: replace `"15-minute turnaround"` / `"15 min turnaround"` with `"Under 1 hour"`.

**Step 16: Commit all `for/*` pages together**

```bash
git add app/for/tradies/page.tsx app/for/students/page.tsx app/for/shift-workers/page.tsx app/for/corporate/page.tsx
git commit -m "fix(copy): update for/* audience pages turnaround from 15 min to 'Under 1 hour'"
```

---

## Task 8: Audience Dynamic Page (`/for/[audience]`)

**Files:**
- Modify: `app/for/[audience]/page.tsx`

**Step 1: Fix the hardcoded badge in the hero (line 106)**

Find:
```typescript
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
```
Replace with:
```typescript
                      <span className="font-medium text-muted-foreground">Under 1 hour</span>
```

**Step 2: Check for any other "15 min" in the file**

```bash
grep -n "15 min\|15-min" "app/for/[audience]/page.tsx"
```

**Step 3: Commit**

```bash
git add "app/for/[audience]/page.tsx"
git commit -m "fix(copy): update dynamic audience page turnaround badge to 'Under 1 hour'"
```

---

## Task 9: Med Cert SEO Sub-pages (`[slug]` and `location/[suburb]`)

**Files:**
- Modify: `app/medical-certificate/[slug]/page.tsx`
- Modify: `app/medical-certificate/location/[suburb]/page.tsx`

### `app/medical-certificate/[slug]/page.tsx`

**Step 1: Find the "~15 min turnaround" badge**

```bash
grep -n "15 min\|~15" "app/medical-certificate/[slug]/page.tsx"
```

Find the badge JSX (around line 300):
```tsx
                  ~15 min turnaround
```
Replace with:
```tsx
                  Under 1 hour
```

### `app/medical-certificate/location/[suburb]/page.tsx`

**Step 2: Find "15 min turnaround"**

```bash
grep -n "15 min" "app/medical-certificate/location/[suburb]/page.tsx"
```

Find (around line 363):
```tsx
                  <span className="font-medium">15 min turnaround</span>
```
Replace with:
```tsx
                  <span className="font-medium">Under 1 hour</span>
```

**Step 3: Commit**

```bash
git add "app/medical-certificate/[slug]/page.tsx" "app/medical-certificate/location/[suburb]/page.tsx"
git commit -m "fix(copy): update med-cert sub-pages turnaround from 15 min to 'Under 1 hour'"
```

---

## Task 10: Public Files and SEO Landing Pages

**Files:**
- Modify: `public/llms.txt`
- Modify: `app/online-doctor-australia/page.tsx`
- Modify: `app/telehealth-australia/page.tsx`

### `public/llms.txt`

**Step 1:** Find (line 22):
```
- **Turnaround:** Medical certificates in under 30 minutes (24/7). Other requests reviewed within 1–2 hours
```
Replace with:
```
- **Turnaround:** Medical certificates in under 1 hour (24/7). Other requests reviewed within 1–2 hours
```

### `app/online-doctor-australia/page.tsx`

**Step 2: Fix stat value (line 71)**

Find:
```typescript
  { value: "~30 min", label: "Med cert turnaround", context: "Typical same-day timing" },
```
Replace with:
```typescript
  { value: "< 1 hr", label: "Med cert turnaround", context: "Typical same-day timing" },
```

**Step 3: Fix body text (line 80)**

Find:
```typescript
    body: "Valid for employers, universities, and Centrelink. Same-day turnaround, accepted under the Fair Work Act 2009.",
```
This doesn't contain "30 min" — leave it.

**Step 4: Find remaining "~30 min" in the file**

```bash
grep -n "~30 min\|30 min" app/online-doctor-australia/page.tsx
```

Fix each instance (badge text in JSX, stat display) → `"Under 1 hour"` or `"< 1 hr"` where it's a short badge.

### `app/telehealth-australia/page.tsx`

**Step 5: Find all "~30 min" instances**

```bash
grep -n "~30 min\|30 min" app/telehealth-australia/page.tsx
```

Fix each → `"Under 1 hour"` or `"< 1 hr"` (use `"< 1 hr"` for short badge slots, `"Under 1 hour"` for text).

**Step 6: Commit**

```bash
git add public/llms.txt app/online-doctor-australia/page.tsx app/telehealth-australia/page.tsx
git commit -m "fix(copy): update online-doctor and telehealth pages turnaround to 'Under 1 hour'"
```

---

## Task 11: Verify `confirmed-client.tsx`

**Files:**
- Inspect: `app/patient/intakes/confirmed/confirmed-client.tsx`

**Step 1: Check for hardcoded turnaround claims**

```bash
grep -n "min\|hour\|turnaround\|30\|15\|20" app/patient/intakes/confirmed/confirmed-client.tsx
```

**Step 2: If a turnaround label is found** that references "15 min" or "30 min", update it to "Under 1 hour". If the label is already "Under 1 hour" or references `SOCIAL_PROOF_DISPLAY`, no change needed.

**Step 3: Commit if changed**

```bash
git add app/patient/intakes/confirmed/confirmed-client.tsx
git commit -m "fix(copy): update confirmed page turnaround claim to 1 hour"
```

---

## Task 12: CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Increment migration count**

Find the migration count line (Gotchas section):
```
Most recent: `20260410000001_followup_tracker.sql`
```
Replace with:
```
Most recent: `20260410000002_doctor_telegram_alert.sql`
```

Also update the count from **195** to **196**.

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: increment migration count to 196 after doctor_telegram_alert migration"
```

---

## Task 13: Final Verification

**Step 1: Full type-check**

```bash
pnpm typecheck
```

Expected: 0 errors.

**Step 2: Grep for any remaining hardcoded claims in user-facing paths**

```bash
grep -rn "15 min turnaround\|15-minute turnaround\|under 30 minutes\|within 30 minutes\|~30 min\|~38 min" \
  app/for/ app/medical-certificate/ components/patient/ components/marketing/sections/ lib/microcopy/ public/ \
  --include="*.tsx" --include="*.ts" --include="*.txt" \
  | grep -v "node_modules" | grep -v ".next"
```

Expected: **0 results.** If any appear, fix them before proceeding.

**Step 3: Run unit tests**

```bash
pnpm test
```

Expected: all pass. The auto-approval tests in `lib/__tests__/auto-approval-pipeline.test.ts` are the most relevant — confirm no regressions.

**Step 4: Lint**

```bash
pnpm lint
```

Expected: no new errors.

**Step 5: Build**

```bash
pnpm build
```

Expected: build succeeds. This confirms no TypeScript or import errors slipped through.

---

## Pre-Launch Ops Checklist (Non-Code)

These items must be done manually before enabling Google Ads:

- [ ] **Verify** `ai_auto_approve_enabled = true` in the feature flags table (check via Admin → Features)
- [ ] **Test** the stale queue cron manually: call `GET /api/cron/stale-queue` with the `CRON_SECRET` header and confirm Telegram fires for any test intake older than 1h (or temporarily lower the threshold to 1 min in a test env)
- [ ] **Submit** Google Ads child account healthcare certification (account-level, done in Google Ads UI with your LegitScript Cert ID 48400566)
- [ ] **Remove** any Customer Match / advertiser-curated audience segments from health campaigns in Google Ads
- [ ] **Confirm** ad copy uses "under 1 hour" or similar (must match landing page claim for Quality Score)
