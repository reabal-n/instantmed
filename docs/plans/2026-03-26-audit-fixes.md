# Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply all 6 fixes identified in the 2026-03-26 platform audit.

**Architecture:** Targeted edits across 4 files — no new abstractions, no new dependencies. Each fix is self-contained.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres), Vitest

---

### Task 1: Fix doctor search — apply filter in SQL not JS

**Problem:** `app/api/search/route.ts` fetches the 20 most-recently-created intakes and then filters in JavaScript. Doctors searching for a patient who submitted earlier than the 20 most recent will get no results.

**Files:**
- Modify: `app/api/search/route.ts:65-99`

**Step 1: Understand the current query**

The `doctor`/`admin` variant runs:
```ts
const { data: intakes } = await supabase
  .from("intakes")
  .select(`id, status, created_at, patient:profiles!patient_id(id, full_name, medicare_number), category`)
  .order("created_at", { ascending: false })
  .limit(20)
```
Then loops and checks `patientData?.full_name?.toLowerCase().includes(query.toLowerCase())` in JS.

**Step 2: Replace with a database-level join + filter**

The fix joins `profiles` on `patient_id` and applies `.ilike()` in the DB query. Replace the intakes block (lines ~66–98) with:

```ts
// Apply search filter at the DB level — join profiles and filter by name or medicare
const { data: intakes } = await supabase
  .from("intakes")
  .select(`
    id,
    status,
    created_at,
    category,
    patient:profiles!patient_id (
      id,
      full_name,
      medicare_number
    )
  `)
  .or(
    `profiles.full_name.ilike.%${escapeIlike(query)}%,profiles.medicare_number.ilike.%${escapeIlike(query)}%`,
    { referencedTable: "profiles" }
  )
  .order("created_at", { ascending: false })
  .limit(20)

if (intakes) {
  for (const intake of intakes) {
    const patientRaw = intake.patient as unknown as { id: string; full_name: string; medicare_number?: string }[] | { id: string; full_name: string; medicare_number?: string } | null
    const patientData = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
    const serviceData = { name: intake.category || "Service", type: intake.category }
    results.push({
      id: intake.id,
      type: "intake",
      title: patientData?.full_name || "Unknown Patient",
      subtitle: serviceData?.name || "Service",
      status: intake.status,
      href: `/doctor/intakes/${intake.id}`,
    })
  }
}
```

Note: Supabase's `.or()` with `referencedTable` filters on the joined table. The `escapeIlike` helper is already defined in the file.

**Step 3: Run typecheck**

```bash
cd /Users/rey/Desktop/instantmed && pnpm typecheck
```
Expected: 0 errors.

**Step 4: Run existing tests**

```bash
cd /Users/rey/Desktop/instantmed && pnpm test
```
Expected: all pass (search route has no unit tests, but verify nothing is broken).

**Step 5: Commit**

```bash
git add app/api/search/route.ts
git commit -m "fix: apply doctor search filter at DB level, not in-memory JS"
```

---

### Task 2: Fix `doctorCount: 4` in social-proof constants

**Problem:** `lib/social-proof.ts` declares `doctorCount: 4` but CLAUDE.md states the platform currently operates with one doctor. Not publicly referenced yet, but incorrect.

**Files:**
- Modify: `lib/social-proof.ts:58`

**Step 1: Update the value**

Change:
```ts
doctorCount: 4,
```
To:
```ts
doctorCount: 1,
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add lib/social-proof.ts
git commit -m "fix: correct doctorCount to 1 (platform currently operates with one doctor)"
```

---

### Task 3: Remove medication pages from sitemap

**Problem:** `app/sitemap.ts` lists 24 medication slugs under `/medications/[slug]`, but `next.config.mjs` 301-redirects all `/medications/*` to `/`. This wastes crawl budget and gives Google a weak signal against the homepage.

**Files:**
- Modify: `app/sitemap.ts:214-239` (medicationSlugs array and its route generation)

**Step 1: Remove the medicationSlugs array and route generation**

Delete the following from `app/sitemap.ts`:
- The `medicationSlugs` array (lines ~214–239)
- The `medicationRoutes` mapping (lines ~335–339)
- The `...medicationRoutes` spread in the return array (line ~359)

