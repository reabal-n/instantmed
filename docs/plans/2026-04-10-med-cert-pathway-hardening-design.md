# Med Cert Pathway Hardening — Design Doc
**Date:** 2026-04-10  
**Status:** Approved  
**Scope:** Pre-launch hardening for Google Ads med cert campaign

---

## Goal

Make the med cert pathway operationally sound and copy-consistent before Google Ads traffic arrives. Three independent workstreams:

1. **Telegram 1h doctor alert** — currently missing despite code comment claiming it exists
2. **Canonical wait time** — 4 different timing claims across the codebase, all changing to "Under 1 hour"
3. **Patient UX copy audit** — fix hardcoded timing claims on landing, success, audience pages

---

## Audit Findings

### Critical: Telegram 1h Doctor Alert — Doesn't Exist

`app/api/cron/stale-queue/route.ts` comment at line 27 says:
> "Sends a Telegram queue summary to the doctor if any requests have been waiting 1h+"

The code does NOT do this. Zero Telegram code in that file. Only Sentry + PostHog metrics fire. A patient could wait 2h+ before you get an actionable alert. Fix is required before ads go live.

### Major: 4 Different Timing Claims

| Location | Current Claim | Action |
|----------|--------------|--------|
| `lib/social-proof.ts` (canonical) | `certTurnaroundMinutes: 20` → "Under 20 min" | **Change to 60 + add label** |
| `for/tradies`, `students`, `shift-workers`, `corporate`, `[audience]` | "15 min turnaround" (hardcoded) | **Update to "Under 1 hour"** |
| `medical-certificate/[slug]`, `location/[suburb]` | "~15 min" / "15 min" hardcoded | **Update** |
| `what-happens-next.tsx` (success page) | "under 30 minutes" × 2 | **Update** |
| `pricing-section.tsx` (comparison table) | "~38 min avg" | **Update** |
| `lib/microcopy/med-cert-v2.ts` | "within 30 minutes" | **Update** |
| `public/llms.txt` | "under 30 minutes" | **Update** |
| `request-received.tsx` email | "usually within an hour" | ✅ Already correct |
| `lib/seo/data/states.ts` (SEO content) | "~30 min" × 9 | **Leave — competitive SEO differentiator** |
| `lib/seo/data/competitor-comparisons.ts` | "~30 min" × 2 | **Leave — competitive SEO differentiator** |

### Auto-Approval: Solid Architecture, Verify Flag

Pipeline has: feature flag, rate limiting, state machine (CAS), round-robin doctor selection, retry cron, Telegram on failure. Well-built. Operational risk: confirm `ai_auto_approve_enabled = true` before ads launch.

### Google Ads: Status

- LegitScript certified ✅ (2026-04-08, Cert ID 48400566)
- Google Ads account-level healthcare cert: ⚠️ still need to submit child account + domain
- Landing page (`/medical-certificate`): CTA above fold ✅, no entry modal ✅, keyword in H1 ✅
- Dedicated LP: not required for launch — run on `/medical-certificate` first

---

## Architecture

### 1. DB Migration: `doctor_telegram_alert_sent_at`

Add a single nullable timestamp to `intakes` to track whether the doctor has been Telegram-alerted for a stale intake. Prevents repeated alerts per intake.

```sql
ALTER TABLE intakes
  ADD COLUMN doctor_telegram_alert_sent_at TIMESTAMPTZ;

CREATE INDEX idx_intakes_telegram_alert
  ON intakes (status, doctor_telegram_alert_sent_at)
  WHERE status = 'paid';
```

**Migration file:** `supabase/migrations/20260410000002_doctor_telegram_alert.sql`

### 2. Stale Queue Cron: Telegram Doctor Alert Block

Add to `app/api/cron/stale-queue/route.ts`:

```typescript
const DOCTOR_ALERT_THRESHOLD_HOURS = 1

// -- Doctor Telegram Alert (1h+ wait, once per intake) --
const doctorAlertThreshold = new Date(now.getTime() - DOCTOR_ALERT_THRESHOLD_HOURS * 60 * 60 * 1000)

const { data: staleDoctorAlerts } = await supabase
  .from("intakes")
  .select(`id, category, paid_at, patient:profiles!patient_id(full_name)`)
  .eq("status", "paid")
  .lt("paid_at", doctorAlertThreshold.toISOString())
  .is("doctor_telegram_alert_sent_at", null)
  .limit(10)

if (staleDoctorAlerts?.length) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const lines = staleDoctorAlerts.map((intake) => {
    const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
    const firstName = escapeMarkdown((patient?.full_name as string || "Patient").split(" ")[0])
    const waitMins = Math.round((now.getTime() - new Date(intake.paid_at as string).getTime()) / 60000)
    const refId = intake.id.slice(0, 8).toUpperCase()
    const label = formatServiceType(intake.category as string | null)
    return `• [${refId}](${appUrl}/doctor/intakes/${intake.id}) — ${firstName} — ${escapeMarkdown(label)} — ${waitMins}min`
  }).join("\n")

  const count = staleDoctorAlerts.length
  const msg = `⏰ *${count} request${count > 1 ? "s" : ""} waiting 1h\\+*\n\n${lines}\n\n[Open queue →](${appUrl}/doctor/queue)`
  await sendTelegramAlert(msg)

  // Mark alerted (prevents repeat notifications)
  await supabase
    .from("intakes")
    .update({ doctor_telegram_alert_sent_at: now.toISOString() })
    .in("id", staleDoctorAlerts.map((i) => i.id))

  logger.info("Doctor Telegram alert sent", { count })
}
```

