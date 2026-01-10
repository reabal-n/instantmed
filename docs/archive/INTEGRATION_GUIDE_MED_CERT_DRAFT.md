# Medical Certificate Draft Integration Guide

This document shows how to integrate the new draft model and template into the doctor approval flow.

## Current Architecture

```
Phase 1 (Current):
Doctor Request → PDF Factory → Generated Document → Patient Download

Phase 2 (New):
Doctor Request → Draft (editable) → PDF Template → Generated Document → Patient Download
```

## Integration Points

### 1. Doctor Approval Actions
**File:** `app/doctor/requests/[id]/document/actions.ts`

**Current Flow:** Direct PDF generation from request
**New Flow:** Generate from draft data

**Example Implementation:**
```typescript
import { renderMedicalCertificateToPdf } from "@/lib/documents/render-med-cert"
import { getAssetUrl } from "@/lib/assets/asset-urls"
import type { MedCertDraft } from "@/types/db"

export async function approveMedicalCertificateAction(
  requestId: string,
  draftId: string  // NEW: Pass draft ID
) {
  // 1. Validate approval preconditions
  await assertApprovalInvariants(requestId)

  // 2. Fetch the draft (contains doctor edits)
  const { data: draft, error } = await supabase
    .from("med_cert_drafts")
    .select("*")
    .eq("id", draftId)
    .single()

  if (error || !draft) throw new Error("Draft not found")

  // 3. Mark draft as issued
  await supabase
    .from("med_cert_drafts")
    .update({
      status: "issued",
      issued_at: new Date().toISOString(),
      issued_by: userId,  // Current doctor
    })
    .eq("id", draftId)

  // 4. Render PDF from draft (NEW)
  const logoUrl = getAssetUrl("logo")
  const pdfBuffer = await renderMedicalCertificateToPdf(draft, logoUrl)

  // 5. Store PDF and create generated document
  const { certId, size } = await generateMedCertPdfFactory({
    requestId,
    pdfBuffer,  // Use rendered PDF
    // ... other params
  })

  // 6. Link draft to request
  await supabase
    .from("med_cert_requests")
    .update({ certificate_id: draftId })
    .eq("id", requestId)

  return { certId, pdfSize: size }
}
```

### 2. Create Draft on Request Submission
**File:** `app/api/med-cert/submit/route.ts`

**Current:** Creates request directly
**New:** Create request + initial draft

**Example Implementation:**
```typescript
export async function POST(request: NextRequest) {
  // ... existing validation code

  // 1. Create med_cert_requests record
  const { data: requestData, error: requestError } = await supabase
    .from("med_cert_requests")
    .insert([{ /* request fields */ }])
    .select()
    .single()

  if (requestError) throw requestError

  // 2. Create initial draft with request data (NEW)
  const { data: draft, error: draftError } = await supabase
    .from("med_cert_drafts")
    .insert([{
      request_id: requestData.id,
      patient_full_name: patientData.fullName,
      patient_dob: patientData.dateOfBirth,
      certificate_type: formData.certificateType,  // "work" | "uni" | "carer"
      reason_summary: formData.reasonForAbsence,
      status: "draft",
      // Other fields use defaults from database
    }])
    .select()
    .single()

  if (draftError) throw draftError

  return NextResponse.json({
    requestId: requestData.id,
    draftId: draft.id,  // NEW: Return draft ID
  })
}
```

### 3. Doctor Edit Draft
**File:** `app/doctor/requests/[id]/page.tsx` or action

**New Endpoint Needed:**
```typescript
// app/api/doctor/med-cert-draft/[draftId]/route.ts

export async function PATCH(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  // 1. Verify doctor is authenticated
  const user = await auth()
  if (!user || user.unsafeMetadata?.type !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // 2. Parse request body
  const updates = await request.json()

  // 3. Update draft (RLS prevents patient access)
  const { data, error } = await supabase
    .from("med_cert_drafts")
    .update({
      patient_full_name: updates.patient_full_name,
      patient_dob: updates.patient_dob,
      date_from: updates.date_from,
      date_to: updates.date_to,
      certificate_type: updates.certificate_type,
      reason_summary: updates.reason_summary,
      // Note: doctor defaults typically not edited
    })
    .eq("id", params.draftId)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data)
}
```

### 4. API Decision Route
**File:** `app/api/med-cert/[id]/decision/route.ts`

**Current:** Generates PDF directly from request
**New:** Uses draft as source of truth

**Example Implementation:**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ... existing validation

  // 1. Fetch request with draft
  const { data: medCertRequest } = await supabase
    .from("med_cert_requests")
    .select(`
      *,
      certificate:med_cert_drafts(*)
    `)
    .eq("id", params.id)
    .single()

  if (!medCertRequest.certificate) {
    throw new Error("Draft not found for request")
  }

  const draft = medCertRequest.certificate[0] as MedCertDraft

  // 2. Mark draft as issued
  await supabase
    .from("med_cert_drafts")
    .update({
      status: "issued",
      issued_at: new Date().toISOString(),
      issued_by: doctorId,
    })
    .eq("id", draft.id)

  // 3. Render PDF from draft
  const logoUrl = getAssetUrl("logo")
  const pdfBuffer = await renderMedicalCertificateToPdf(draft, logoUrl)

  // 4. Create generated document
  const { data: genDoc } = await createGeneratedDocument({
    mimeType: "application/pdf",
    size: pdfBuffer.length,
    bucket: "documents",
  })

  // 5. Upload PDF
  const uploadPath = `${params.id}/${draft.id}.pdf`
  await supabase.storage
    .from("documents")
    .upload(uploadPath, pdfBuffer)

  return NextResponse.json({ success: true, documentId: genDoc.id })
}
```

## Database Relationships

### med_cert_requests → med_cert_drafts

```typescript
// Updated med_cert_requests schema
interface MedCertRequest {
  id: string
  patient_id: string
  certificate_type: "work" | "uni" | "carer"
  // ... existing fields
  certificate_id: string  // NEW: FK to med_cert_drafts.id
}

