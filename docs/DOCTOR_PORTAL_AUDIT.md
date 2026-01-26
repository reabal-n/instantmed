# Doctor Portal Functionality & UX Audit

**Audited:** 2026-01-25  
**Scope:** `/doctor` routes, queue, intake detail, patients list, draft review, analytics  
**Status:** Complete

---

## 1. Route Inventory

| Route | Page File | Data Expectations | Auth |
|-------|-----------|-------------------|------|
| `/doctor` | `app/doctor/page.tsx` | Queue (paginated), monitoring stats, personal stats, SLA data, doctor identity | doctor/admin |
| `/doctor/queue` | `app/doctor/queue/page.tsx` | Redirects to `/doctor` | doctor/admin |
| `/doctor/dashboard` | `app/doctor/dashboard/page.tsx` | Redirects to `/doctor/queue` | doctor/admin |
| `/doctor/intakes/[id]` | `app/doctor/intakes/[id]/page.tsx` | `IntakeWithDetails`, patient history, AI drafts | doctor/admin |
| `/doctor/intakes/[id]/document` | `app/doctor/intakes/[id]/document/page.tsx` | `IntakeWithDetails`, med cert draft, existing document | doctor/admin |
| `/doctor/patients` | `app/doctor/patients/page.tsx` | All patients (capped at 100) | doctor/admin |
| `/doctor/analytics` | `app/doctor/analytics/page.tsx` | All intakes (no date filter!), payments | doctor/admin |
| `/doctor/repeat-rx/[id]` | `app/doctor/repeat-rx/[id]/page.tsx` | Repeat Rx request with patient | doctor/admin |
| `/doctor/settings/identity` | `app/doctor/settings/identity/page.tsx` | Doctor identity config | doctor/admin |
| `/doctor/admin` | `app/doctor/admin/page.tsx` | Admin dashboard (admin only) | admin |

---

## 2. Crash-on-Null Risks

### 2.1 LOW RISK — Handled with `notFound()`

| File | Pattern | Status |
|------|---------|--------|
| `intakes/[id]/page.tsx` | `if (!intake) notFound()` | ✅ Safe |
| `intakes/[id]/document/page.tsx` | `if (!intake) notFound()` | ✅ Safe |
| `repeat-rx/[id]/page.tsx` | Multiple `notFound()` guards | ✅ Safe |

### 2.2 MEDIUM RISK — Optional chaining without fallback UI

| File | Issue | Impact |
|------|-------|--------|
| `queue-client.tsx:593-594` | `intake.patient.full_name` accessed without null guard | Crash if patient join fails |
| `queue-client.tsx:641-672` | `intake.answers?.symptoms` cast without type guard | Potential undefined render |
| `intake-detail-client.tsx:144` | `intake.service as { type?: string }` cast | Crash if service is null |
| `analytics-page.tsx:20-31` | `allIntakes` used directly after potential error | Empty array fallback exists ✅ |

### 2.3 HIGH RISK — No protection

| File | Issue | Recommendation |
|------|-------|----------------|
| `patients-list-client.tsx:175` | `calculateAge(patient.date_of_birth)` — no null check on DOB | Add guard: `if (!patient.date_of_birth) return "N/A"` |
| `queue-client.tsx:593` | `intake.patient.full_name` — if patient relation is null, page crashes | Add null guard in query filter |

---

## 3. "Loads Too Much Data" Risks

### 3.1 HIGH RISK — Analytics page loads ALL intakes

```typescript
// app/doctor/analytics/page.tsx:20-31
const { data: allIntakes } = await supabase
  .from("intakes")
  .select(`...`)
  .order("created_at", { ascending: false })
  // ⚠️ NO LIMIT — fetches entire history
```

**Impact:** At 10k+ intakes, this will:
- Timeout on serverless (30s limit)
- Memory exhaustion
- Slow page load (5-10s+)

**Fix:** Add date range filter (default last 90 days) and pagination.

### 3.2 MEDIUM RISK — Patients list capped at 100

```typescript
// app/doctor/patients/page.tsx:14
.limit(100)
```

**Status:** Capped but no pagination UI. Doctors won't see patients beyond first 100.

**Fix:** Add pagination controls or search-first UX.

### 3.3 LOW RISK — Queue properly paginated

```typescript
// lib/data/intakes.ts:273
const pageSize = Math.min(options?.pageSize ?? 50, 100) // ✅ Capped
```

---

## 4. Missing Workflow Glue

### 4.1 Doctor Notes

| Location | Shows | Edits | After Approval |
|----------|-------|-------|----------------|
| `intake-detail-client.tsx:486-506` | ✅ Yes | ✅ Yes | Notes saved with intake |
| Queue preview | ❌ No | ❌ No | — |
| Patient history | ❌ No | ❌ No | — |

**Gap:** Doctor notes are **not visible** after case is approved. No audit trail view for previously reviewed cases.

**Recommendation:** Add "View completed notes" link in patient history or separate audit view.

### 4.2 Draft Status Surfacing

| Location | Draft Status | Draft Content |
|----------|--------------|---------------|
| Intake detail page | ✅ `DraftReviewPanel` shows | ✅ Yes |
| Queue list | ❌ No indicator | ❌ No |
| Patient history | ❌ No | ❌ No |

