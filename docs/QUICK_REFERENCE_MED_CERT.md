# Medical Certificate Draft & Template - Quick Reference

## Files Created (5 total)

| File | Size | Status | Purpose |
|------|------|--------|---------|
| `scripts/024_med_cert_drafts.sql` | 171 lines | 🔵 Pending | DB migration - create `med_cert_drafts` table |
| `types/db.ts` | +50 lines | ✅ Complete | TypeScript types for MedCertDraft |
| `lib/pdf/med-certificate-template.tsx` | 430 lines | ✅ Complete | React-PDF template component |
| `lib/documents/render-med-cert.tsx` | 58 lines | ✅ Complete | Server-side render function |
| `app/api/test/med-cert-render/route.ts` | 80 lines | ✅ Complete | Test endpoint (remove before prod) |

## Database Schema (med_cert_drafts)

```
id (UUID, PK)
request_id (UUID, FK, UNIQUE when draft)
patient_full_name (TEXT, editable)
patient_dob (DATE, editable)
date_from (DATE, editable)
date_to (DATE, editable)
certificate_type (work|uni|carer, editable)
reason_summary (TEXT, editable)
doctor_typed_name (TEXT, default: [DOCTOR_NAME])
doctor_ahpra (TEXT, default: [AHPRA_NUMBER])
provider_name (TEXT, default: InstantMed)
provider_address (TEXT, default: [CLINIC_ADDRESS])
signature_asset_url (TEXT, optional)
status (draft|issued)
issued_at (TIMESTAMP)
issued_by (UUID, doctor who approved)
created_at (TIMESTAMP)
updated_at (TIMESTAMP, auto-updated)
```

## Key Components

### 1. Template: `MedicalCertificateTemplate`
```typescript
import { MedicalCertificateTemplate } from "@/lib/pdf/med-certificate-template"

// Render React-PDF document
<MedicalCertificateTemplate 
  draft={medCertDraft} 
  logoUrl="https://app.com/logo.png" 
/>
```

### 2. Render Function: `renderMedicalCertificateToPdf`
```typescript
import { renderMedicalCertificateToPdf } from "@/lib/documents/render-med-cert"

const buffer = await renderMedicalCertificateToPdf(draft, logoUrl)
// → Buffer (PDF binary)
```

### 3. Test Endpoint
```bash
# Test rendering (all types)
GET /api/test/med-cert-render?type=work
GET /api/test/med-cert-render?type=uni
GET /api/test/med-cert-render?type=carer
```

## TypeScript Types

```typescript
import type { MedCertDraft, MedCertDraftStatus } from "@/types/db"

type MedCertDraftStatus = "draft" | "issued"

interface MedCertDraft {
  id: string
  request_id: string
  patient_full_name: string | null
  patient_dob: string | null           // ISO date: YYYY-MM-DD
  date_from: string | null
  date_to: string | null
  certificate_type: "work" | "uni" | "carer" | null
  reason_summary: string | null
  doctor_typed_name: string | null
  doctor_ahpra: string | null
  provider_name: string | null
  provider_address: string | null
  signature_asset_url: string | null
  status: MedCertDraftStatus
  issued_at: string | null            // ISO timestamp
  issued_by: string | null            // Doctor's user ID
  created_at: string
  updated_at: string
}
```

## Template Features Checklist

- ✅ Logo (top-left)
- ✅ "Medical Certificate" title
- ✅ Patient name + DOB (DD/MM/YYYY)
- ✅ Date from/to
- ✅ Certificate type statement:
  - work: "unfit for work from X to Y due to..."
  - uni: "unfit to attend educational institutions from X to Y due to..."
  - carer: "requires leave to provide care... from X to Y due to..."
- ✅ Reason summary (italicized box)
- ✅ Doctor signature block (name + AHPRA + image + address)
- ✅ NO phone number
- ✅ NO "assessed via questionnaire"
- ✅ A4 single-page

## RLS Security

```sql
-- Doctors: Can view, insert, update
-- Patients: Cannot do any operation

-- Doctor-only access:
auth.jwt() ->> 'custom_claims.type' = 'doctor'
```

