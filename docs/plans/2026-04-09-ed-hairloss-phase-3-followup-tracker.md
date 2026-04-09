# ED / Hair Loss — Phase 3 Implementation Plan: Follow-Up Tracker + Decision Support

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the retention infrastructure for ED + hair loss patients — a cron-driven follow-up tracker with dashboard card, patient submission form, doctor review surface — plus doctor-portal contraindication tooltips that surface rationale for safety-critical answers.

**Architecture:** Two new Postgres tables (`intake_followups`, `followup_email_log`) plus the `intake-photos` storage bucket. Approval hook in `updateStatusAction` creates three rows per ED/hair-loss intake at approval time. A daily cron queries due rows and sends parameterised Resend emails with a tokenless `/patient/followups/{id}` link (auth-gated by RLS). Patient dashboard renders a progress card when active follow-ups exist. Doctor portal gets a new "Follow-up check-ins" card alongside the existing intake detail, and safety-flagged clinical-summary rows become Tooltip triggers with rationale strings keyed by field name.

**Tech Stack:** Supabase Postgres + RLS, Next.js 15 App Router, Resend email via existing `sendEmail` pipeline, Vercel Cron (`app/api/cron/<name>/route.ts`), Zustand-free server actions, date-fns `addMonths`, Radix Tooltip via `@/components/ui/tooltip`.

---

## Context — read before starting

- **Design doc:** `docs/plans/2026-04-09-ed-hairloss-hardening-design.md` (Phase 3 is §3.1–§3.6, lines 385–589).
- **Intake approval hook point:** `app/doctor/queue/actions.ts` line ~82, inside `updateStatusAction`, after the successful `updateIntakeStatus(...)` call but before `revalidatePath`. This is where ED/hair-loss consults transition to `approved`. NOT `app/actions/draft-approval.ts` — that's for AI draft approval, a different flow.
- **Existing cron pattern:** cron jobs live at `app/api/cron/<name>/route.ts` with `verifyCronRequest` + `acquireCronLock` + `releaseCronLock` + `captureCronError`. See `app/api/cron/follow-up-reminder/route.ts` (this is the med-cert day-3 follow-up — do NOT collide with it, use the name `treatment-followup` for the new cron).
- **Email templates:** `components/email/templates/*.tsx` rendered by `sendEmail` via `lib/email/send-email.ts`. The existing `follow-up-reminder.tsx` is the med-cert one — do NOT overwrite; name ours `treatment-followup.tsx`.
- **Tooltip, NOT HoverCard:** the design doc mentions `<HoverCard>` but the codebase uses `@/components/ui/tooltip` (Radix). Use Tooltip.
- **Migration count:** currently 194. After this phase: **195**.
- **Dependencies:** `date-fns` is already in the repo (see `lib/prescriptions/refill-reminders.ts`).
- **Zod:** all server action inputs must be Zod-validated per CLAUDE.md.
- **Logging:** no `console.log` — ESLint `no-console` errors. Use `createLogger` from `@/lib/observability/logger`.

---

## Task 1: Write the migration (tables, RLS, storage bucket)

**Files:**
- Create: `supabase/migrations/20260410000001_followup_tracker.sql`

**Step 1: Write the migration**

```sql
-- Migration: followup_tracker
-- Purpose: retention infrastructure for ED + hair loss patients
-- Tables: intake_followups, followup_email_log
-- Bucket: intake-photos (for deferred intake photo upload + phase-3 follow-up photos)

-- =============================================================================
-- intake_followups
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.intake_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  subtype text NOT NULL CHECK (subtype IN ('ed','hair_loss')),
  milestone text NOT NULL CHECK (milestone IN ('month_3','month_6','month_12')),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  skipped boolean NOT NULL DEFAULT false,
  side_effects_reported boolean NOT NULL DEFAULT false,
  side_effects_notes text,
  effectiveness_rating smallint CHECK (effectiveness_rating BETWEEN 1 AND 5),
  adherence_days_per_week smallint CHECK (adherence_days_per_week BETWEEN 0 AND 7),
  patient_notes text,
  doctor_reviewed_at timestamptz,
  doctor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_intake_followups_due
  ON public.intake_followups (due_at)
  WHERE completed_at IS NULL AND skipped = false;

CREATE INDEX IF NOT EXISTS idx_intake_followups_patient
  ON public.intake_followups (patient_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_intake_followups_doctor_review
  ON public.intake_followups (doctor_reviewed_at, completed_at)
  WHERE completed_at IS NOT NULL AND doctor_reviewed_at IS NULL;

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_intake_followups_touch()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS intake_followups_touch ON public.intake_followups;
CREATE TRIGGER intake_followups_touch
  BEFORE UPDATE ON public.intake_followups
  FOR EACH ROW EXECUTE FUNCTION public.tg_intake_followups_touch();

-- =============================================================================
-- followup_email_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.followup_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id uuid NOT NULL REFERENCES public.intake_followups(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  template text NOT NULL,
  resend_message_id text,
  reminder_number smallint NOT NULL CHECK (reminder_number BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_followup_email_log_followup
  ON public.followup_email_log (followup_id, sent_at DESC);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.intake_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_email_log ENABLE ROW LEVEL SECURITY;

-- Patients can read their own rows
DROP POLICY IF EXISTS followups_patient_select ON public.intake_followups;
CREATE POLICY followups_patient_select ON public.intake_followups
  FOR SELECT USING (patient_id = auth.uid());

-- Patients can update their own rows (RLS as defence-in-depth; server actions do the real work)
DROP POLICY IF EXISTS followups_patient_update ON public.intake_followups;
CREATE POLICY followups_patient_update ON public.intake_followups
  FOR UPDATE USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Doctors and admins can read + write everything
DROP POLICY IF EXISTS followups_doctor_all ON public.intake_followups;
CREATE POLICY followups_doctor_all ON public.intake_followups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor','admin')
    )
  );

-- Email log: service-role only (cron writes, no direct user access)
DROP POLICY IF EXISTS followup_email_log_service ON public.followup_email_log;
CREATE POLICY followup_email_log_service ON public.followup_email_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- Storage bucket: intake-photos
-- Path convention: intake-photos/{patient_id}/{intake_or_followup_id}/{filename}
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-photos', 'intake-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS intake_photos_patient_read ON storage.objects;
CREATE POLICY intake_photos_patient_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'intake-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS intake_photos_doctor_read ON storage.objects;
CREATE POLICY intake_photos_doctor_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'intake-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor','admin')
    )
  );

DROP POLICY IF EXISTS intake_photos_patient_insert ON storage.objects;
CREATE POLICY intake_photos_patient_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'intake-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role has implicit full access; no explicit policy needed.

COMMENT ON TABLE public.intake_followups IS
  'Post-approval follow-up check-ins for ED and hair-loss patients. Three rows (month_3, month_6, month_12) created per intake on approval.';
COMMENT ON TABLE public.followup_email_log IS
  'Immutable log of follow-up reminder emails sent. Max 3 reminders per followup row.';
```

**Step 2: Apply the migration**

Run: `supabase db push`
Expected: "Applied migration 20260410000001_followup_tracker" with no errors.

If drift errors: `supabase migration repair --status applied <earlier-version>` then retry.

**Step 3: Verify tables exist**

Run: `supabase db lint` (optional)
Then list tables via MCP or psql: confirm `intake_followups`, `followup_email_log`, and `storage.buckets` row for `intake-photos`.

**Step 4: Commit**

```bash
git add supabase/migrations/20260410000001_followup_tracker.sql
git commit -m "feat(db): add followup_tracker migration for ED/hair-loss retention

Creates intake_followups + followup_email_log tables with RLS,
plus intake-photos storage bucket with per-patient folder isolation."
```

---

## Task 2: Add `addFollowupsForApprovedConsult` helper

Pure helper so it can be unit-tested in isolation. Server action calls this after successful status update.

**Files:**
- Create: `lib/data/followups.ts`
- Test: `lib/__tests__/followups.test.ts`

