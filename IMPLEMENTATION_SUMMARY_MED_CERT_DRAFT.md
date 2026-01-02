# Medical Certificate Draft & Template Implementation Summary

## Overview
Successfully implemented Phase 2 of the medical certificate system:
- Doctor-editable draft model with database schema and RLS
- Professional React-PDF template component
- Server-side rendering function
- Test route for verification

**Build Status:** ✅ PASSED (Compiled in 54s, 161/161 pages generated, 0 errors)

---

## Files Created

### 1. Database Migration: `scripts/024_med_cert_drafts.sql` (171 lines)
**Purpose:** Create `med_cert_drafts` table for doctor-editable medical certificates

**Schema:**
```sql
CREATE TABLE med_cert_drafts (
  id UUID PRIMARY KEY,
  request_id UUID UNIQUE (draft-only),        -- FK to med_cert_requests
  patient_full_name TEXT,                      -- Doctor-editable
  patient_dob DATE,                            -- Doctor-editable
  date_from DATE,                              -- Doctor-editable
  date_to DATE,                                -- Doctor-editable
  certificate_type TEXT (work|uni|carer),      -- Doctor-editable
  reason_summary TEXT,                         -- Doctor-editable
  doctor_typed_name TEXT (default),            -- Defaults to Dr Reabal Najjar
  doctor_ahpra TEXT (default),                 -- Defaults to MED0002576546
  provider_name TEXT (default),                -- Defaults to InstantMed
  provider_address TEXT (default),             -- Defaults to Level 12...
  signature_asset_url TEXT NULL,               -- Optional signature image URL
  status TEXT (draft|issued),                  -- Tracks current state
  issued_at TIMESTAMP,                         -- When doctor approved
  issued_by UUID,                              -- Which doctor approved
  created_at TIMESTAMP,
  updated_at TIMESTAMP (auto-updated)
)
```

**Features:**
- ✅ RLS policies: Doctors can view/insert/update, patients cannot access any operation
- ✅ Unique constraint: Only one draft per request (when status='draft')
- ✅ Indexes: request_id, status, created_at for query performance
- ✅ Trigger: Auto-updates `updated_at` on modifications
- ✅ FK constraint: Links to `med_cert_requests` via `request_id`
- ✅ Reverse FK: `med_cert_requests.certificate_id` -> `med_cert_drafts.id`

**Status:** Ready for migration to Supabase

---

### 2. TypeScript Types: `types/db.ts` (Updated)
**Purpose:** Add TypeScript definitions for new `med_cert_drafts` table

**Added Types:**
```typescript
type MedCertDraftStatus = "draft" | "issued"

interface MedCertDraft {
  id: string
  request_id: string
  patient_full_name: string | null
  patient_dob: string | null                    // ISO date string
  date_from: string | null                      // ISO date string
  date_to: string | null                        // ISO date string
  certificate_type: MedicalCertificateSubtype | null  // "work" | "uni" | "carer"
  reason_summary: string | null
  doctor_typed_name: string | null
  doctor_ahpra: string | null
  provider_name: string | null
  provider_address: string | null
  signature_asset_url: string | null
  status: MedCertDraftStatus
  issued_at: string | null                      // ISO timestamp
  issued_by: string | null                      // User ID (Clerk)
  created_at: string
  updated_at: string
}

type MedCertDraftInsert = Omit<MedCertDraft, "id" | "created_at" | "updated_at">
type MedCertDraftUpdate = Partial<Omit<MedCertDraft, "id" | "created_at" | "updated_at">>
```

**Status:** ✅ Integrated, compiles without errors

---

### 3. PDF Template Component: `lib/pdf/med-certificate-template.tsx` (430 lines)
**Purpose:** React-PDF component rendering professional A4 medical certificates

**Features:**
✅ **Hard Requirements Met:**
1. Header: InstantMed logo top-left, clean professional layout
2. Title: "Medical Certificate" with uppercase styling
3. Patient section: Name + DOB formatted as DD/MM/YYYY
4. Date range: "Period From" and "Period To" with visual emphasis
5. Certificate type-specific statement:
   - Work: "unfit for work from X to Y due to..."
   - Study (uni): "unfit to attend educational institutions from X to Y due to..."
   - Carer: "requires leave to provide care for family member due to..."
6. Reason summary: Italicized box showing reason for absence
7. Footer signature block:
   - Doctor's typed name (not scanned)
   - AHPRA number
   - Signature image (if available)
   - Provider name and address
8. No phone number, no "assessed via questionnaire"

✅ **Design Elements:**
- Professional color scheme (dark blue primary, cyan accent)
- A4 single-page layout with proper spacing
- Bordered sections and visual hierarchy
- Left-border accent on statement box
- Light gray background boxes for content sections
- Footer with disclaimer about Australian medical standards

✅ **Input:**
```typescript
{
  draft: MedCertDraft,
  logoUrl: string                    // Absolute URL to logo
}
```

