# Audit 2 Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four immediately actionable issues found in the second platform audit: duplicate cron email dispatch, patient name leaking in RSC payload, FAQList key collision warning, and a mislabeled rate limit bucket.

**Architecture:** All fixes are targeted and isolated — no shared dependencies between tasks. Task 1 is a config change (`vercel.json`). Tasks 2–4 are single-file edits. Task 5 is documentation only (no code).

**Tech Stack:** Next.js 15 App Router · Vercel Cron · Zustand · Supabase

---

## Audit Findings Summary

| # | Finding | File | Severity |
|---|---------|------|----------|
| F1 | Deprecated cron double-fires email dispatch every 10 min | `vercel.json` + `app/api/cron/process-email-retries/route.ts` | High |
| F2 | Patient `full_name` serialized into unauthenticated RSC payload | `app/track/[intakeId]/page.tsx` | Medium |
| F3 | FAQList grouped-mode `key={group.category}` → undefined keys | `components/ui/faq-list.tsx` | Low |
| F4 | Certificate download uses `"upload"` rate-limit bucket | `app/api/patient/certificates/[id]/download/route.ts` | Low |
| F5 | Medicare plaintext column removal — deadline 2026-06-01 | `lib/data/profiles.ts` + migration | Upcoming |

---

## Task 1: Remove deprecated cron from vercel.json

**Context:**
`/api/cron/process-email-retries` is marked DEPRECATED in its route file. It internally calls `processEmailDispatch()` — the same function called by the canonical `/api/cron/email-dispatcher` (every 5 min). Both are active in `vercel.json`. At every 10-minute mark, emails dispatch twice in quick succession.

**Files:**
- Modify: `vercel.json` (remove one cron entry)
- No test needed — vercel.json has no test coverage, but we verify manually

**Step 1: Open vercel.json and locate the entry**

```bash
grep -n "process-email-retries" vercel.json
```

Expected output: line number pointing to the entry.

**Step 2: Remove the deprecated cron entry**

Remove this block from `vercel.json`:
```json
{
  "path": "/api/cron/process-email-retries",
  "schedule": "*/10 * * * *"
},
```

The canonical email-dispatcher cron (every 5 min) remains:
```json
{
  "path": "/api/cron/email-dispatcher",
  "schedule": "*/5 * * * *"
}
```

**Step 3: Verify vercel.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"
```

Expected: `valid`

**Step 4: Add a comment to the route file clarifying it is dead**

In `app/api/cron/process-email-retries/route.ts`, update the file header comment to note that the Vercel cron registration has been removed:

```ts
/**
 * DEPRECATED + UNREGISTERED: This cron route is no longer registered in vercel.json.
 * The legacy email_retry_queue system has been replaced by email_outbox + dispatcher.
 * Canonical route: /api/cron/email-dispatcher (every 5 min)
 * Safe to delete this file if no external service is calling it directly.
 */
```

**Step 5: Commit**

```bash
git add vercel.json app/api/cron/process-email-retries/route.ts
git commit -m "fix: remove deprecated email-retries cron to prevent double email dispatch"
```

---

## Task 2: Remove patient full_name from unauthenticated tracking page

**Context:**
`/track/[intakeId]` is a public page (no auth check). The server component fetches `patient.full_name` via service-role and passes it as `intakeForClient`. Even though the JSX doesn't visibly render the name, it is serialized into the page's RSC hydration JSON — readable in page source. This is a PHI leak for any shared/forwarded tracking link.

The tracking client uses `intake.patient.id` for the Supabase realtime channel but doesn't display `full_name`.

**Files:**
- Modify: `app/track/[intakeId]/page.tsx` — remove `full_name` from select
- Modify: `app/track/[intakeId]/tracking-client.tsx` — remove `full_name` from the `Intake` type interface

**Step 1: Check that full_name is not used in tracking-client.tsx**

```bash
grep -n "full_name" app/track/\[intakeId\]/tracking-client.tsx
```

Expected: no matches (confirm it's unused in JSX).

**Step 2: Update the Supabase query in page.tsx**

In `app/track/[intakeId]/page.tsx`, the select currently reads:
```ts
patient:profiles!patient_id (
  full_name,
  id
)
```

Change to:
```ts
patient:profiles!patient_id (
  id
)
```

**Step 3: Update the Intake interface in tracking-client.tsx**

The `Intake` interface in `app/track/[intakeId]/tracking-client.tsx` currently has:
```ts
patient: {
  full_name: string
  id: string
}
```

Change to:
```ts
patient: {
  id: string
}
```

**Step 4: Run type check**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/track/\[intakeId\]/page.tsx app/track/\[intakeId\]/tracking-client.tsx
git commit -m "fix: remove patient full_name from unauthenticated tracking page RSC payload"
```

---

## Task 3: Fix FAQList grouped-mode key collision

**Context:**
`components/ui/faq-list.tsx` — in grouped mode, `key={group.category}` is used on each group's `<div>`. The `category` field is optional (`category?: string`). If any group omits `category`, React receives `key={undefined}` — which is treated as no key at all, producing the "Each child in a list should have a unique key prop" warning visible in the dev console.

**Files:**
- Modify: `components/ui/faq-list.tsx:108-109`

**Step 1: Check the current key usage in grouped mode**

In `components/ui/faq-list.tsx`, find the grouped render (around line 108):
```tsx
{groups.map((group, gi) => (
  <div key={group.category}>
```

**Step 2: Replace with index-based key**

Change to a string that's always defined:
```tsx
{groups.map((group, gi) => (
  <div key={gi}>
```

This is safe — the group order doesn't change at runtime, so index keys are stable here.

**Step 3: Run unit tests**