**Step 1: Write the failing test**

```ts
// lib/__tests__/followups.test.ts
import { describe, it, expect } from "vitest"
import { computeFollowupMilestones } from "@/lib/data/followups"

describe("computeFollowupMilestones", () => {
  it("returns three milestones at +3, +6, +12 months", () => {
    const approvedAt = new Date("2026-04-09T10:00:00Z")
    const milestones = computeFollowupMilestones(approvedAt)
    expect(milestones).toHaveLength(3)
    expect(milestones[0].milestone).toBe("month_3")
    expect(milestones[0].dueAt.toISOString()).toBe("2026-07-09T10:00:00.000Z")
    expect(milestones[1].milestone).toBe("month_6")
    expect(milestones[1].dueAt.toISOString()).toBe("2026-10-09T10:00:00.000Z")
    expect(milestones[2].milestone).toBe("month_12")
    expect(milestones[2].dueAt.toISOString()).toBe("2027-04-09T10:00:00.000Z")
  })

  it("handles end-of-month edge case (Jan 31 → Apr 30)", () => {
    const milestones = computeFollowupMilestones(new Date("2026-01-31T00:00:00Z"))
    // date-fns addMonths clamps to last valid day of target month
    expect(milestones[0].dueAt.toISOString().startsWith("2026-04-30")).toBe(true)
  })
})
```

**Step 2: Run to verify it fails**

Run: `pnpm test lib/__tests__/followups.test.ts`
Expected: FAIL — "Cannot find module '@/lib/data/followups'"

**Step 3: Implement the helper**

```ts
// lib/data/followups.ts
import { addMonths } from "date-fns"

export type FollowupMilestone = "month_3" | "month_6" | "month_12"
export type FollowupSubtype = "ed" | "hair_loss"

export interface ComputedMilestone {
  milestone: FollowupMilestone
  dueAt: Date
}

/**
 * Compute the three follow-up milestone dates given an approval timestamp.
 * Order: month_3, month_6, month_12.
 */
export function computeFollowupMilestones(approvedAt: Date): ComputedMilestone[] {
  return [
    { milestone: "month_3", dueAt: addMonths(approvedAt, 3) },
    { milestone: "month_6", dueAt: addMonths(approvedAt, 6) },
    { milestone: "month_12", dueAt: addMonths(approvedAt, 12) },
  ]
}
```

**Step 4: Run to verify pass**

Run: `pnpm test lib/__tests__/followups.test.ts`
Expected: 2 passed.

**Step 5: Commit**

```bash
git add lib/data/followups.ts lib/__tests__/followups.test.ts
git commit -m "feat(followups): add computeFollowupMilestones helper"
```

---

## Task 3: Add DB write helper + hook into `updateStatusAction`

**Files:**
- Modify: `lib/data/followups.ts` (extend with DB write)
- Modify: `app/doctor/queue/actions.ts` (hook point ~line 82)

**Step 1: Extend `lib/data/followups.ts`**

```ts
// lib/data/followups.ts — append below computeFollowupMilestones

import type { SupabaseClient } from "@supabase/supabase-js"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("followups")

/**
 * Insert three follow-up rows for an approved ED/hair-loss consult intake.
 * Idempotent via UNIQUE (intake_id, milestone) — upsert on conflict do nothing.
 */
export async function createFollowupsForIntake(
  supabase: SupabaseClient,
  params: {
    intakeId: string
    patientId: string
    subtype: FollowupSubtype
    approvedAt?: Date
  }
): Promise<{ success: boolean; inserted: number }> {
  const approvedAt = params.approvedAt ?? new Date()
  const milestones = computeFollowupMilestones(approvedAt)

  const rows = milestones.map((m) => ({
    intake_id: params.intakeId,
    patient_id: params.patientId,
    subtype: params.subtype,
    milestone: m.milestone,
    due_at: m.dueAt.toISOString(),
  }))

  const { error, count } = await supabase
    .from("intake_followups")
    .upsert(rows, { onConflict: "intake_id,milestone", ignoreDuplicates: true, count: "exact" })

  if (error) {
    log.error("Failed to create followups", {
      intakeId: params.intakeId,
      subtype: params.subtype,
      error: error.message,
    })
    return { success: false, inserted: 0 }
  }

  log.info("Followups created", {
    intakeId: params.intakeId,
    subtype: params.subtype,
    inserted: count ?? 0,
  })

  return { success: true, inserted: count ?? rows.length }
}
```

**Step 2: Hook into `updateStatusAction`**

Open `app/doctor/queue/actions.ts`. Between the existing `const result = await updateIntakeStatus(...)` success check and the `revalidatePath` calls (around lines 82–92), add:

```ts
// After: if (!result) { return ... }
// After: if (status === "in_review") { await markAsReviewed(...) }

// Phase 3: create follow-up rows for ED/hair-loss consults on approval
if (status === "approved") {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const { data: intakeRow } = await supabase
      .from("intakes")
      .select("id, patient_id, subtype, category")
      .eq("id", intakeId)
      .single()

    if (
      intakeRow?.category === "consult" &&
      (intakeRow.subtype === "ed" || intakeRow.subtype === "hair_loss")
    ) {
      const { createFollowupsForIntake } = await import("@/lib/data/followups")
      await createFollowupsForIntake(supabase, {
        intakeId: intakeRow.id,
        patientId: intakeRow.patient_id,
        subtype: intakeRow.subtype,
      })
    }
  } catch (err) {
    // Non-critical: log and continue. Approval itself already succeeded.
    Sentry.captureException(err, {
      tags: { action: "create_followups", intake_id: intakeId },
      level: "warning",
    })
    logger.warn("Failed to create followups post-approval", {
      intakeId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

revalidatePath("/doctor/dashboard")
// ...existing code
```

**Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

**Step 4: Run the existing test suite to ensure no regression**

Run: `pnpm test`
Expected: all passing.

**Step 5: Commit**

```bash
git add lib/data/followups.ts app/doctor/queue/actions.ts
git commit -m "feat(followups): create follow-up rows on ED/hair-loss approval"
```

---

## Task 4: Parameterised email template

**Files:**
- Create: `components/email/templates/treatment-followup.tsx`
- Test: `lib/__tests__/treatment-followup-email.test.tsx`

**Step 1: Write the failing test**

```tsx
// lib/__tests__/treatment-followup-email.test.tsx
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import {
  TreatmentFollowupEmail,
  treatmentFollowupSubject,
} from "@/components/email/templates/treatment-followup"

describe("TreatmentFollowupEmail", () => {
  it("renders ED month_3 copy with correct CTA link", () => {
    const html = renderToStaticMarkup(
      <TreatmentFollowupEmail
        patientName="Alex"
        followupId="fu_123"
        subtype="ed"
        milestone="month_3"
        baseUrl="https://instantmed.com.au"
      />
    )
    expect(html).toContain("Alex")
    expect(html).toContain("3-month")
    expect(html).toContain("https://instantmed.com.au/patient/followups/fu_123")
    // TGA: no drug names
    expect(html).not.toMatch(/sildenafil|tadalafil|viagra|cialis|finasteride|minoxidil/i)
  })

  it("renders hair-loss month_12 copy", () => {
    const html = renderToStaticMarkup(
      <TreatmentFollowupEmail
        patientName="Sam"
        followupId="fu_456"
        subtype="hair_loss"
        milestone="month_12"
        baseUrl="https://instantmed.com.au"
      />
    )
    expect(html).toContain("Sam")
    expect(html).toContain("12-month")
    expect(html).not.toMatch(/finasteride|minoxidil|propecia|rogaine/i)
  })

  it("treatmentFollowupSubject returns milestone-specific subject", () => {
    expect(treatmentFollowupSubject("ed", "month_3")).toContain("3-month")
    expect(treatmentFollowupSubject("hair_loss", "month_6")).toContain("6-month")
  })
})
```

**Step 2: Run to verify fail**

Run: `pnpm test lib/__tests__/treatment-followup-email.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement the template**

```tsx
// components/email/templates/treatment-followup.tsx
import * as React from "react"