## Integration Checklist

- [ ] Apply migration: `scripts/024_med_cert_drafts.sql`
- [ ] Create draft endpoint: `POST /api/doctor/med-cert-draft`
- [ ] Create draft update endpoint: `PATCH /api/doctor/med-cert-draft/[draftId]`
- [ ] Update doctor approval flow to:
  1. Load draft
  2. Call `renderMedicalCertificateToPdf(draft, logoUrl)`
  3. Mark draft status = "issued"
  4. Store PDF in documents table
- [ ] Update API decision route similarly
- [ ] Test doctor edits → PDF matches edits
- [ ] Test patient cannot see drafts
- [ ] Remove test endpoint before production
- [ ] Deploy and verify RLS is enforced

## Quick Test

```bash
# 1. View rendered PDF locally
curl http://localhost:3000/api/test/med-cert-render?type=work \
  -o cert.pdf && open cert.pdf

# 2. Verify:
#    - InstantMed logo visible
#    - Title: "Medical Certificate"
#    - Date format: DD/MM/YYYY
#    - Reason: "Acute respiratory infection..."
#    - Doctor: [DOCTOR_NAME] [AHPRA_NUMBER]
#    - Provider: InstantMed [CLINIC_ADDRESS]
#    - NO phone number
#    - A4 single page
```

## File Dependencies

```
med-certificate-template.tsx
  ├── @react-pdf/renderer (renderToBuffer)
  └── types/db.ts (MedCertDraft)

render-med-cert.tsx
  ├── med-certificate-template.tsx
  └── types/db.ts (MedCertDraft)

test/med-cert-render/route.ts
  ├── render-med-cert.tsx
  └── types/db.ts (MedCertDraft)

Integration:
  ├── render-med-cert.tsx (renderMedicalCertificateToPdf)
  ├── types/db.ts (MedCertDraft from Supabase)
  └── Supabase: med_cert_drafts table (024_med_cert_drafts.sql)
```

## Common Use Cases

### 1. Render Draft to PDF Buffer
```typescript
import { renderMedicalCertificateToPdf } from "@/lib/documents/render-med-cert"

const draft = await getDraft(draftId)
const logoUrl = getAssetUrl("logo")
const pdfBuffer = await renderMedicalCertificateToPdf(draft, logoUrl)
```

### 2. Batch Render Multiple
```typescript
import { renderMedicalCertificatesToPdf } from "@/lib/documents/render-med-cert"

const drafts = await getDrafts(draftIds)
const buffers = await renderMedicalCertificatesToPdf(drafts, logoUrl)
```

### 3. Update Draft Fields
```typescript
const { data } = await supabase
  .from("med_cert_drafts")
  .update({
    patient_full_name: "Jane Doe",
    date_from: "2024-02-01",
    date_to: "2024-02-05",
  })
  .eq("id", draftId)
  .select()
  .single()
```

### 4. Mark Draft as Issued
```typescript
const { data } = await supabase
  .from("med_cert_drafts")
  .update({
    status: "issued",
    issued_at: new Date().toISOString(),
    issued_by: currentDoctorId,
  })
  .eq("id", draftId)
  .select()
  .single()
```

## Status Summary

| Component | Status | Location |
|-----------|--------|----------|
| SQL Migration | 🔵 Pending | scripts/024_med_cert_drafts.sql |
| TypeScript Types | ✅ Complete | types/db.ts |
| PDF Template | ✅ Complete | lib/pdf/med-certificate-template.tsx |
| Render Function | ✅ Complete | lib/documents/render-med-cert.tsx |
| Test Route | ✅ Complete | app/api/test/med-cert-render/route.ts |
| **Build** | ✅ **PASSING** | **0 errors, 161/161 pages** |

## Next Actions

1. **Immediate:** Apply SQL migration to Supabase
2. **Next:** Create draft CRUD endpoints
3. **Then:** Integrate into doctor approval flow
4. **Finally:** Remove test endpoint and deploy

---

**Build Status:** ✅ Compiled successfully (54s, 0 errors)

**Ready for:** Production integration