✅ **Output:**
React-PDF Document component (renders to PDF via renderToBuffer)

**Status:** ✅ Compiles without errors, ready for production

---

### 4. Render Function: `lib/documents/render-med-cert.tsx` (58 lines)
**Purpose:** Server-side function to render medical certificate drafts to PDF buffers

**Exports:**
```typescript
async function renderMedicalCertificateToPdf(
  draft: MedCertDraft,
  logoUrl: string
): Promise<Buffer>

async function renderMedicalCertificatesToPdf(
  drafts: MedCertDraft[],
  logoUrl: string
): Promise<Buffer[]>                 // Batch rendering
```

**Features:**
- ✅ Full error handling with descriptive messages
- ✅ Input validation (logoUrl, patient name, certificate type)
- ✅ Batch rendering support for multiple certificates
- ✅ Integrates with MedicalCertificateTemplate component
- ✅ Uses @react-pdf/renderer for server-side rendering

**Status:** ✅ Compiles without errors, ready for integration

---

### 5. Test Route: `app/api/test/med-cert-render/route.ts` (80 lines)
**Purpose:** API endpoint to test and demonstrate certificate rendering

**Endpoint:** `GET /api/test/med-cert-render?type=work|uni|carer`

**Features:**
- ✅ Query parameter support for certificate type (defaults to "work")
- ✅ Sample draft data with realistic test values
- ✅ Returns PDF stream with proper headers
- ✅ Error handling with descriptive messages
- ✅ Cache control headers (no-cache for testing)

**Example Usage:**
```bash
# Render work certificate
curl http://localhost:3000/api/test/med-cert-render?type=work -o cert.pdf

# Render study certificate
curl http://localhost:3000/api/test/med-cert-render?type=uni -o cert.pdf

# Render carer's leave certificate
curl http://localhost:3000/api/test/med-cert-render?type=carer -o cert.pdf
```

**Sample Data Used:**
- Patient: Sarah Elizabeth Johnson, DOB: 1990-03-15
- Period: 2024-01-15 to 2024-01-22
- Reason: Acute respiratory infection with fever and fatigue
- Doctor: Dr Reabal Najjar (AHPRA: MED0002576546)
- Provider: InstantMed, Level 12, 1 Macquarie Place, Sydney NSW 2000

**Status:** ✅ Compiles without errors, ready for testing

---

## Architecture Overview

### Data Flow: Doctor Edit → Draft Storage → PDF Generation

```
Doctor Edit Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. Doctor views med cert request (med_cert_requests table)  │
│ 2. Doctor creates/updates draft (med_cert_drafts table)     │
│ 3. RLS: Only doctor can edit (Clerk auth)                   │
│ 4. Draft stores all editable fields with defaults           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PDF Generation:                                             │
│ 1. Doctor clicks "Approve"                                  │
│ 2. renderMedicalCertificateToPdf() called                   │
│ 3. MedicalCertificateTemplate renders with draft data       │
│ 4. PDF buffer generated and stored in documents table       │
│ 5. med_cert_drafts.status → "issued"                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Patient Portal:                                             │
│ 1. Patient views approved cert in /patient/requests         │
│ 2. Patient clicks "Download Certificate"                    │
│ 3. /api/patient/documents/[requestId]/download called       │
│ 4. PDF retrieved and streamed to patient                    │
│ (No email, portal-only delivery)                            │
└─────────────────────────────────────────────────────────────┘
```

### Doctor-Only Edit Security (RLS)

```sql
-- Doctors can view/insert/update
CREATE POLICY "Doctors can view drafts"
  ON med_cert_drafts FOR SELECT
  USING (auth.jwt() ->> 'custom_claims.type' = 'doctor')

-- Patients cannot access any operation
CREATE POLICY "Patients cannot view drafts"
  ON med_cert_drafts FOR SELECT
  USING (false)
```

---

## Integration Points

### 1. Doctor Approval Flow
**File:** `app/doctor/requests/[id]/document/actions.ts`

**Next Step:** Update to use `renderMedicalCertificateToPdf` + draft data
```typescript
// Future implementation
const pdfBuffer = await renderMedicalCertificateToPdf(draft, logoUrl)
await uploadPdfBuffer(pdfBuffer, { requestId, certificateId: draft.id })
```

### 2. API Decision Route
**File:** `app/api/med-cert/[id]/decision/route.ts`

**Next Step:** Load draft, render PDF, update status
```typescript
// Future implementation
const draft = await getDraftForRequest(requestId)
const pdfBuffer = await renderMedicalCertificateToPdf(draft, logoUrl)
await createGeneratedDocument(draft.id, pdfBuffer)
```

### 3. Patient Download
**File:** `app/api/patient/documents/[requestId]/download/route.ts`

**Already Implemented:** ✅ Can immediately serve rendered PDFs