export type FollowupSubtype = "ed" | "hair_loss"
export type FollowupMilestone = "month_3" | "month_6" | "month_12"

interface Props {
  patientName: string
  followupId: string
  subtype: FollowupSubtype
  milestone: FollowupMilestone
  baseUrl: string
}

const MILESTONE_LABEL: Record<FollowupMilestone, string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const SUBTYPE_FRAMING: Record<FollowupSubtype, Record<FollowupMilestone, string>> = {
  ed: {
    month_3:
      "You started your treatment about three months ago. By now most men are starting to see how it's working for them. We'd like to check in — just a few quick questions.",
    month_6:
      "You're six months into your treatment. This is a good time to take stock: is it working well? Are there any side effects? Your doctor wants to know.",
    month_12:
      "It's been a year since you started treatment. Your doctor would like a brief update on how it's been going for you, and whether anything's changed.",
  },
  hair_loss: {
    month_3:
      "You've been using your hair-loss treatment for about three months now. Early changes are usually subtle — sometimes it's less shedding before any visible regrowth. We'd love a quick update.",
    month_6:
      "You're six months into your hair-loss treatment. Most people see meaningful changes by now. Your doctor would like to check in on how it's going.",
    month_12:
      "It's been twelve months — the point where the full effect of hair-loss treatment is usually visible. Your doctor would like to hear how you're doing.",
  },
}

export function treatmentFollowupSubject(
  subtype: FollowupSubtype,
  milestone: FollowupMilestone,
): string {
  const label = MILESTONE_LABEL[milestone]
  const service = subtype === "ed" ? "your treatment" : "your hair-loss treatment"
  return `How's ${service} going? — InstantMed ${label} check-in`
}

export function TreatmentFollowupEmail({
  patientName,
  followupId,
  subtype,
  milestone,
  baseUrl,
}: Props) {
  const label = MILESTONE_LABEL[milestone]
  const framing = SUBTYPE_FRAMING[subtype][milestone]
  const ctaHref = `${baseUrl}/patient/followups/${followupId}`
  const skipHref = `${baseUrl}/patient/followups/${followupId}/skip`

  return (
    <html>
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a", maxWidth: 560, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Hi {patientName},</h1>

        <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
          {framing}
        </p>

        <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          This takes about a minute. Your responses go straight to your doctor.
        </p>

        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={ctaHref}
            style={{
              display: "inline-block",
              padding: "14px 28px",
              backgroundColor: "#0ea5e9",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Share your {label} update
          </a>
        </div>

        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, marginTop: 32, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
          Not relevant anymore? <a href={skipHref} style={{ color: "#64748b" }}>Skip this check-in</a> and we won't send more reminders for this milestone.
        </p>

        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
          InstantMed Pty Ltd · Level 1/457–459 Elizabeth Street, Surry Hills NSW 2010 · support@instantmed.com.au
        </p>
      </body>
    </html>
  )
}
```

**Step 4: Run to verify pass**

Run: `pnpm test lib/__tests__/treatment-followup-email.test.tsx`
Expected: 3 passed.

**Step 5: Register template in email index**

Open `components/email/templates/index.ts` and add an export line next to the other template exports:

```ts
export { TreatmentFollowupEmail, treatmentFollowupSubject } from "./treatment-followup"
```

**Step 6: Commit**

```bash
git add components/email/templates/treatment-followup.tsx \
        components/email/templates/index.ts \
        lib/__tests__/treatment-followup-email.test.tsx
git commit -m "feat(email): add treatment-followup parameterised template"
```

---

## Task 5: Cron processor — query + send logic

Pure function so cron route stays thin and testable.

**Files:**
- Create: `lib/email/treatment-followup.ts`
- Test: `lib/__tests__/treatment-followup-processor.test.ts`

**Step 1: Write the failing test**

```ts
// lib/__tests__/treatment-followup-processor.test.ts
import { describe, it, expect } from "vitest"
import { shouldSendReminder, nextReminderNumber } from "@/lib/email/treatment-followup"

describe("shouldSendReminder", () => {
  it("sends when due, not completed, no prior logs", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [],
      })
    ).toBe(true)
  })

  it("does NOT send when completed", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: new Date("2026-04-05"),
        skipped: false,
        logs: [],
      })
    ).toBe(false)
  })

  it("does NOT send when skipped", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: true,
        logs: [],
      })
    ).toBe(false)
  })

  it("does NOT send when sent within last 3 days", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [{ sentAt: new Date("2026-04-08") }],
      })
    ).toBe(false)
  })

  it("sends when last reminder was >3 days ago", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [{ sentAt: new Date("2026-04-04") }],
      })
    ).toBe(true)
  })

  it("does NOT send after 3 reminders", () => {
    const sent = new Date("2026-04-01")
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-03-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [
          { sentAt: sent },
          { sentAt: new Date("2026-03-20") },
          { sentAt: new Date("2026-03-05") },
        ],
      })
    ).toBe(false)
  })

  it("does NOT send before due date", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-05-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [],
      })
    ).toBe(false)
  })
})

describe("nextReminderNumber", () => {
  it("returns 1 for empty log", () => {
    expect(nextReminderNumber([])).toBe(1)
  })
  it("returns 2 after one reminder", () => {
    expect(nextReminderNumber([{ sentAt: new Date() }])).toBe(2)
  })
  it("returns 3 after two reminders", () => {
    expect(nextReminderNumber([{ sentAt: new Date() }, { sentAt: new Date() }])).toBe(3)
  })
})
```

**Step 2: Run to verify fail**

Run: `pnpm test lib/__tests__/treatment-followup-processor.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement processor helpers**

```ts
// lib/email/treatment-followup.ts
import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import { differenceInDays } from "date-fns"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendEmail } from "@/lib/email/send-email"
import {
  TreatmentFollowupEmail,
  treatmentFollowupSubject,
  type FollowupMilestone,
  type FollowupSubtype,
} from "@/components/email/templates/treatment-followup"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("treatment-followup-processor")

const MAX_REMINDERS = 3
const MIN_DAYS_BETWEEN_REMINDERS = 3

interface LogEntry {
  sentAt: Date
}

export function shouldSendReminder(input: {
  dueAt: Date
  now: Date
  completedAt: Date | null
  skipped: boolean
  logs: LogEntry[]
}): boolean {
  if (input.completedAt) return false
  if (input.skipped) return false
  if (input.now < input.dueAt) return false
  if (input.logs.length >= MAX_REMINDERS) return false

  const mostRecent = input.logs.reduce<Date | null>((acc, l) => {
    if (!acc || l.sentAt > acc) return l.sentAt
    return acc
  }, null)
  if (mostRecent && differenceInDays(input.now, mostRecent) < MIN_DAYS_BETWEEN_REMINDERS) {
    return false
  }
  return true
}

export function nextReminderNumber(logs: LogEntry[]): 1 | 2 | 3 {
  const n = logs.length + 1
  if (n > 3) return 3
  return n as 1 | 2 | 3
}

interface ProcessResult {
  processed: number
  sent: number
  skipped: number
  errors: number
}

/**
 * Runs the daily follow-up reminder sweep.
 * Safe to call from a cron route — wraps errors per-row and logs aggregate to Sentry on failure.
 */
export async function processTreatmentFollowups(now: Date = new Date()): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, skipped: 0, errors: 0 }
  const supabase = createServiceRoleClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

  // Candidates: due, not completed, not skipped
  const { data: candidates, error: fetchErr } = await supabase
    .from("intake_followups")
    .select("id, intake_id, patient_id, subtype, milestone, due_at, completed_at, skipped")
    .is("completed_at", null)
    .eq("skipped", false)
    .lte("due_at", now.toISOString())
    .limit(500)

  if (fetchErr) {
    log.error("Failed to fetch candidates", { error: fetchErr.message })
    Sentry.captureException(fetchErr, { tags: { job: "treatment-followup" } })
    return result
  }

  if (!candidates || candidates.length === 0) return result

  result.processed = candidates.length

  for (const row of candidates) {
    try {
      // Fetch prior logs
      const { data: logs } = await supabase
        .from("followup_email_log")
        .select("sent_at")
        .eq("followup_id", row.id)
        .order("sent_at", { ascending: false })

      const logEntries: LogEntry[] = (logs ?? []).map((l) => ({ sentAt: new Date(l.sent_at) }))

      if (
        !shouldSendReminder({
          dueAt: new Date(row.due_at),
          now,
          completedAt: row.completed_at ? new Date(row.completed_at) : null,
          skipped: row.skipped,
          logs: logEntries,
        })
      ) {
        result.skipped += 1
        continue
      }

      // Fetch patient
      const { data: patient } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", row.patient_id)
        .single()

      if (!patient?.email) {
        log.warn("Skipping — no patient email", { followupId: row.id })
        result.skipped += 1
        continue
      }

      const subtype = row.subtype as FollowupSubtype
      const milestone = row.milestone as FollowupMilestone
      const reminderNumber = nextReminderNumber(logEntries)

      const sendResult = await sendEmail({
        to: patient.email,
        toName: patient.full_name || "Patient",
        subject: treatmentFollowupSubject(subtype, milestone),
        template: React.createElement(TreatmentFollowupEmail, {
          patientName: patient.full_name || "there",
          followupId: row.id,
          subtype,
          milestone,
          baseUrl,
        }),
        emailType: "treatment_followup",
        intakeId: row.intake_id,
        patientId: patient.id,
        metadata: { milestone, subtype, reminder_number: reminderNumber },
      })

      if (!sendResult?.success) {
        log.warn("Email send failed — will retry tomorrow", { followupId: row.id })
        result.errors += 1
        continue
      }

      // Log the send
      await supabase.from("followup_email_log").insert({
        followup_id: row.id,
        template: "treatment-followup",
        resend_message_id: sendResult.messageId ?? null,
        reminder_number: reminderNumber,
      })

      result.sent += 1
    } catch (err) {
      result.errors += 1
      Sentry.captureException(err, {
        tags: { job: "treatment-followup", followup_id: row.id },
      })
      log.error("Row failed", { followupId: row.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  log.info("Treatment followup sweep complete", result)
  return result
}
```