**Step 2: Verify sitemap still builds**

```bash
pnpm build 2>&1 | tail -20
```
Expected: build succeeds with 0 errors.

**Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "fix: remove medication routes from sitemap (all redirect to homepage)"
```

---

### Task 4: Remove empty redirect pages from sitemap service pages list

**Problem:** `app/sitemap.ts` includes `/performance-anxiety`, `/womens-health`, `/mens-health` in `servicePages`. These are empty redirects (per CLAUDE.md) and should not be indexed.

**Files:**
- Modify: `app/sitemap.ts` (servicePages array, lines ~48–69)

**Step 1: Remove the three stubs from servicePages**

Remove these three entries from the `servicePages` array:
```ts
"/performance-anxiety",
"/womens-health",  // keep this if it's a real page
"/mens-health",
```

Check CLAUDE.md: all three are listed as "Empty redirect — Skip (not implemented)". Remove all three.

**Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -20
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "fix: remove unimplemented redirect pages from sitemap"
```

---

### Task 5: Resolve stale "LEGACY" comment in notifications route

**Problem:** `app/api/notifications/send/route.ts:1` has `// LEGACY: retained pending external dependency audit`. This comment is stale and ambiguous — it signals the route needs review but nothing ever happened.

**Files:**
- Modify: `app/api/notifications/send/route.ts:1`

**Step 1: Determine if the route is still called by anything**

```bash
grep -r "notifications/send" /Users/rey/Desktop/instantmed/app /Users/rey/Desktop/instantmed/lib --include="*.ts" --include="*.tsx" -l
```

If callers exist → route is live, just remove the stale comment.
If no callers → route is dead, note this and remove the comment (or flag for deletion separately).

**Step 2: Remove the stale comment**

Replace:
```ts
// LEGACY: retained pending external dependency audit (requires INTERNAL_API_SECRET)
```
With nothing (just delete the line).

**Step 3: Commit**

```bash
git add app/api/notifications/send/route.ts
git commit -m "chore: remove stale LEGACY comment from notifications/send route"
```

---

### Task 6: Add CSP Report-Only header for violation monitoring

**Problem:** The production CSP uses `'unsafe-inline'` for scripts (required for Clerk/GTM). There's no visibility into what would break if we ever tightened it. A `Content-Security-Policy-Report-Only` header with a stricter policy reports violations without blocking anything.

**Files:**
- Modify: `next.config.mjs:230-241` (headers return array, the `/(.*)`  block)

**Step 1: Add a report-only CSP**

In the `/(.*)`  headers block, after the existing `Content-Security-Policy` header, add:

```js
{
  key: "Content-Security-Policy-Report-Only",
  value: [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au",
    "report-uri /api/csp-report",
  ].join("; ")
},
```

This is a stricter policy (no `unsafe-inline`) that will report violations to `/api/csp-report` (which doesn't need to exist for logging — browsers report and move on). It won't block anything.

**Step 2: Optionally create a stub CSP report endpoint**

If you want to log CSP violations to Sentry, create `app/api/csp-report/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    Sentry.captureMessage("CSP Violation", {
      level: "warning",
      extra: { report: body },
      tags: { source: "csp-report-only" },
    })
  } catch { /* ignore malformed reports */ }
  return new NextResponse(null, { status: 204 })
}
```

**Step 3: Run typecheck and build**

```bash
pnpm typecheck && pnpm build 2>&1 | tail -10
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add next.config.mjs app/api/csp-report/route.ts
git commit -m "feat: add CSP Report-Only header + violation reporting endpoint"
```

---

## Completion Checklist

- [ ] Task 1: Doctor search uses DB-level filtering
- [ ] Task 2: `doctorCount` corrected to 1
- [ ] Task 3: Medication routes removed from sitemap
- [ ] Task 4: Empty redirect pages removed from sitemap
- [ ] Task 5: Stale LEGACY comment removed
- [ ] Task 6: CSP Report-Only header added

**Final verification:**
```bash
pnpm typecheck && pnpm test && pnpm build
```
All should pass green.