```bash
pnpm test -- --reporter=verbose 2>&1 | head -40
```

Expected: tests pass. FAQList doesn't have dedicated tests, but the build should confirm no type errors.

**Step 4: Verify dev console is clean**

Start the dev server and navigate to `/faq` (which uses FAQList in grouped mode). Confirm no "unique key prop" warning in the browser console.

**Step 5: Commit**

```bash
git add components/ui/faq-list.tsx
git commit -m "fix: use index key in FAQList grouped mode to prevent undefined key collision"
```

---

## Task 4: Fix certificate download rate-limit bucket label

**Context:**
`app/api/patient/certificates/[id]/download/route.ts:41` calls `applyRateLimit(request, "upload", profile.id)`. The `"upload"` bucket is semantically wrong for a download endpoint. This causes confusion in rate-limit dashboards and alert configuration. One-line fix.

**Files:**
- Modify: `app/api/patient/certificates/[id]/download/route.ts:41`

**Step 1: Find the rate limit call**

```bash
grep -n "applyRateLimit" app/api/patient/certificates/\[id\]/download/route.ts
```

Expected output shows the `"upload"` bucket on one line.

**Step 2: Check what buckets are defined**

```bash
grep -n '"download"\|"upload"\|"api"\|"sensitive"' lib/rate-limit/redis.ts | head -20
```

This tells you what valid bucket names exist. Use the appropriate one (`"download"` if it exists, otherwise `"api"`).

**Step 3: Update the bucket name**

Change:
```ts
const rateLimitResponse = await applyRateLimit(request, "upload", profile.id)
```

To (using whatever bucket name you found in step 2, preferring `"download"` > `"api"`):
```ts
const rateLimitResponse = await applyRateLimit(request, "download", profile.id)
```

If `"download"` doesn't exist as a defined bucket, use `"api"` — do NOT create a new bucket just for this.

**Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/api/patient/certificates/\[id\]/download/route.ts
git commit -m "fix: correct rate-limit bucket label on certificate download endpoint"
```

---

## Task 5: Document Medicare plaintext column removal checklist

**Context:**
`lib/data/profiles.ts:97` has a `TODO(security)` targeting 2026-06-01 to:
1. Drop the `medicare_number` plaintext column from `profiles`
2. Remove plaintext reads/writes in the file
3. Update Supabase RLS policies

The encrypted column (`medicare_number_encrypted`) has been live since launch. This task creates a tracking document so the deadline doesn't slip.

**Files:**
- Create: `docs/plans/2026-06-01-medicare-plaintext-removal.md`

**Step 1: Create the migration plan document**

```markdown
# Medicare Plaintext Column Removal

**Deadline:** 2026-06-01
**Status:** Pending
**Owner:** TBD

## Background

PHI encryption (AES-256-GCM) was added to the `profiles` table. Medicare number is stored
in both `medicare_number` (plaintext) and `medicare_number_encrypted` (encrypted) columns
for rollback safety. The encrypted column has been live since launch.

After the deadline, the plaintext column should be dropped to reduce PHI surface area.

## Pre-Removal Checklist

### 1. Verify encrypted column is populated

Run on production Supabase:
```sql
SELECT
  COUNT(*) as total_patients,
  COUNT(medicare_number) as has_plaintext,
  COUNT(medicare_number_encrypted) as has_encrypted,
  COUNT(CASE WHEN medicare_number IS NOT NULL AND medicare_number_encrypted IS NULL THEN 1 END) as plaintext_only
FROM profiles
WHERE role = 'patient' AND medicare_number IS NOT NULL;
```

Expected: `plaintext_only = 0` before proceeding.

### 2. Backfill any missing encrypted values

If `plaintext_only > 0`, run the backfill script (to be written) before dropping.

### 3. Code changes in `lib/data/profiles.ts`

Remove all reads/writes of `medicare_number` plaintext column:

- Remove `medicare_number` from all `.select()` calls
- Remove `encrypted.medicare_number_encrypted = encryptField(data.medicare_number)` dual-write
  (keep only the `_encrypted` write path)
- Remove `medicare_number` from `encryptProfilePhi` input type
- Update `decryptProfilePhi` to only read from `_encrypted` column

### 4. Check for any other plaintext reads

```bash
grep -rn "medicare_number" lib/ app/ --include="*.ts" --include="*.tsx" | grep -v "_encrypted"
```

Confirm zero results after code changes.

### 5. Migration

```sql
ALTER TABLE profiles DROP COLUMN medicare_number;
```

Run as a Supabase migration:
```bash
supabase migration new drop_plaintext_medicare_number
# Add the ALTER TABLE statement to the migration file
supabase db push
```

### 6. Update RLS policies

Check for any RLS policies that reference `medicare_number`:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
AND (qual LIKE '%medicare_number%' OR with_check LIKE '%medicare_number%');
```

Update any policies found to use `medicare_number_encrypted` instead.

### 7. Run full test suite

```bash
pnpm test && pnpm typecheck && pnpm build
```

### 8. Deploy and verify

After deployment, confirm no errors in Sentry related to missing `medicare_number` column.
```

**Step 2: Commit**

```bash
git add docs/plans/2026-06-01-medicare-plaintext-removal.md
git commit -m "docs: add medicare plaintext column removal checklist (deadline 2026-06-01)"
```

---

## Running Order

Execute tasks in this order — each is independent but the order minimises risk:

1. **Task 1** — Cron fix (highest blast radius: running email duplicates)
2. **Task 2** — Privacy fix (PHI leak, medium severity)
3. **Task 3** — FAQList key bug (low severity, quick win)
4. **Task 4** — Rate limit label (cosmetic, 1 line)
5. **Task 5** — Medicare checklist (documentation only)