**Step 4: Run to verify pass**

Run: `pnpm test lib/__tests__/treatment-followup-processor.test.ts`
Expected: 10 passed (8 `shouldSendReminder` + 3 `nextReminderNumber`, actually 10 total — adjust if vitest counts differently).

**Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. If `sendEmail` return shape doesn't include `messageId`, inspect `lib/email/send-email.ts` and adjust — fall back to `null` if shape differs.

**Step 6: Commit**

```bash
git add lib/email/treatment-followup.ts lib/__tests__/treatment-followup-processor.test.ts
git commit -m "feat(followups): add treatment-followup cron processor"
```

---

## Task 6: Cron route handler

**Files:**
- Create: `app/api/cron/treatment-followup/route.ts`
- Modify: `vercel.json`

**Step 1: Write the cron route**

```ts
// app/api/cron/treatment-followup/route.ts
import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { processTreatmentFollowups } from "@/lib/email/treatment-followup"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest, acquireCronLock, releaseCronLock } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { toError } from "@/lib/errors"

export const dynamic = "force-dynamic"

const logger = createLogger("cron-treatment-followup")

/**
 * Daily cron — sends ED/hair-loss follow-up reminders for due check-ins.
 * Schedule: 09:00 AEST = 23:00 UTC previous day (no DST in NSW).
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const lock = await acquireCronLock("treatment-followup")
  if (!lock.acquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : "Already running",
    })
  }

  try {
    const result = await processTreatmentFollowups()
    logger.info("Cron: treatment-followup processed", result)
    await releaseCronLock("treatment-followup")
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: treatment-followup failed", { error: err.message })
    captureCronError(err, { jobName: "treatment-followup" })
    await releaseCronLock("treatment-followup")
    return NextResponse.json(
      { error: "Failed to process treatment followups" },
      { status: 500 },
    )
  }
}
```

**Step 2: Register in `vercel.json`**

Add a new entry to the `crons` array:

```json
{
  "path": "/api/cron/treatment-followup",
  "schedule": "0 23 * * *"
}
```

**Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

**Step 4: Local smoke test**

Start the dev server and curl the route with a valid `CRON_SECRET`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/treatment-followup
```

Expected: `{"success": true, "processed": 0, "sent": 0, ...}` (zero processed until real follow-up rows exist).

**Step 5: Commit**

```bash
git add app/api/cron/treatment-followup/route.ts vercel.json
git commit -m "feat(cron): register daily treatment-followup job"
```

---

## Task 7: Contraindication rationales + Tooltip wrapping in clinical-summary

Note: Phase 1 already extended `CONSULT_SUBTYPE_FIELDS` to include camelCase keys. Phase 3 adds visual rationale tooltips on safety-critical ones.

**Files:**
- Create: `lib/clinical/contraindication-rationales.ts`
- Test: `lib/__tests__/contraindication-rationales.test.ts`
- Modify: `components/doctor/clinical-summary.tsx`

**Step 1: Write the failing test**

```ts
// lib/__tests__/contraindication-rationales.test.ts
import { describe, it, expect } from "vitest"
import {
  getContraindicationRationale,
  getRationaleSeverity,
} from "@/lib/clinical/contraindication-rationales"

describe("getContraindicationRationale", () => {
  it("returns destructive-severity rationale for nitrate use when true", () => {
    const r = getContraindicationRationale("nitrates", true)
    expect(r).not.toBeNull()
    expect(r?.severity).toBe("destructive")
    expect(r?.text.toLowerCase()).toContain("nitrate")
  })

  it("returns null for nitrates when false", () => {
    expect(getContraindicationRationale("nitrates", false)).toBeNull()
  })

  it("returns destructive rationale for recentHeartEvent = true", () => {
    const r = getContraindicationRationale("recentHeartEvent", true)
    expect(r?.severity).toBe("destructive")
  })

  it("returns warning rationale for edHypertension = true", () => {
    const r = getContraindicationRationale("edHypertension", true)
    expect(r?.severity).toBe("warning")
  })

  it("returns null for unknown field", () => {
    expect(getContraindicationRationale("unknownField", true)).toBeNull()
  })
})

describe("getRationaleSeverity", () => {
  it("returns null for benign answers", () => {
    expect(getRationaleSeverity("edDuration", "6 months")).toBeNull()
  })
})
```

**Step 2: Run to verify fail**

Run: `pnpm test lib/__tests__/contraindication-rationales.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement**