// med_cert_drafts is referenced by certificate_id
interface MedCertDraft {
  id: string
  request_id: string  // FK back to med_cert_requests
  // ... all editable fields
  status: "draft" | "issued"
  issued_by: string  // Doctor who approved
}
```

### Query Pattern: Get Request with Draft

```typescript
// TypeScript/Supabase
const { data } = await supabase
  .from("med_cert_requests")
  .select(`
    *,
    draft:certificate_id(*)  // LEFT JOIN to draft
  `)
  .eq("id", requestId)
  .single()

// Access draft
const draft = data.draft as MedCertDraft
```

## RLS (Row-Level Security) Policies

The migration creates these policies automatically:

```sql
-- Doctors can view drafts for their patients
CREATE POLICY "Doctors can view drafts"
  ON med_cert_drafts FOR SELECT
  USING (
    auth.jwt() ->> 'custom_claims.type' = 'doctor'
  );

-- Doctors can insert new drafts
CREATE POLICY "Doctors can insert drafts"
  ON med_cert_drafts FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'custom_claims.type' = 'doctor'
  );

-- Doctors can update drafts
CREATE POLICY "Doctors can update drafts"
  ON med_cert_drafts FOR UPDATE
  USING (
    auth.jwt() ->> 'custom_claims.type' = 'doctor'
  )
  WITH CHECK (
    auth.jwt() ->> 'custom_claims.type' = 'doctor'
  );

-- Patients CANNOT view drafts
CREATE POLICY "Patients cannot view drafts"
  ON med_cert_drafts FOR SELECT
  USING (false);
```

## Testing Integration

### 1. Test Draft Creation
```typescript
const supabase = createClient()
const { data: draft } = await supabase
  .from("med_cert_drafts")
  .insert([{
    request_id: "req-123",
    patient_full_name: "John Doe",
    patient_dob: "1990-01-01",
    date_from: "2024-01-15",
    date_to: "2024-01-22",
    certificate_type: "work",
    reason_summary: "Acute illness",
    status: "draft",
  }])
  .select()
  .single()
```

### 2. Test PDF Rendering
```typescript
import { renderMedicalCertificateToPdf } from "@/lib/documents/render-med-cert"

const pdfBuffer = await renderMedicalCertificateToPdf(
  draft as MedCertDraft,
  "http://localhost:3000/logos/instantmed-logo.png"
)

// Verify it's a valid PDF
console.assert(pdfBuffer.length > 0, "PDF buffer is empty")
console.assert(pdfBuffer[0] === 0x25, "PDF signature invalid")  // PDF starts with %
```

### 3. Test RLS
```typescript
// As doctor: Should see draft
const { data: doctorView } = await doctorSupabase
  .from("med_cert_drafts")
  .select("*")

// As patient: Should see nothing
const { data: patientView } = await patientSupabase
  .from("med_cert_drafts")
  .select("*")

console.assert(doctorView.length > 0, "Doctor should see drafts")
console.assert(patientView.length === 0, "Patient should not see drafts")
```

## Error Handling

### Common Scenarios

```typescript
// 1. Draft not found
try {
  const draft = await getDraft(draftId)
} catch (error) {
  if (error.code === "PGRST116") {  // Not found
    return errorResponse("Draft not found", 404)
  }
}

// 2. Doctor not authorized (RLS will reject)
try {
  await patientSupabase
    .from("med_cert_drafts")
    .insert([{ /* ... */ }])
} catch (error) {
  if (error.code === "PGRST301") {  // Permission denied
    return errorResponse("Unauthorized", 403)
  }
}

// 3. PDF rendering failure
try {
  const buffer = await renderMedicalCertificateToPdf(draft, logoUrl)
} catch (error) {
  logger.error("PDF render failed", { draftId: draft.id, error })
  return errorResponse("Failed to generate certificate", 500)
}
```

## Data Validation

### Draft Fields Validation

```typescript
import { MedCertDraftInsert } from "@/types/db"
import { z } from "zod"

const MedCertDraftSchema = z.object({
  request_id: z.string().uuid(),
  patient_full_name: z.string().min(1).max(255),
  patient_dob: z.string().date(),                    // YYYY-MM-DD
  date_from: z.string().date(),
  date_to: z.string().date(),
  certificate_type: z.enum(["work", "uni", "carer"]),
  reason_summary: z.string().max(500),
})

// Usage
const validated = MedCertDraftSchema.parse(inputData)
const inserted = await supabase
  .from("med_cert_drafts")
  .insert([validated])
```

## Migration Checklist

- [ ] Run SQL migration on Supabase: `scripts/024_med_cert_drafts.sql`
- [ ] Verify RLS policies are active
- [ ] Update med_cert_requests table (add certificate_id column if needed)
- [ ] Implement draft creation endpoint
- [ ] Implement draft update endpoint
- [ ] Update doctor approval flow to use drafts
- [ ] Update API decision route to use drafts
- [ ] Test doctor edits → PDF generation flow
- [ ] Test patient cannot access drafts (RLS)
- [ ] Remove test route (`/api/test/med-cert-render`) before production
- [ ] Deploy to staging for integration testing
- [ ] Deploy to production