**Import additions:**
```typescript
import { sendTelegramAlert, escapeMarkdown } from "@/lib/notifications/telegram"
```

### 3. Social Proof Canonical Update

`lib/social-proof.ts`:
- Change `certTurnaroundMinutes: 20` → `certTurnaroundMinutes: 60`
- Update comment: `/** Canonical customer-facing promise. All UI must derive from this. */`
- Add `certTurnaroundLabel: "Under 1 hour"` to `SOCIAL_PROOF`
- Update `SOCIAL_PROOF_DISPLAY.certTurnaround` from template string to `certTurnaroundLabel`

`components/marketing/live-wait-time.tsx`:
- `waitLabel: \`Under ${SOCIAL_PROOF.certTurnaroundMinutes} min\`` → `waitLabel: SOCIAL_PROOF.certTurnaroundLabel`

### 4. User-Facing Copy: Files to Update

All "15 min", "~30 min", "under 30 minutes" → `"Under 1 hour"` (where referenced in marketing/patient UX, not SEO editorial content):

| File | What to change |
|------|---------------|
| `components/patient/what-happens-next.tsx:136` | "Typically delivered in under 30 minutes" |
| `components/patient/what-happens-next.tsx:37` | FAQ: "typically issued in under 30 minutes, available 24/7" |
| `app/for/tradies/page.tsx` | metadata description + JSX × 3 instances |
| `app/for/students/page.tsx` | metadata description + JSX × 1 instance |
| `app/for/shift-workers/page.tsx` | metadata description + JSX × 1 instance |
| `app/for/corporate/page.tsx` | metadata description + JSX × 3 instances |
| `app/for/[audience]/page.tsx` | JSX hardcoded "15 min turnaround" |
| `app/medical-certificate/[slug]/page.tsx` | "~15 min turnaround" |
| `app/medical-certificate/location/[suburb]/page.tsx` | "15 min turnaround" |
| `lib/microcopy/med-cert-v2.ts` | "Usually reviewed within 30 minutes" |
| `components/marketing/sections/pricing-section.tsx` | "~38 min avg" in comparison table |
| `public/llms.txt` | "under 30 minutes" |
| `app/online-doctor-australia/page.tsx` | "~30 min" × 3 instances |
| `app/telehealth-australia/page.tsx` | "~30 min" × 2 instances |
| `app/patient/intakes/confirmed/confirmed-client.tsx` | Verify turnaround label |

**Leave unchanged (SEO competitive content):**
- `lib/seo/data/states.ts` — "~30 min" × 9 states
- `lib/seo/data/competitor-comparisons.ts` — "~30 min" × 2
- `lib/blog/articles/` — editorial content, not ad landing destinations

---

## Component Data Flow (After Change)

```
lib/social-proof.ts
  certTurnaroundMinutes: 60
  certTurnaroundLabel: "Under 1 hour"          ← canonical
       │
       ├── SOCIAL_PROOF_DISPLAY.certTurnaround  ← "Under 1 hour"
       │         │
       │         └── AnimatedStat (stat presets, social proof strip)
       │
       └── live-wait-time.tsx (waitLabel)       ← "Under 1 hour"

User-facing pages: import SOCIAL_PROOF.certTurnaroundLabel where possible,
hardcode "Under 1 hour" where import is impractical (metadata strings)
```

---

## Out of Scope

- Google Ads account-level certification submission (ops task, not code)
- Dedicated `/lp/med-cert` landing page (run ads on `/medical-certificate` first)
- UTM PostHog tracking audit (PostHog's autocapture handles UTMs; verify post-launch)
- SEO editorial content (states.ts, competitor comparisons) — leave "~30 min"

---

## Risks

| Risk | Mitigation |
|------|-----------|
| `doctor_telegram_alert_sent_at` migration drift | Use `supabase db push`. Stale queue cron is defensive — if field doesn't exist, query will fail and error is logged |
| Cron doesn't import `sendTelegramAlert` (`server-only`) | `telegram.ts` is already server-only; cron is an API route — no issue |
| `for/*` pages have metadata turnaround in description strings — changing could briefly affect SEO rankings | Low risk; "under 1 hour" is still a competitive claim for medical certificates |
| Auto-approval flag OFF at ad launch | Ops checklist item — verify in admin before enabling ads |

---

## Pre-Launch Checklist

- [ ] Migration applied: `20260410000002_doctor_telegram_alert.sql`
- [ ] `ai_auto_approve_enabled = true` in feature flags table
- [ ] Stale queue cron Telegram block deployed and tested (check Vercel logs)
- [ ] All "15 min / 30 min" user-facing copy updated
- [ ] Google Ads child account healthcare certification submitted
- [ ] First ad campaign configured targeting `/medical-certificate` landing page