```ts
// lib/clinical/contraindication-rationales.ts

/**
 * Doctor-portal decision support: rationale strings for safety-critical intake answers.
 * Keyed by the camelCase answer field name on the intake payload.
 *
 * Severity:
 *   - "destructive": hard clinical contraindication (absolute)
 *   - "warning":     relative contraindication or requires caution
 *
 * When these rationales render via Tooltip, they help the reviewing doctor
 * justify decline/caution decisions without needing to look up references.
 */

export type RationaleSeverity = "destructive" | "warning"

export interface Rationale {
  severity: RationaleSeverity
  text: string
}

type ValueMatcher = (value: unknown) => boolean

interface RationaleRule {
  severity: RationaleSeverity
  /** When this matcher returns true, the rationale applies */
  matches: ValueMatcher
  text: string
}

const TRUTHY: ValueMatcher = (v) => v === true || v === "true" || v === "yes"

const RATIONALES: Record<string, RationaleRule> = {
  // ED — absolute contraindications
  nitrates: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "This class of oral treatment is absolutely contraindicated with nitrates — combined use can cause life-threatening hypotension. Do not prescribe.",
  },
  recentHeartEvent: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "A cardiovascular event in the past 6 months is a hard contraindication. Cardiovascular status must be stabilised before any vasoactive treatment can be considered.",
  },
  severeHeartCondition: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "Severe or unstable cardiovascular disease precludes treatment. Decline and refer for cardiology review.",
  },

  // ED — relative contraindications
  edHypertension: {
    severity: "warning",
    matches: TRUTHY,
    text:
      "Uncontrolled hypertension (>170/100) is a relative contraindication. Confirm recent BP reading and consider decline until controlled.",
  },
  edDiabetes: {
    severity: "warning",
    matches: TRUTHY,
    text:
      "Uncontrolled diabetes warrants caution — poor glycaemic control is both a cause of ED and a risk factor. Consider requesting recent HbA1c.",
  },
  previousEdMeds: {
    severity: "warning",
    matches: (v) =>
      typeof v === "string" &&
      /serious (side )?effect|hospitalisation|emergency|reaction/i.test(v),
    text:
      "Patient reports a prior serious reaction to ED medication. Review the specific history before prescribing — consider a different molecule or decline.",
  },

  // Hair loss — future use (most hair-loss safety gates land with the intake rewrite)
  // Placeholders left empty intentionally — add as rename migrations land.
}

export function getContraindicationRationale(
  fieldName: string,
  value: unknown,
): Rationale | null {
  const rule = RATIONALES[fieldName]
  if (!rule) return null
  if (!rule.matches(value)) return null
  return { severity: rule.severity, text: rule.text }
}

export function getRationaleSeverity(
  fieldName: string,
  value: unknown,
): RationaleSeverity | null {
  return getContraindicationRationale(fieldName, value)?.severity ?? null
}
```

**Step 4: Run to verify pass**

Run: `pnpm test lib/__tests__/contraindication-rationales.test.ts`
Expected: 6 passed.

**Step 5: Wire into `clinical-summary.tsx`**

Open `components/doctor/clinical-summary.tsx`. At the top, import:

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, ShieldAlert } from "lucide-react"
import { getContraindicationRationale } from "@/lib/clinical/contraindication-rationales"
```

Inside the subtype render block (the one extended in Phase 1), find the per-field row. For each field, compute:

```tsx
const rationale = getContraindicationRationale(fieldName, value)
```

Then wrap the label (or the whole row) in a Tooltip ONLY when `rationale !== null`:

```tsx
{rationale ? (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2",
            rationale.severity === "destructive" && "text-destructive",
            rationale.severity === "warning" && "text-warning",
          )}
        >
          {rationale.severity === "destructive" ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>{fieldLabel}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left">
        <p className="text-xs leading-relaxed">{rationale.text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
) : (
  <span>{fieldLabel}</span>
)}
```

Keep existing badge/tone logic intact — this wraps the label specifically.

**Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

**Step 7: Commit**

```bash
git add lib/clinical/contraindication-rationales.ts \
        lib/__tests__/contraindication-rationales.test.ts \
        components/doctor/clinical-summary.tsx
git commit -m "feat(doctor): add contraindication tooltips to clinical summary"
```

---

## Task 8: Server actions — `getFollowup`, `submitFollowup`, `skipFollowup`

**Files:**
- Create: `app/actions/followups.ts`
- Test: `lib/__tests__/followups-actions-schema.test.ts`

**Step 1: Write the failing test (schema validation only — server action integration is E2E)**

```ts
// lib/__tests__/followups-actions-schema.test.ts
import { describe, it, expect } from "vitest"
import { submitFollowupSchema } from "@/app/actions/followups"

describe("submitFollowupSchema", () => {
  it("accepts valid payload", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "11111111-1111-1111-1111-111111111111",
      effectivenessRating: 4,
      sideEffectsReported: false,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 7,
      patientNotes: "Going well.",
    })
    expect(r.success).toBe(true)
  })

  it("rejects out-of-range rating", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "11111111-1111-1111-1111-111111111111",
      effectivenessRating: 6,
      sideEffectsReported: false,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 7,
      patientNotes: "",
    })
    expect(r.success).toBe(false)
  })

  it("requires sideEffectsNotes when sideEffectsReported is true", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "11111111-1111-1111-1111-111111111111",
      effectivenessRating: 3,
      sideEffectsReported: true,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 4,
      patientNotes: "",
    })
    expect(r.success).toBe(false)
  })

  it("rejects invalid UUID", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "not-a-uuid",
      effectivenessRating: 3,
      sideEffectsReported: false,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 4,
      patientNotes: "",
    })
    expect(r.success).toBe(false)
  })
})
```

**Step 2: Run to verify fail**

Run: `pnpm test lib/__tests__/followups-actions-schema.test.ts`
Expected: FAIL.

**Step 3: Implement server actions**

```ts
// app/actions/followups.ts
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import * as Sentry from "@sentry/nextjs"
import { requireRoleOrNull } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("followups-actions")

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const submitFollowupSchema = z
  .object({
    followupId: z.string().regex(UUID_REGEX, "Invalid followup ID"),
    effectivenessRating: z.number().int().min(1).max(5),
    sideEffectsReported: z.boolean(),
    sideEffectsNotes: z.string().max(2000),
    adherenceDaysPerWeek: z.number().int().min(0).max(7),
    patientNotes: z.string().max(2000),
  })
  .superRefine((data, ctx) => {
    if (data.sideEffectsReported && data.sideEffectsNotes.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sideEffectsNotes"],
        message: "Please describe the side effects.",
      })
    }
  })

export type SubmitFollowupInput = z.infer<typeof submitFollowupSchema>

interface ActionResult {
  success: boolean
  error?: string
}

export async function getFollowup(followupId: string) {
  if (!UUID_REGEX.test(followupId)) return null
  const auth = await requireRoleOrNull(["patient", "doctor", "admin"])
  if (!auth) return null

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intake_followups")
    .select("id, intake_id, patient_id, subtype, milestone, due_at, completed_at, skipped, effectiveness_rating, side_effects_reported, side_effects_notes, adherence_days_per_week, patient_notes")
    .eq("id", followupId)
    .single()

  if (error || !data) return null

  // Patient can only see their own
  if (auth.profile.role === "patient" && data.patient_id !== auth.profile.id) {
    return null
  }

  return data
}

