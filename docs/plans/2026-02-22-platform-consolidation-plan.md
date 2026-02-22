# Platform Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken PostHog analytics into one canonical pathway, drop 1 dead Supabase table, verify patient dashboard, reconcile analytics code.

**Architecture:** PostHog cleanup via MCP tools (delete dashboards, rebuild funnel, create insights). Supabase cleanup via migration. Analytics code reconciliation via file edits. Patient dashboard verified via code review + dev server.

**Tech Stack:** PostHog MCP, Supabase MCP, Next.js, TypeScript

**Design corrections from deeper audit:**
- `documents` table is NOT dead (62 code references — it's a Supabase Storage bucket for certificates). DO NOT DROP.
- `audit_events` table is actively used by repeat-rx flow (4 references). DO NOT DROP.
- Template table merge adds risk for minimal value (different schemas: `requires_note` vs `message_template`). SKIP.
- Only `med_cert_audit_events` is truly dead (0 rows, 0 code references).
- 4 analytics systems exist, only 2 are wired up (request-flow direct PostHog + posthog-server.ts). The other 2 are orphaned.

---

## Task 1: Delete Broken PostHog Dashboards

**Files:** None (PostHog MCP operations only)

**Step 1: Delete sample dashboard**

Use `mcp__posthog__dashboard-delete` with dashboardId: 969687 ("My App Dashboard" — auto-generated sample, all insights are `is_sample: true`).

**Step 2: Delete "Analytics basics" v1**

Use `mcp__posthog__dashboard-delete` with dashboardId: 971161. This dashboard tracks events that have never been emitted: `checkout_started`, `payment_success_viewed`, `med_cert_type_selected`, etc.

**Step 3: Delete "Analytics basics" v2**

Use `mcp__posthog__dashboard-delete` with dashboardId: 971238. Same problem — tracks `questionnaire_completed`, `checkout_initiated`, `payment_success` which don't exist.

**Step 4: Delete orphaned sample insight**

Use `mcp__posthog__insight-delete` with insightId: "w764C1Ub" (sample "Referring domain" insight not on any dashboard).

**Step 5: Verify only Admin Dashboard remains**

Use `mcp__posthog__dashboards-get-all` and confirm only dashboard 1189881 ("InstantMed Admin Dashboard") exists.

---

## Task 2: Rebuild Admin Dashboard — Canonical Funnel

**Files:** None (PostHog MCP operations only)

**Step 1: Delete the broken funnel insight**

Use `mcp__posthog__insight-delete` with insightId: "36PFBHu5". This funnel uses stale `intake_step_completed` event (stopped firing Jan 15).

**Step 2: Create the canonical 6-step funnel**

Use `mcp__posthog__query-run` to test the funnel query first:

```json
{
  "kind": "InsightVizNode",
  "source": {
    "kind": "FunnelsQuery",
    "series": [
      { "kind": "EventsNode", "event": "$pageview", "custom_name": "Visitor" },
      { "kind": "EventsNode", "event": "service_selected", "custom_name": "Service Selected" },
      { "kind": "EventsNode", "event": "request_step_completed", "custom_name": "Form Completed" },
      { "kind": "EventsNode", "event": "intake_funnel_payment_completed", "custom_name": "Payment Completed" },
      { "kind": "EventsNode", "event": "intake_funnel_approved", "custom_name": "Doctor Approved" },
      { "kind": "EventsNode", "event": "intake_funnel_document_delivered", "custom_name": "Document Delivered" }
    ],
    "funnelWindowInterval": 30,
    "funnelWindowIntervalUnit": "day",
    "funnelOrderType": "ordered",
    "dateRange": { "date_from": "-30d" },
    "filterTestAccounts": true
  }
}
```

**Step 3: Save as insight and add to dashboard**

Use `mcp__posthog__insight-create-from-query` with name "Patient Conversion Funnel" and the query from step 2.
Then use `mcp__posthog__add-insight-to-dashboard` to add it to dashboard 1189881.

---

## Task 3: Add New Insights to Admin Dashboard

**Files:** None (PostHog MCP operations only)

**Step 1: Create "Safety Evaluation Outcomes" trend**

Test then create:
```json
{
  "kind": "InsightVizNode",
  "source": {
    "kind": "TrendsQuery",
    "series": [
      { "kind": "EventsNode", "event": "safety_evaluation_completed", "custom_name": "Safety Evaluations", "math": "total" }
    ],
    "breakdownFilter": { "breakdowns": [{ "property": "outcome", "type": "event" }] },
    "interval": "day",
    "dateRange": { "date_from": "-30d" },
    "filterTestAccounts": true
  }
}
```

Name: "Safety Evaluation Outcomes"

**Step 2: Create "Request Flow Drop-off" trend**

```json
{
  "kind": "InsightVizNode",
  "source": {
    "kind": "TrendsQuery",
    "series": [
      { "kind": "EventsNode", "event": "request_flow_exited", "custom_name": "Flow Exits", "math": "total" }
    ],
    "breakdownFilter": { "breakdowns": [{ "property": "step_id", "type": "event" }] },
    "interval": "week",
    "dateRange": { "date_from": "-30d" },
    "filterTestAccounts": true
  }
}
```

Name: "Request Flow Drop-off by Step"

**Step 3: Create "SLA Breaches" trend**

```json
{
  "kind": "InsightVizNode",
  "source": {
    "kind": "TrendsQuery",
    "series": [
      { "kind": "EventsNode", "event": "business_alert_sla_breach", "custom_name": "SLA Breaches", "math": "total" }
    ],
    "interval": "day",
    "dateRange": { "date_from": "-30d" },
    "filterTestAccounts": true
  }
}
```

Name: "SLA Breaches"

**Step 4: Create "Referring Domains" trend**

```json
{
  "kind": "InsightVizNode",
  "source": {
    "kind": "TrendsQuery",
    "series": [
      { "kind": "EventsNode", "event": "$pageview", "custom_name": "Pageviews", "math": "unique_session" }
    ],
    "breakdownFilter": { "breakdowns": [{ "property": "$referring_domain", "type": "event" }] },
    "interval": "week",
    "dateRange": { "date_from": "-30d" },
    "filterTestAccounts": true
  }
}
```

Name: "Traffic by Referring Domain"

**Step 5: Add all 4 new insights to Admin Dashboard**

Use `mcp__posthog__add-insight-to-dashboard` for each insight → dashboard 1189881.

---

## Task 4: Enable filterTestAccounts on Existing Insights

**Files:** None (PostHog MCP operations only)

**Step 1: Get current Admin Dashboard tiles**

Use `mcp__posthog__dashboard-get` with dashboardId: 1189881 to list all tile insight IDs.

**Step 2: Update each existing insight to enable filterTestAccounts**

For each insight that has `filterTestAccounts: false` or missing, use `mcp__posthog__insight-update` to set `filterTestAccounts: true` in its query source.

Insights to update (from audit): lGJObSTG (Daily Traffic), iXihpd25 (Service Breakdown), 6RF8sXbR (Errors & Exceptions).

**Step 3: Verify**

Re-fetch dashboard and confirm all insights now have `filterTestAccounts: true`.

---

## Task 5: Drop Dead Supabase Table

**Files:** Supabase migration only

**Step 1: Verify med_cert_audit_events has 0 rows and 0 code references**

Run: `SELECT count(*) FROM med_cert_audit_events;` via `mcp__supabase__execute_sql`
Run: `grep -r "med_cert_audit_events" /Users/rey/Desktop/instantmed --include="*.ts" --include="*.tsx"` (should return 0 results — already verified)

**Step 2: Drop the table**

Use `mcp__supabase__apply_migration`:
```sql
-- Drop med_cert_audit_events: 0 rows, 0 code references, superseded by audit_logs
DROP TABLE IF EXISTS public.med_cert_audit_events;
```

Migration name: `drop_dead_med_cert_audit_events`

**Step 3: Verify**

Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'med_cert_audit_events';`
Expected: empty result set.

---

## Task 6: Reconcile Analytics Code — Remove Orphaned Systems

**Files:**
- Delete: `hooks/use-intake-analytics.ts` (duplicate of `lib/hooks/use-intake-analytics.ts`, but neither is imported anywhere)
- Modify: `lib/analytics/conversion-events.ts:11-32` (update ConversionEvent type to match actual events)
- Review: `hooks/use-conversion-tracking.ts` (only imported by `patient-details-step.tsx`)
- Review: `lib/analytics/conversion-tracking.ts` (only imported by `use-conversion-tracking.ts`)
- Review: `lib/analytics/user-behavior-tracking.ts`

**Step 1: Verify which analytics files are actually imported**

Grep for imports of each file across the codebase. Map the dependency tree.

Known state from audit:
- `components/request/request-flow.tsx` → direct `posthog.capture()` calls (service_selected, request_step_viewed, request_step_completed, request_flow_exited)
- `components/request/service-hub-screen.tsx` → direct `posthog.capture()` for service_selected
- `lib/posthog-server.ts` → server-side tracking (intake_funnel_*, safety_*, business_alert_*)
- `hooks/use-conversion-tracking.ts` → imported by `patient-details-step.tsx` only (GA4/Google Ads tracking)
- `lib/analytics/conversion-events.ts` → NOT imported by any file (completely orphaned)
- `hooks/use-intake-analytics.ts` → NOT imported (duplicate exists at `lib/hooks/use-intake-analytics.ts`)
- `lib/hooks/use-intake-analytics.ts` → exported from `lib/hooks/index.ts` but NOT used by any component

**Step 2: Delete fully orphaned files**

Delete `hooks/use-intake-analytics.ts` (duplicate, 0 imports).

**Step 3: Add deprecation comment to unused-but-potentially-useful files**

Add a comment to the top of `lib/analytics/conversion-events.ts`:
```typescript
/**
 * @deprecated This file is not imported anywhere. The request flow uses direct
 * posthog.capture() calls in request-flow.tsx and service-hub-screen.tsx.
 * Server-side tracking uses lib/posthog-server.ts.
 * Consider deleting this file or integrating it if GA4/Google Ads tracking is needed.
 */
```

Add a similar comment to `lib/hooks/use-intake-analytics.ts`:
```typescript
/**
 * @deprecated Exported from lib/hooks/index.ts but not used by any component.
 * The request flow tracks steps directly via posthog.capture() in request-flow.tsx.
 * Consider deleting or wiring this into the request flow if richer step timing is needed.
 */
```

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(analytics): remove orphaned intake analytics hook, mark unused tracking files as deprecated"
```

---

## Task 7: Verify Patient Dashboard Functionality

**Files:** All files under `app/patient/`

**Step 1: Check each patient route for compilation errors**

Run the dev server and navigate to each patient route. Check for:
- Server component errors
- Missing data fetches
- Empty state handling
- Broken links between pages

Routes to verify:
1. `/patient` — dashboard home
2. `/patient/intakes` — intake list
3. `/patient/intakes/[id]` — intake detail (use a real intake ID from Supabase)
4. `/patient/documents` — document list
5. `/patient/prescriptions` — prescription list
6. `/patient/payment-history` — payments
7. `/patient/messages` — messages
8. `/patient/health-profile` — health profile
9. `/patient/settings` — settings
10. `/patient/notifications` — notifications

**Step 2: Check Supabase queries**

For each patient page, verify the Supabase query works:
- Read each page.tsx and client.tsx to identify the data fetching pattern
- Run the underlying SQL queries against Supabase to confirm they work
- Check for missing RLS policies that would block patient access

**Step 3: Report findings**

Document any broken routes, missing data, or UX issues in a brief report.

---

## Task 8: Final Verification & Commit

**Step 1: Run the full build**

```bash
cd /Users/rey/Desktop/instantmed && npm run build
```

Expected: Clean build with no new errors.

**Step 2: Verify PostHog dashboard**

Use `mcp__posthog__dashboard-get` with dashboardId: 1189881 and confirm:
- Only 1 dashboard exists
- Canonical funnel has 6 steps with correct event names
- All insights have filterTestAccounts: true
- New tiles (safety, drop-off, SLA, referring) are present

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: platform consolidation — PostHog canonical funnel, dead table cleanup, analytics reconciliation"
```

---

## Summary of Changes

| Category | Action | Risk |
|---|---|---|
| PostHog | Delete 3 broken dashboards | None — they show no data |
| PostHog | Delete 1 orphaned insight | None — sample data |
| PostHog | Replace broken funnel with 6-step canonical | Low — new insight, old one deleted |
| PostHog | Add 4 new insights | None — additive |
| PostHog | Enable filterTestAccounts everywhere | Low — may reduce apparent numbers |
| Supabase | Drop `med_cert_audit_events` | None — 0 rows, 0 code refs |
| Code | Delete orphaned `hooks/use-intake-analytics.ts` | None — 0 imports |
| Code | Deprecation comments on unused analytics files | None — comments only |

## What We Explicitly Do NOT Touch
- `documents` table (62 code references — it's a Storage bucket)
- `audit_events` table (4 active references in repeat-rx flow)
- `decline_reason_templates` / `info_request_templates` (different schemas, not worth merging)
- `intakes` table (95 cols — separate refactoring project)
- Stripe products (need separate verification before archiving)
- Any table with data > 0 rows