**Gap:** Queue doesn't show if AI drafts are ready. Doctor must open each case to check.

**Recommendation:** Add badge in queue: "AI draft ready" when `document_drafts.status = 'ready'`.

### 4.3 Approved Content Visibility

| Content Type | Where Stored | Where Shown Post-Approval |
|--------------|--------------|---------------------------|
| Clinical Note | `document_drafts.edited_content` | ❌ Nowhere after approval |
| Med Cert | `generated_documents` | ✅ Document builder shows "already generated" |
| Repeat Rx | N/A (external Parchment) | Parchment reference stored |

**Gap:** Approved clinical notes are not viewable after approval. No "View what I approved" functionality.

---

## 5. UX Risks

### 5.1 Cognitive Anchoring Mitigation (Good ✅)

```typescript
// draft-review-panel.tsx:604
const [isExpanded, setIsExpanded] = useState(false) // Collapsed by default
```

AI drafts are collapsed by default to encourage doctors to read patient answers first.

### 5.2 Safety Flag Acknowledgment (Good ✅)

```typescript
// intake-detail-client.tsx:248
if ((status === "approved") && hasRedFlags && !redFlagsAcknowledged) {
  // Block approval until acknowledged
}
```

### 5.3 Minimum Clinical Notes Requirement (Good ✅)

```typescript
// intake-detail-client.tsx:216
const MIN_CLINICAL_NOTES_LENGTH = 20
```

### 5.4 Stale Data Warning (Good ✅)

```typescript
// queue-client.tsx:437-461
{isStale && (
  <div role="alert">Queue may be out of date</div>
)}
```

### 5.5 Missing Loading States

| Component | Has Loading State |
|-----------|-------------------|
| `ChatTranscriptPanel` | ✅ Yes (spinner) |
| `DraftReviewPanel` | ✅ Yes |
| `QueueClient` patient history | ✅ Yes |
| `AnalyticsClient` | ❌ No — relies on SSR |
| `PatientsListClient` | ❌ No — relies on SSR |

---

## 6. Recommendations

### HIGH Priority

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | **Analytics loads all intakes** | `app/doctor/analytics/page.tsx` | Add default 90-day filter + pagination |
| 2 | **Null DOB crash in patients list** | `app/doctor/patients/patients-list-client.tsx:175` | Add null guard before `calculateAge()` |
| 3 | **Queue badge for AI draft ready** | `app/doctor/queue/queue-client.tsx` | Add `has_draft_ready` to queue query, show badge |

### MEDIUM Priority

| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | **Patients list has no pagination** | `app/doctor/patients/` | Add pagination UI or "load more" |
| 5 | **No visibility into approved clinical notes** | `components/doctor/` | Add "View approved note" in patient history |
| 6 | **Doctor notes not shown in queue preview** | `queue-client.tsx` | Add truncated note preview if exists |
| 7 | **Null service type crash** | `intake-detail-client.tsx:144` | Add `service?.type ?? "unknown"` fallback |

### LOW Priority

| # | Issue | File | Fix |
|---|-------|------|-----|
| 8 | **No skeleton loading for analytics** | `app/doctor/analytics/` | Add `loading.tsx` with skeleton charts |
| 9 | **Patient null check in queue** | `queue-client.tsx:593` | Filter already exists in query but add UI guard |
| 10 | **Draft staleness not shown in queue** | `queue-client.tsx` | Show "⚠️ Draft stale" if answers changed since generation |

---

## 7. Data Flow Summary

```
┌─────────────────┐
│  /doctor        │ ← getDoctorQueue() + getIntakeMonitoringStats() + getDoctorPersonalStats()
│  (Queue Page)   │
└────────┬────────┘
         │ Click case
         ▼
┌─────────────────┐
│  /doctor/       │ ← getIntakeWithDetails() + getPatientIntakes() + getAIDraftsForIntake()
│  intakes/[id]   │
└────────┬────────┘
         │ Approve (med_cert)
         ▼
┌─────────────────┐
│  /doctor/       │ ← getIntakeWithDetails() + getOrCreateMedCertDraftForIntake()
│  intakes/[id]/  │
│  document       │
└────────┬────────┘
         │ Generate & Approve
         ▼
┌─────────────────┐
│  generateMedCertPdfAndApproveAction()  │
│  → Updates intake status               │
│  → Creates generated_documents record  │
│  → Sends email notification            │
└─────────────────┘
```

---

## 8. Summary

| Area | Status | Risk Level |
|------|--------|------------|
| Route protection | ✅ All routes require doctor/admin | Low |
| Null handling | ⚠️ 2 crash risks identified | Medium |
| Data pagination | ⚠️ Analytics unbounded, patients capped | High |
| Draft workflow | ⚠️ Status not surfaced in queue | Medium |
| Doctor notes | ⚠️ Not visible post-approval | Medium |
| Safety features | ✅ Red flag ack, min notes, stale warnings | Low |

**Overall Assessment:** The doctor portal is functional with good safety features, but has scalability risks in analytics and patients list that will manifest at higher volume. Draft status visibility and post-approval note access are UX gaps that may frustrate doctors.