---

## Requirements Verification

### User Requirements Met:

✅ **Doctor-editable Draft Model**
- Draft table with all specified fields
- Doctor-only access via RLS policies
- Status tracking (draft → issued)
- Patient cannot edit or view drafts

✅ **Portal-Only Delivery**
- Download endpoint already implemented
- No email sending in flow
- Patients download from patient portal

✅ **Medical Certificate Template**
- ✅ Logo + header
- ✅ Title: "Medical certificate"
- ✅ Patient name + DOB
- ✅ Date range (from/to)
- ✅ Certificate type-specific text (work/uni/carer)
- ✅ Reason summary section
- ✅ Signature block (name + AHPRA + signature image + address)
- ✅ NO phone number
- ✅ NO "assessed via questionnaire"
- ✅ A4 single-page layout

✅ **PDF Rendering**
- Server-side rendering with @react-pdf/renderer
- Async renderMedicalCertificateToPdf() function
- Batch rendering support
- Error handling with validation

---

## Database Migration Steps

### Required Actions:
1. Apply migration to Supabase:
   ```bash
   # Using Supabase CLI
   supabase db push scripts/024_med_cert_drafts.sql
   
   # Or manually copy/paste SQL into Supabase dashboard
   ```

2. Update med_cert_requests table (if not already done):
   ```sql
   ALTER TABLE med_cert_requests 
   ADD COLUMN IF NOT EXISTS certificate_id UUID REFERENCES med_cert_drafts(id);
   ```

3. Verify RLS policies are active and test with sample doctor account

### Verification Query:
```sql
-- Check draft creation works
INSERT INTO med_cert_drafts (
  request_id, patient_full_name, patient_dob, date_from, date_to,
  certificate_type, reason_summary, status
) VALUES (
  'req-123', 'Test Patient', '1990-01-01', '2024-01-15', '2024-01-22',
  'work', 'Test reason', 'draft'
);

-- Check RLS: Non-doctor should get empty result
SELECT * FROM med_cert_drafts WHERE request_id = 'req-123';
```

---

## Testing Instructions

### 1. Test Template Rendering (No Auth Required)
```bash
# Access test endpoint to render and download PDF
curl http://localhost:3000/api/test/med-cert-render?type=work \
  -o medical-certificate.pdf

# View PDF in browser
open medical-certificate.pdf
```

### 2. Test All Certificate Types
```bash
# Work certificate
curl http://localhost:3000/api/test/med-cert-render?type=work -o work.pdf

# Study/University certificate
curl http://localhost:3000/api/test/med-cert-render?type=uni -o uni.pdf

# Carer's leave certificate
curl http://localhost:3000/api/test/med-cert-render?type=carer -o carer.pdf
```

### 3. Verify PDF Content
- ✅ Check header has logo and InstantMed name
- ✅ Check title says "Medical Certificate"
- ✅ Verify patient name and DOB (DD/MM/YYYY format)
- ✅ Verify date range displays correctly
- ✅ Check certificate type statement matches type (work/uni/carer)
- ✅ Verify reason summary appears
- ✅ Check footer has doctor name, AHPRA number, provider address
- ✅ Confirm NO phone number present
- ✅ Confirm NO "assessed via questionnaire" text

---

## Build Status: ✅ PASSING

```
Build Output:
- Compilation: ✅ Complete in 54s
- TypeScript: ✅ All checks passed
- Pages: ✅ Generated 161/161
- ESLint: ✅ All rules satisfied
- Errors: 0
- Warnings: 1 (Sentry dependency, non-blocking)
```

---

## Next Steps (Post-Deployment)

### Phase 3: Integration
1. Run SQL migration on Supabase
2. Update doctor approval flow to use draft + render
3. Update API decision route to create drafts
4. Test end-to-end: Doctor edits → PDF generated → Patient downloads

### Phase 4: Polish
1. Remove test route (`/api/test/med-cert-render`) before production
2. Add database backup before migration
3. Load test with sample drafts
4. Verify signature image URLs are permanent (not temporary)

### Phase 5: Deployment
1. Deploy to production
2. Monitor PDF generation performance
3. Verify doctor-only RLS policies are enforced
4. Test patient portal download flow

---

## File Locations Summary

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `scripts/024_med_cert_drafts.sql` | 171 | ✅ Ready | DB migration |
| `types/db.ts` | +50 | ✅ Updated | TypeScript types |
| `lib/pdf/med-certificate-template.tsx` | 430 | ✅ Complete | PDF template |
| `lib/documents/render-med-cert.tsx` | 58 | ✅ Complete | Render function |
| `app/api/test/med-cert-render/route.ts` | 80 | ✅ Complete | Test endpoint |

**Total New Code:** ~789 lines (production) + 80 lines (test)
**Build Status:** ✅ PASSING (0 errors)
**Ready for:** Integration with doctor approval flow