export async function submitFollowup(
  input: SubmitFollowupInput,
): Promise<ActionResult> {
  const parsed = submitFollowupSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const auth = await requireRoleOrNull(["patient"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from("intake_followups")
    .select("id, patient_id, completed_at, intake_id")
    .eq("id", parsed.data.followupId)
    .single()

  if (!existing || existing.patient_id !== auth.profile.id) {
    return { success: false, error: "Not found" }
  }
  if (existing.completed_at) {
    return { success: false, error: "Already submitted" }
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from("intake_followups")
    .update({
      completed_at: now,
      effectiveness_rating: parsed.data.effectivenessRating,
      side_effects_reported: parsed.data.sideEffectsReported,
      side_effects_notes: parsed.data.sideEffectsNotes || null,
      adherence_days_per_week: parsed.data.adherenceDaysPerWeek,
      patient_notes: parsed.data.patientNotes || null,
    })
    .eq("id", parsed.data.followupId)

  if (updateErr) {
    log.error("Failed to submit followup", { error: updateErr.message })
    Sentry.captureException(updateErr, { tags: { action: "submit_followup" } })
    return { success: false, error: "Failed to save response" }
  }

  // Flag intake for doctor review if side effects or low rating
  if (parsed.data.sideEffectsReported || parsed.data.effectivenessRating <= 2) {
    try {
      await supabase
        .from("intakes")
        .update({ needs_followup_review: true, updated_at: now })
        .eq("id", existing.intake_id)
    } catch (err) {
      // Non-critical — do not block the submission
      log.warn("Failed to flag intake for review", { intakeId: existing.intake_id })
    }
  }

  revalidatePath("/patient")
  revalidatePath(`/patient/followups/${parsed.data.followupId}`)
  return { success: true }
}

export async function skipFollowup(followupId: string): Promise<ActionResult> {
  if (!UUID_REGEX.test(followupId)) {
    return { success: false, error: "Invalid followup ID" }
  }
  const auth = await requireRoleOrNull(["patient"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from("intake_followups")
    .select("id, patient_id")
    .eq("id", followupId)
    .single()

  if (!existing || existing.patient_id !== auth.profile.id) {
    return { success: false, error: "Not found" }
  }

  const { error } = await supabase
    .from("intake_followups")
    .update({ skipped: true, completed_at: new Date().toISOString() })
    .eq("id", followupId)

  if (error) {
    log.error("Failed to skip followup", { error: error.message })
    return { success: false, error: "Failed to update" }
  }

  revalidatePath("/patient")
  return { success: true }
}
```

**Note on `needs_followup_review`:** this is a flag column on `intakes`. If it doesn't exist yet, the update will no-op silently on a missing column but throw a real error. If the typecheck complains, add it via a tiny follow-on migration:

```sql
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS needs_followup_review boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_intakes_needs_followup_review
  ON public.intakes (needs_followup_review) WHERE needs_followup_review = true;
```

If you add this, bundle it into the same `20260410000001_followup_tracker.sql` migration from Task 1 — easier than shipping a separate one.

**Step 4: Run to verify pass**

Run: `pnpm test lib/__tests__/followups-actions-schema.test.ts`
Expected: 4 passed.

**Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. If `needs_followup_review` is missing from `types/db.ts` generated types, either amend Task 1's migration and regenerate types, or cast the update object.

**Step 6: Commit**

```bash
git add app/actions/followups.ts lib/__tests__/followups-actions-schema.test.ts
git commit -m "feat(followups): add submit/skip/get server actions"
```

---

## Task 9: Patient follow-up submission route

**Files:**
- Create: `app/patient/followups/[id]/page.tsx`
- Create: `app/patient/followups/[id]/followup-form.tsx`
- Create: `app/patient/followups/[id]/skip/route.ts`

**Step 1: Server page**

```tsx
// app/patient/followups/[id]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getFollowup } from "@/app/actions/followups"
import { FollowupForm } from "./followup-form"

export const metadata = { title: "Treatment check-in — InstantMed" }
export const dynamic = "force-dynamic"

export default async function PatientFollowupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const auth = await getAuthenticatedUserWithProfile()
  if (!auth) redirect(`/sign-in?redirect_url=/patient/followups/${id}`)

  const followup = await getFollowup(id)
  if (!followup) notFound()

  if (followup.completed_at) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-semibold mb-2">Thanks — we've got it</h1>
        <p className="text-muted-foreground">
          Your check-in was submitted. Your doctor will review it shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <FollowupForm
        followupId={followup.id}
        subtype={followup.subtype as "ed" | "hair_loss"}
        milestone={followup.milestone as "month_3" | "month_6" | "month_12"}
      />
    </div>
  )
}
```

**Step 2: Client form component**

```tsx
// app/patient/followups/[id]/followup-form.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { submitFollowup } from "@/app/actions/followups"

interface Props {
  followupId: string
  subtype: "ed" | "hair_loss"
  milestone: "month_3" | "month_6" | "month_12"
}

const MILESTONE_LABEL: Record<Props["milestone"], string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const RATING_LABELS = [
  { v: 1, label: "Not working" },
  { v: 2, label: "Barely" },
  { v: 3, label: "Somewhat" },
  { v: 4, label: "Working well" },
  { v: 5, label: "Very well" },
] as const

export function FollowupForm({ followupId, subtype, milestone }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rating, setRating] = useState<number>(0)
  const [sideEffects, setSideEffects] = useState(false)
  const [sideEffectsNotes, setSideEffectsNotes] = useState("")
  const [adherence, setAdherence] = useState<number>(7)
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error("Please rate how your treatment is working")
      return
    }
    if (sideEffects && sideEffectsNotes.trim().length === 0) {
      toast.error("Please describe the side effects")
      return
    }

    startTransition(async () => {
      const r = await submitFollowup({
        followupId,
        effectivenessRating: rating,
        sideEffectsReported: sideEffects,
        sideEffectsNotes,
        adherenceDaysPerWeek: adherence,
        patientNotes: notes,
      })
      if (r.success) {
        toast.success("Thanks — your doctor will review shortly")
        router.push("/patient")
      } else {
        toast.error(r.error || "Failed to save")
      }
    })
  }

  return (
    <Card className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
      <CardHeader>
        <CardTitle>Your {MILESTONE_LABEL[milestone]} check-in</CardTitle>
        <p className="text-sm text-muted-foreground">
          Takes about a minute. Your answers go straight to your doctor.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="mb-2 block">How's your treatment going overall?</Label>
            <RadioGroup
              value={rating.toString()}
              onValueChange={(v) => setRating(Number(v))}
              className="grid grid-cols-5 gap-2"
            >
              {RATING_LABELS.map((r) => (
                <div key={r.v} className="text-center">
                  <RadioGroupItem value={r.v.toString()} id={`r${r.v}`} className="mx-auto" />
                  <Label htmlFor={`r${r.v}`} className="text-xs mt-1 block">{r.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sfx">Any side effects?</Label>
              <Switch id="sfx" checked={sideEffects} onCheckedChange={setSideEffects} />
            </div>
            {sideEffects && (
              <Textarea
                className="mt-2"
                placeholder="Please describe briefly…"
                value={sideEffectsNotes}
                onChange={(e) => setSideEffectsNotes(e.target.value)}
                maxLength={2000}
              />
            )}
          </div>

          <div>
            <Label htmlFor="adherence">How many days per week are you using your treatment?</Label>
            <input
              id="adherence"
              type="range"
              min={0}
              max={7}
              value={adherence}
              onChange={(e) => setAdherence(Number(e.target.value))}
              className="w-full mt-2"
            />
            <div className="text-sm text-muted-foreground text-right">{adherence} days</div>
          </div>

          <div>
            <Label htmlFor="notes">Anything you want to tell the doctor? (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder="Optional — questions, observations, concerns…"
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Submitting…" : "Submit check-in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Skip route (called from email "skip" link)**

```ts
// app/patient/followups/[id]/skip/route.ts
import { NextRequest, NextResponse } from "next/server"
import { skipFollowup } from "@/app/actions/followups"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await skipFollowup(id)
  const url = new URL("/patient", process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au")
  url.searchParams.set("followup_skipped", result.success ? "1" : "0")
  return NextResponse.redirect(url)
}
```

**Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

**Step 5: Manual smoke test**

Start dev server, sign in as a test patient with an existing `intake_followups` row (insert manually via Supabase for now), visit `/patient/followups/<id>`, submit the form. Verify the row updates in the database.

**Step 6: Commit**

```bash
git add app/patient/followups/
git commit -m "feat(patient): add follow-up submission page and form"
```

---

## Task 10: Patient dashboard — follow-up progress card

**Files:**
- Create: `components/patient/followup-tracker-card.tsx`
- Modify: `app/patient/page.tsx` (fetch active follow-ups)
- Modify: `components/patient/panel-dashboard.tsx` (render card)

**Step 1: Create the card component**

```tsx
// components/patient/followup-tracker-card.tsx
import Link from "next/link"
import { differenceInDays, format } from "date-fns"
import { CheckCircle2, Circle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FollowupRow {
  id: string
  subtype: "ed" | "hair_loss"
  milestone: "month_3" | "month_6" | "month_12"
  due_at: string
  completed_at: string | null
  skipped: boolean
}

interface Props {
  followups: FollowupRow[]
}

const MILESTONE_LABEL: Record<FollowupRow["milestone"], string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const MILESTONE_ORDER: FollowupRow["milestone"][] = ["month_3", "month_6", "month_12"]

export function FollowupTrackerCard({ followups }: Props) {
  const active = followups.filter((f) => !f.skipped)
  if (active.length === 0) return null

  // Group by intake (take the most recent 3-row set)
  const nextDue = active.find((f) => !f.completed_at)
  if (!nextDue) return null // nothing to prompt

  const now = new Date()
  const dueAt = new Date(nextDue.due_at)
  const isDue = dueAt <= now
  const daysOverdue = isDue ? differenceInDays(now, dueAt) : 0
  const isOverdue = daysOverdue > 7

  const completedMilestones = new Set(
    active.filter((f) => f.completed_at).map((f) => f.milestone),
  )

  const subtypeLabel = nextDue.subtype === "ed" ? "your treatment" : "your hair-loss treatment"
  const milestoneLabel = MILESTONE_LABEL[nextDue.milestone]

  return (
    <Card
      className={cn(
        "bg-white dark:bg-card border shadow-md shadow-primary/[0.06]",
        isOverdue ? "border-amber-300 dark:border-amber-700" : "border-border/50",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {MILESTONE_ORDER.map((m) => {
                const done = completedMilestones.has(m)
                const current = m === nextDue.milestone
                return (
                  <div key={m} className="flex items-center gap-1">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : current ? (
                      <Clock className={cn("h-4 w-4", isDue ? "text-primary" : "text-muted-foreground")} />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                    <span className={cn("text-xs", current && "font-medium")}>
                      {MILESTONE_LABEL[m]}
                    </span>
                  </div>
                )
              })}
            </div>

            {isDue ? (
              <>
                <h3 className="font-semibold text-base mb-1">
                  Time for your {milestoneLabel} check-in
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A minute of your time helps your doctor make sure {subtypeLabel} is still working for you.
                </p>
                <Button asChild size="sm">
                  <Link href={`/patient/followups/${nextDue.id}`}>Share your update</Link>
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-base mb-1">
                  Next check-in: {milestoneLabel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  We'll reach out on {format(dueAt, "d MMM yyyy")} to see how you're going.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Fetch active follow-ups in `app/patient/page.tsx`**

Extend the `Promise.all` in `PatientDashboardContent` with a third promise:

```tsx
const [dashboardData, subscriptionData, followupData] = await Promise.all([
  getPatientDashboardData(patientId),
  // ...existing subscription block,
  (async () => {
    try {
      const { data } = await createServiceRoleClient()
        .from("intake_followups")
        .select("id, subtype, milestone, due_at, completed_at, skipped")
        .eq("patient_id", patientId)
        .eq("skipped", false)
        .order("due_at", { ascending: true })
      return data ?? []
    } catch {
      return []
    }
  })(),
])
```

Then pass `followups={followupData}` through to `PanelDashboard`.

**Step 3: Render in `panel-dashboard.tsx`**

Extend the props type, then render right before `{/* Subscription Card */}` at line ~203:

```tsx
import { FollowupTrackerCard, type FollowupRow } from "@/components/patient/followup-tracker-card"

// ...in props:
followups?: FollowupRow[]

// ...in JSX, above SubscriptionCard:
{followups && followups.length > 0 && <FollowupTrackerCard followups={followups} />}
```

**Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

**Step 5: Commit**

```bash
git add components/patient/followup-tracker-card.tsx \
        app/patient/page.tsx \
        components/patient/panel-dashboard.tsx
git commit -m "feat(patient): add follow-up progress card to dashboard"
```

---

## Task 11: Doctor portal — follow-up review surface

**Files:**
- Create: `app/doctor/intakes/[id]/intake-detail-followups.tsx`
- Modify: `app/doctor/intakes/[id]/page.tsx` (fetch followups)
- Modify: `app/doctor/intakes/[id]/intake-detail-client.tsx` (render card)
- Create: `app/actions/followups-doctor.ts` (mark-reviewed action)

**Step 1: Doctor mark-reviewed action**

```ts
// app/actions/followups-doctor.ts
"use server"

import { revalidatePath } from "next/cache"
import { requireRoleOrNull } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("followups-doctor")
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function markFollowupReviewed(
  followupId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(followupId)) return { success: false, error: "Invalid ID" }

  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()
  const { data: row, error: fetchErr } = await supabase
    .from("intake_followups")
    .select("id, intake_id")
    .eq("id", followupId)
    .single()

  if (fetchErr || !row) return { success: false, error: "Not found" }

  const { error } = await supabase
    .from("intake_followups")
    .update({
      doctor_reviewed_at: new Date().toISOString(),
      doctor_id: auth.profile.id,
    })
    .eq("id", followupId)

  if (error) {
    log.error("Failed to mark reviewed", { error: error.message })
    return { success: false, error: "Failed to update" }
  }

  revalidatePath(`/doctor/intakes/${row.intake_id}`)
  return { success: true }
}
```

**Step 2: Follow-ups review card**

```tsx
// app/doctor/intakes/[id]/intake-detail-followups.tsx
"use client"

import { useTransition } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { markFollowupReviewed } from "@/app/actions/followups-doctor"
import { cn } from "@/lib/utils"

export interface DoctorFollowupRow {
  id: string
  subtype: "ed" | "hair_loss"
  milestone: "month_3" | "month_6" | "month_12"
  due_at: string
  completed_at: string | null
  skipped: boolean
  effectiveness_rating: number | null
  side_effects_reported: boolean
  side_effects_notes: string | null
  adherence_days_per_week: number | null
  patient_notes: string | null
  doctor_reviewed_at: string | null
}

const MILESTONE_LABEL: Record<DoctorFollowupRow["milestone"], string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const RATING_LABEL: Record<number, string> = {
  1: "Not working",
  2: "Barely",
  3: "Somewhat",
  4: "Working well",
  5: "Very well",
}

export function IntakeDetailFollowups({ followups }: { followups: DoctorFollowupRow[] }) {
  const [isPending, startTransition] = useTransition()

  if (followups.length === 0) return null

  const handleMarkReviewed = (id: string) => {
    startTransition(async () => {
      const r = await markFollowupReviewed(id)
      if (r.success) toast.success("Marked reviewed")
      else toast.error(r.error || "Failed")
    })
  }

  return (
    <Card className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Follow-up check-ins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {followups.map((f) => {
          const submitted = !!f.completed_at && !f.skipped
          const lowRating = f.effectiveness_rating !== null && f.effectiveness_rating <= 2
          const flagged = f.side_effects_reported || lowRating
          const reviewed = !!f.doctor_reviewed_at

          if (!submitted) {
            return (
              <div
                key={f.id}
                className="p-3 rounded-lg border border-dashed border-border/40 text-sm text-muted-foreground"
              >
                {MILESTONE_LABEL[f.milestone]} — due {format(new Date(f.due_at), "d MMM yyyy")}
                {f.skipped && " (skipped)"}
              </div>
            )
          }

          return (
            <div
              key={f.id}
              className={cn(
                "p-4 rounded-lg border",
                flagged ? "border-amber-300 bg-amber-50/30" : "border-border/50 bg-muted/20",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {MILESTONE_LABEL[f.milestone]} check-in
                    </span>
                    {flagged && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Needs attention
                      </Badge>
                    )}
                    {reviewed && (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Reviewed
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {format(new Date(f.completed_at!), "d MMM yyyy")}
                  </div>
                </div>
                {!reviewed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkReviewed(f.id)}
                    disabled={isPending}
                  >
                    Mark reviewed
                  </Button>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Effectiveness</dt>
                  <dd className={cn(lowRating && "text-destructive font-medium")}>
                    {f.effectiveness_rating}/5 — {RATING_LABEL[f.effectiveness_rating ?? 0] ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Adherence</dt>
                  <dd>{f.adherence_days_per_week ?? "—"} days/week</dd>
                </div>
              </dl>

              {f.side_effects_reported && f.side_effects_notes && (
                <div className="mt-3 p-2 rounded bg-destructive-light border border-destructive-border">
                  <div className="text-xs text-destructive font-medium mb-1">Side effects reported</div>
                  <p className="text-sm">{f.side_effects_notes}</p>
                </div>
              )}

              {f.patient_notes && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Patient notes</div>
                  <p className="text-sm whitespace-pre-wrap">{f.patient_notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Fetch in the doctor page**

In `app/doctor/intakes/[id]/page.tsx`, after fetching the intake:

```tsx
// Phase 3: fetch follow-ups for ED/hair-loss consults
let followups: DoctorFollowupRow[] = []
const serviceTypeLocal = (intake.service as { type?: string } | undefined)?.type
if (serviceTypeLocal === "consults" && (intake.subtype === "ed" || intake.subtype === "hair_loss")) {
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("intake_followups")
    .select("id, subtype, milestone, due_at, completed_at, skipped, effectiveness_rating, side_effects_reported, side_effects_notes, adherence_days_per_week, patient_notes, doctor_reviewed_at")
    .eq("intake_id", id)
    .order("milestone", { ascending: true })
  followups = (data ?? []) as DoctorFollowupRow[]
}
```

Then pass `followups={followups}` to `IntakeDetailClient`.

**Step 4: Render in `intake-detail-client.tsx`**

Add the new prop and render `<IntakeDetailFollowups followups={followups} />` in an appropriate location in the client component (near clinical-summary/answers section).

**Step 5: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

**Step 6: Commit**

```bash
git add app/actions/followups-doctor.ts \
        app/doctor/intakes/\[id\]/intake-detail-followups.tsx \
        app/doctor/intakes/\[id\]/page.tsx \
        app/doctor/intakes/\[id\]/intake-detail-client.tsx
git commit -m "feat(doctor): add follow-up review card to intake detail"
```

---

## Task 12: Documentation updates

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `OPERATIONS.md`
- Modify: `SECURITY.md`
- Modify: `CLAUDE.md`

**Step 1: ARCHITECTURE.md**

Add `intake_followups` and `followup_email_log` to the Core Tables section. Add a short "Follow-up tracker" subsection under the relevant workflow area describing the approval-hook → cron → email → form → doctor-review loop.

**Step 2: OPERATIONS.md**

Add to the Cron Jobs Reference table:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/treatment-followup` | `0 23 * * *` (09:00 AEST) | Sends ED/hair-loss treatment follow-up reminder emails (max 3 per milestone, ≥3 days apart) |

**Step 3: SECURITY.md**

Under Table Policies, add rows for `intake_followups` and `followup_email_log`:

- `intake_followups`: patients read+update own rows; doctors/admins full access; email log service-role only.
- `storage.objects` bucket `intake-photos`: per-patient folder isolation via `storage.foldername(name)[1] = auth.uid()::text`.

Add `intake_followups` to the PHI inventory (contains patient-reported clinical state).

**Step 4: CLAUDE.md**

- Increment migration count from **194** to **195** in the Gotchas section ("Supabase migrations" bullet).
- Add to Key Workflows a short line under the ED/hair-loss specialty services entry: "Follow-up tracker creates 3/6/12-month check-ins on approval; cron at `/api/cron/treatment-followup` emails reminders; patients submit via `/patient/followups/[id]`; doctors review via new card on intake detail."

**Step 5: Commit**

```bash
git add ARCHITECTURE.md OPERATIONS.md SECURITY.md CLAUDE.md
git commit -m "docs: document Phase 3 follow-up tracker infrastructure"
```

---

## Task 13: End-to-end smoke test

**Goal:** Before merge, walk the full loop with a real intake on a dev database.

**Step 1:** Sign in as a test patient, submit a consult intake with `subtype=ed`.

**Step 2:** Sign in as a doctor, open the intake, add clinical notes (≥20 chars), click "Complete Consultation" (the `status = approved` button).

**Step 3:** Verify in Supabase: three rows in `intake_followups` for that intake with milestones `month_3`, `month_6`, `month_12` and correct `due_at` values.

**Step 4:** Temporarily backdate one row: `UPDATE intake_followups SET due_at = now() - interval '1 day' WHERE id = <id>;`

**Step 5:** Manually trigger the cron: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/treatment-followup`

**Step 6:** Verify response shows `sent: 1`. Check `followup_email_log` for the new row. Check Resend dashboard / inbox for the email.

**Step 7:** Click the email CTA, land on `/patient/followups/[id]`, fill in the form, submit. Verify:
- `intake_followups` row updated with `completed_at`, `effectiveness_rating`, etc.
- Patient dashboard progress card reflects the new state.
- If rating ≤ 2 or side effects reported: `intakes.needs_followup_review` flipped to `true`.

**Step 8:** Sign in as doctor, open the intake detail, verify the Follow-up check-ins card renders the submission and shows "Needs attention" if flagged. Click "Mark reviewed" and verify.

**Step 9:** Test the skip link: new test intake → approve → visit `/patient/followups/[id]/skip` → verify `skipped=true`.

**Step 10:** If anything in this walkthrough fails, fix and re-test the failing step only.

**Step 11: Commit any fixes**

```bash
git commit -m "fix(followups): <specific fix from smoke test>"
```

---

## Post-merge verification (production)

After deploying Phase 3:

1. **Monitor cron** — Check Vercel cron logs at 09:00 AEST the day after deploy. Should show `processed: 0, sent: 0` until real approvals happen.
2. **Monitor Sentry** — Watch for `treatment-followup` tagged errors in the first week.
3. **Track first real follow-up** — When the first ED/hair-loss consult gets approved post-deploy, verify three rows are created. Confirm email lands at the correct milestone months later (requires patience or the backdate-and-trigger trick in Task 13).

---

## File / test summary

### Created
- `supabase/migrations/20260410000001_followup_tracker.sql`
- `lib/data/followups.ts` + `lib/__tests__/followups.test.ts`
- `components/email/templates/treatment-followup.tsx` + `lib/__tests__/treatment-followup-email.test.tsx`
- `lib/email/treatment-followup.ts` + `lib/__tests__/treatment-followup-processor.test.ts`
- `app/api/cron/treatment-followup/route.ts`
- `lib/clinical/contraindication-rationales.ts` + `lib/__tests__/contraindication-rationales.test.ts`
- `app/actions/followups.ts` + `lib/__tests__/followups-actions-schema.test.ts`
- `app/actions/followups-doctor.ts`
- `app/patient/followups/[id]/page.tsx`
- `app/patient/followups/[id]/followup-form.tsx`
- `app/patient/followups/[id]/skip/route.ts`
- `components/patient/followup-tracker-card.tsx`
- `app/doctor/intakes/[id]/intake-detail-followups.tsx`

### Modified
- `app/doctor/queue/actions.ts` (follow-up creation hook in `updateStatusAction`)
- `components/email/templates/index.ts` (export new template)
- `components/doctor/clinical-summary.tsx` (Tooltip wrapping for safety-flagged rows)
- `app/patient/page.tsx` (fetch active follow-ups)
- `components/patient/panel-dashboard.tsx` (render new card)
- `app/doctor/intakes/[id]/page.tsx` (fetch follow-ups)
- `app/doctor/intakes/[id]/intake-detail-client.tsx` (render follow-up review card)
- `vercel.json` (new cron entry)
- `ARCHITECTURE.md`, `OPERATIONS.md`, `SECURITY.md`, `CLAUDE.md` (docs)

### Test count added
- `followups.test.ts` — 2 tests
- `treatment-followup-email.test.tsx` — 3 tests
- `treatment-followup-processor.test.ts` — 10 tests
- `contraindication-rationales.test.ts` — 6 tests
- `followups-actions-schema.test.ts` — 4 tests

Total: **25 new unit tests** covering the pure/schema logic. Integration and E2E happen via Task 13's smoke walkthrough.

---

## Out of scope (explicit)

Phase 3 ships the retention infrastructure shell. It does NOT include:

- IIEF-5 severity badge in the doctor portal (blocked on intake rewrite — see "Follow-up design doc" in the hardening design)
- Norwood thumbnail widgets (same)
- Photo upload inside the intake itself (deferred — the storage bucket is created now as infra, used only for follow-up photo uploads in Phase 3)
- Hair-loss follow-up photo upload UI (can land in Phase 3 if time permits, but the basic form text questions are what matter for doctor signal)
- A/B tests on the follow-up email copy
- Global unsubscribe / preference center (per-followup skip only, per Australian Spam Act minimum)
- Multi-language copy
