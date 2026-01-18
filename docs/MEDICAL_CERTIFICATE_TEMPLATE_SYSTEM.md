# Medical Certificate Template System

## Overview

A config-driven, versioned, audit-safe template system for medical certificates with strict controls.

**Design Principles:**
- **Immutable versioning**: Template changes create new versions; issued certificates are locked to their version
- **Ownership boundaries**: Clinic identity = admin-managed; Doctor identity = doctor-managed
- **Audit-safe**: All changes logged; idempotency protections; no duplicate certificates
- **Secure delivery**: Authenticated downloads or short-lived signed URLs; no permanent public URLs

---

## 1. Entity Definitions

### 1.1 Clinic Identity (`clinic_identity`)

**Owner**: Admin (global singleton - only one active record)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default gen_random_uuid() | |
| `clinic_name` | TEXT | NOT NULL | Legal entity name |
| `trading_name` | TEXT | | Optional trading-as name |
| `address_line_1` | TEXT | NOT NULL | |
| `address_line_2` | TEXT | | |
| `suburb` | TEXT | NOT NULL | |
| `state` | TEXT | NOT NULL, CHECK IN states | |
| `postcode` | TEXT | NOT NULL | |
| `abn` | TEXT | NOT NULL | Australian Business Number |
| `phone` | TEXT | | Optional contact phone |
| `email` | TEXT | | Optional contact email |
| `logo_storage_path` | TEXT | | Path in Supabase Storage |
| `footer_disclaimer` | TEXT | | Legal disclaimer for certificate footer |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | Only one active record |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `created_by` | UUID | FK profiles(id) | Admin who created |
| `updated_by` | UUID | FK profiles(id) | Admin who last updated |

**Constraints:**
- Only one record can have `is_active = true` at a time
- Updates to active record should deactivate old and create new (for audit trail)

---

### 1.2 Doctor Identity (`doctor_identity`)

**Owner**: Doctor (self-managed, validated)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default gen_random_uuid() | |
| `profile_id` | UUID | FK profiles(id), UNIQUE, NOT NULL | Link to doctor profile |
| `full_name` | TEXT | NOT NULL | Display name on certificates |
| `nominals` | TEXT | | Honorifics/qualifications (e.g., "MBBS, FRACGP") |
| `provider_number` | TEXT | NOT NULL | Medicare provider number |
| `ahpra_number` | TEXT | NOT NULL | AHPRA registration (existing in profiles) |
| `signature_storage_path` | TEXT | | Path to signature image |
| `use_electronic_signature` | BOOLEAN | NOT NULL DEFAULT true | Fallback when no signature image |
| `electronic_signature_text` | TEXT | DEFAULT 'Electronically signed' | Text shown when no image |
| `is_validated` | BOOLEAN | NOT NULL DEFAULT false | Admin validation flag |
| `validated_at` | TIMESTAMPTZ | | |
| `validated_by` | UUID | FK profiles(id) | Admin who validated |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Notes:**
- Doctors can edit their own identity but cannot set `is_validated`
- Admin must validate before certificates can be issued
- `ahpra_number` already exists on profiles; consider whether to mirror or reference

---

### 1.3 Certificate Template (`certificate_templates`)

**Owner**: Admin (versioned, immutable once created)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default gen_random_uuid() | |
| `template_type` | TEXT | NOT NULL, CHECK IN ('med_cert_work', 'med_cert_uni', 'med_cert_carer') | |
| `version` | INTEGER | NOT NULL | Monotonically increasing per template_type |
| `name` | TEXT | NOT NULL | Human-readable version name |
| `config` | JSONB | NOT NULL | Template configuration |
| `is_active` | BOOLEAN | NOT NULL DEFAULT false | Only one active per type |
| `activated_at` | TIMESTAMPTZ | | |
| `activated_by` | UUID | FK profiles(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `created_by` | UUID | FK profiles(id) | |

**Constraints:**
- UNIQUE(template_type, version)
- Only one `is_active = true` per `template_type`

**Template Config Schema (JSONB):**
```json
{
  "layout": {
    "page_size": "A4",
    "margins": { "top": 40, "right": 40, "bottom": 40, "left": 40 },
    "header_height": 100,
    "footer_height": 60
  },
  "sections": [
    {
      "id": "header",
      "type": "header",
      "show_logo": true,
      "show_clinic_details": true
    },
    {
      "id": "title",
      "type": "title",
      "text": "Medical Certificate"
    },
    {
      "id": "patient_details",
      "type": "patient_info",
      "fields": ["full_name", "date_of_birth"]
    },
    {
      "id": "certificate_details",
      "type": "certificate_info",
      "fields": ["issue_date", "absence_from", "absence_to", "duration_days"]
    },
    {
      "id": "statement",
      "type": "medical_statement",
      "template": "This is to certify that {{patient_name}} was examined and is unfit for {{purpose}} from {{start_date}} to {{end_date}} inclusive."
    },
    {
      "id": "signature",
      "type": "signature_block",
      "show_signature_image": true,
      "show_provider_number": true,
      "show_ahpra": true
    },
    {
      "id": "footer",
      "type": "footer",
      "show_certificate_id": true,
      "show_verification_url": true,
      "show_disclaimer": true
    }
  ],
  "styles": {
    "font_family": "Helvetica",
    "primary_color": "#1a1a1a",
    "accent_color": "#0066cc"
  }
}
```

---

### 1.4 Issued Certificates (`issued_certificates`)

**Extends existing `med_cert_certificates` or replaces it**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `certificate_number` | TEXT | UNIQUE NOT NULL | MC-YYYY-XXXXXXXX |
| `intake_id` | UUID | FK intakes(id) | |
| `patient_id` | UUID | FK profiles(id) | |
| `doctor_id` | UUID | FK profiles(id) | Issuing doctor |
| `template_id` | UUID | FK certificate_templates(id) NOT NULL | Locked template version |
| `template_version` | INTEGER | NOT NULL | Denormalized for quick reference |
| `template_config_snapshot` | JSONB | | Optional: full config at time of issue |
| `clinic_identity_snapshot` | JSONB | | Clinic details at time of issue |
| `doctor_identity_snapshot` | JSONB | | Doctor details at time of issue |
| `certificate_type` | TEXT | NOT NULL | work/study/carer |
| `patient_name` | TEXT | NOT NULL | |
| `patient_dob` | DATE | | |
| `start_date` | DATE | NOT NULL | |
| `end_date` | DATE | NOT NULL | |
| `medical_statement` | TEXT | | Rendered statement |
| `pdf_storage_path` | TEXT | | |
| `pdf_hash` | TEXT | | SHA256 for integrity |
| `pdf_size_bytes` | INTEGER | | |
| `status` | TEXT | NOT NULL DEFAULT 'valid' | valid/revoked/superseded |
| `revoked_at` | TIMESTAMPTZ | | |
| `revoked_by` | UUID | FK profiles(id) | |
| `revocation_reason` | TEXT | | |
| `idempotency_key` | TEXT | UNIQUE | Prevents duplicate generation |
| `issued_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Key Points:**
- `template_id` + `template_version` lock the certificate to exact template
- `template_config_snapshot` ensures re-rendering is always identical
- `clinic_identity_snapshot` and `doctor_identity_snapshot` preserve point-in-time data
- `idempotency_key` = hash of (intake_id + doctor_id + date) prevents duplicates

---

### 1.5 Template Audit Log (`template_audit_log`)

**Immutable append-only log for template changes**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `event_type` | TEXT | NOT NULL | See enum below |
| `entity_type` | TEXT | NOT NULL | clinic_identity/doctor_identity/certificate_template |
| `entity_id` | UUID | NOT NULL | |
| `actor_id` | UUID | FK profiles(id) | |
| `actor_role` | TEXT | NOT NULL | |
| `previous_value` | JSONB | | Before state |
| `new_value` | JSONB | | After state |
| `change_summary` | TEXT | | Human-readable summary |
| `ip_address` | INET | | |
| `user_agent` | TEXT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Event Types:**
- `clinic_identity_created`
- `clinic_identity_updated`
- `doctor_identity_created`
- `doctor_identity_updated`
- `doctor_identity_validated`
- `template_created`
- `template_activated`
- `template_deactivated`
- `certificate_issued`
- `certificate_revoked`

---

## 2. Versioning Rules

### Template Versioning

1. **Create new version on any change:**
   ```sql
   -- When saving template changes:
   INSERT INTO certificate_templates (template_type, version, config, ...)
   SELECT template_type, MAX(version) + 1, $new_config, ...
   FROM certificate_templates
   WHERE template_type = $type;
   ```

2. **Activation is atomic:**
   ```sql
   BEGIN;
   UPDATE certificate_templates SET is_active = false WHERE template_type = $type AND is_active = true;
   UPDATE certificate_templates SET is_active = true, activated_at = NOW() WHERE id = $new_id;
   COMMIT;
   ```

3. **Certificates reference version at issue time:**
   - On certificate generation, capture `template_id` and `template_version`
   - Optionally snapshot full `config` for guaranteed re-render

### Certificate Immutability

1. **Issued certificates cannot be modified** except:
   - `status` can change to `revoked` or `superseded`
   - `revoked_at`, `revoked_by`, `revocation_reason` can be set once

2. **Re-rendering must be identical:**
   - Use `template_config_snapshot` if stored
   - Otherwise fetch `certificate_templates WHERE id = template_id`

---

## 3. Document Access & Security

### 3.1 Authenticated Download Endpoint

**Route:** `GET /api/certificates/[id]/download`

```typescript
// app/api/certificates/[id]/download/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // 1. Verify auth
  const { user } = await requireAuth()
  
  // 2. Verify ownership or role
  const certificate = await getCertificate(params.id)
  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 })
  
  const canAccess = 
    certificate.patient_id === user.profile.id ||
    user.profile.role === 'doctor' ||
    user.profile.role === 'admin'
  
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  
  // 3. Generate short-lived signed URL (15 minutes)
  const signedUrl = await getSignedUrl(certificate.pdf_storage_path, 15 * 60)
  
  // 4. Option A: Redirect to signed URL
  return NextResponse.redirect(signedUrl)
  
  // 4. Option B: Stream the PDF directly (more secure, no URL leakage)
  const pdfBuffer = await downloadFromStorage(certificate.pdf_storage_path)
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Medical_Certificate_${certificate.certificate_number}.pdf"`,
      'Cache-Control': 'private, no-store'
    }
  })
}
```

### 3.2 Verification Endpoint (Public, Rate-Limited)

**Existing route already implements:**
- Rate limiting via `applyRateLimit(request, "standard")`
- Patient name masking via `maskName()` (first name + last initial)
- Returns only: valid/invalid, certificate_number, issue_date, masked patient name, doctor name

**Enhancements needed:**
1. **Stricter rate limit** for abuse prevention
2. **Remove doctor's full name** - show "InstantMed Clinician" instead
3. **Add verification count tracking** (already exists)
4. **Log verification attempts** to audit log

```typescript
// Enhanced verification response
{
  valid: true,
  document: {
    type: "med_cert",
    subtype: "work",
    certificate_id: "MC-2025-ABC12345",
    issued_at: "2025-01-15",
    patient_name: "John D.",  // Masked
    issuer: "InstantMed Telehealth"  // Generic, not doctor name
  }
}
```

---

## 4. Audit Trail

### 4.1 Template Change Audit

All changes to `clinic_identity`, `doctor_identity`, and `certificate_templates` are logged via `template_audit_log`.

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION log_template_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO template_audit_log (
    event_type,
    entity_type,
    entity_id,
    actor_id,
    previous_value,
    new_value
  ) VALUES (
    TG_ARGV[0],
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.updated_by, NEW.created_by, current_setting('app.current_user_id', true)::uuid),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Certificate Issuance Audit

Already partially exists in `compliance_audit_log`. Extend with:
- `certificate_issued` event type
- Link to `issued_certificates.id`
- Capture `idempotency_key` to detect duplicate attempts

### 4.3 Idempotency Protection

**Certificate Generation:**
```typescript
async function generateCertificate(intakeId: string, doctorId: string) {
  // Generate idempotency key
  const today = new Date().toISOString().split('T')[0]
  const idempotencyKey = crypto.createHash('sha256')
    .update(`${intakeId}:${doctorId}:${today}`)
    .digest('hex')
  
  // Check for existing certificate
  const existing = await supabase
    .from('issued_certificates')
    .select('id, certificate_number')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  
  if (existing) {
    return { success: true, certificate: existing, duplicate: true }
  }
  
  // Proceed with generation...
}
```

---

## 5. Migration SQL

### 5.1 Create clinic_identity table

```sql
-- 20250119000001_create_clinic_identity.sql

CREATE TABLE public.clinic_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  trading_name TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA')),
  postcode TEXT NOT NULL,
  abn TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  logo_storage_path TEXT,
  footer_disclaimer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Ensure only one active record
CREATE UNIQUE INDEX idx_clinic_identity_active ON public.clinic_identity (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.clinic_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active clinic identity" ON public.clinic_identity
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage clinic identity" ON public.clinic_identity
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Seed default clinic identity
INSERT INTO public.clinic_identity (
  clinic_name, trading_name, address_line_1, suburb, state, postcode, abn, 
  footer_disclaimer, is_active
) VALUES (
  'InstantMed Pty Ltd',
  'InstantMed',
  'Level 1, 123 Collins Street',
  'Melbourne',
  'VIC',
  '3000',
  '00 000 000 000',
  'This medical certificate was issued via InstantMed telehealth services. Verify at instantmed.com.au/verify',
  true
);
```

### 5.2 Create doctor_identity table

```sql
-- 20250119000002_create_doctor_identity.sql

CREATE TABLE public.doctor_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nominals TEXT,
  provider_number TEXT NOT NULL,
  ahpra_number TEXT NOT NULL,
  signature_storage_path TEXT,
  use_electronic_signature BOOLEAN NOT NULL DEFAULT true,
  electronic_signature_text TEXT DEFAULT 'Electronically signed',
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctor_identity_profile ON public.doctor_identity(profile_id);
CREATE INDEX idx_doctor_identity_validated ON public.doctor_identity(is_validated) WHERE is_validated = true;

-- RLS
ALTER TABLE public.doctor_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own identity" ON public.doctor_identity
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Doctors can update own identity (except validation)" ON public.doctor_identity
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
  ) WITH CHECK (
    -- Cannot change validation fields
    is_validated = (SELECT is_validated FROM doctor_identity WHERE id = doctor_identity.id)
  );

CREATE POLICY "Admins can manage all doctor identities" ON public.doctor_identity
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER doctor_identity_updated_at
  BEFORE UPDATE ON public.doctor_identity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 5.3 Create certificate_templates table

```sql
-- 20250119000003_create_certificate_templates.sql

CREATE TABLE public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN ('med_cert_work', 'med_cert_uni', 'med_cert_carer')),
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(template_type, version)
);

-- Only one active per type
CREATE UNIQUE INDEX idx_certificate_templates_active 
  ON public.certificate_templates (template_type) 
  WHERE is_active = true;

CREATE INDEX idx_certificate_templates_type ON public.certificate_templates(template_type);

-- RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read templates" ON public.certificate_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage templates" ON public.certificate_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Seed initial templates
INSERT INTO public.certificate_templates (template_type, version, name, config, is_active, activated_at)
VALUES 
  ('med_cert_work', 1, 'Work Certificate v1', '{"layout":{"page_size":"A4"},"sections":[{"id":"header","type":"header"},{"id":"patient","type":"patient_info"},{"id":"statement","type":"medical_statement"},{"id":"signature","type":"signature_block"},{"id":"footer","type":"footer"}]}', true, NOW()),
  ('med_cert_uni', 1, 'University Certificate v1', '{"layout":{"page_size":"A4"},"sections":[{"id":"header","type":"header"},{"id":"patient","type":"patient_info"},{"id":"statement","type":"medical_statement"},{"id":"signature","type":"signature_block"},{"id":"footer","type":"footer"}]}', true, NOW()),
  ('med_cert_carer', 1, 'Carer Certificate v1', '{"layout":{"page_size":"A4"},"sections":[{"id":"header","type":"header"},{"id":"patient","type":"patient_info"},{"id":"carer","type":"carer_info"},{"id":"statement","type":"medical_statement"},{"id":"signature","type":"signature_block"},{"id":"footer","type":"footer"}]}', true, NOW());
```

### 5.4 Update issued_certificates / Add columns

```sql
-- 20250119000004_update_issued_certificates.sql

-- Add template versioning columns to existing table
ALTER TABLE public.med_cert_certificates
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.certificate_templates(id),
  ADD COLUMN IF NOT EXISTS template_version INTEGER,
  ADD COLUMN IF NOT EXISTS template_config_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS clinic_identity_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS doctor_identity_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked', 'superseded')),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_med_cert_certificates_idempotency 
  ON public.med_cert_certificates(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_med_cert_certificates_status 
  ON public.med_cert_certificates(status);
```

### 5.5 Create template_audit_log table

```sql
-- 20250119000005_create_template_audit_log.sql

CREATE TYPE public.template_audit_event AS ENUM (
  'clinic_identity_created',
  'clinic_identity_updated',
  'doctor_identity_created',
  'doctor_identity_updated',
  'doctor_identity_validated',
  'template_created',
  'template_activated',
  'template_deactivated',
  'certificate_issued',
  'certificate_revoked',
  'certificate_download'
);

CREATE TABLE public.template_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.template_audit_event NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  actor_role TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  change_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_audit_entity ON public.template_audit_log(entity_type, entity_id);
CREATE INDEX idx_template_audit_actor ON public.template_audit_log(actor_id);
CREATE INDEX idx_template_audit_created ON public.template_audit_log(created_at DESC);
CREATE INDEX idx_template_audit_event ON public.template_audit_log(event_type);

-- RLS: Read-only for admins
ALTER TABLE public.template_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read template audit log" ON public.template_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Logging function
CREATE OR REPLACE FUNCTION public.log_template_audit(
  p_event_type public.template_audit_event,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_actor_id UUID,
  p_actor_role TEXT,
  p_previous_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_change_summary TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.template_audit_log (
    event_type, entity_type, entity_id, actor_id, actor_role,
    previous_value, new_value, change_summary, ip_address, user_agent
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_actor_id, p_actor_role,
    p_previous_value, p_new_value, p_change_summary, p_ip_address, p_user_agent
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;
```

---

## 6. Code Changes Checklist

### 6.1 Database (Migrations)

- [ ] `20250119000001_create_clinic_identity.sql`
- [ ] `20250119000002_create_doctor_identity.sql`
- [ ] `20250119000003_create_certificate_templates.sql`
- [ ] `20250119000004_update_issued_certificates.sql`
- [ ] `20250119000005_create_template_audit_log.sql`

### 6.2 Types

- [ ] `types/clinic-identity.ts` - Clinic identity types
- [ ] `types/doctor-identity.ts` - Doctor identity types
- [ ] `types/certificate-template.ts` - Template config types

### 6.3 Data Layer (`lib/data/`)

- [ ] `lib/data/clinic-identity.ts` - CRUD for clinic identity
- [ ] `lib/data/doctor-identity.ts` - CRUD for doctor identity
- [ ] `lib/data/certificate-templates.ts` - Template versioning logic
- [ ] Update `lib/data/documents.ts` - Add secure download helpers

### 6.4 Backend Actions (`app/actions/`)

- [ ] `app/actions/clinic-identity.ts` - Admin actions for clinic settings
- [ ] `app/actions/doctor-identity.ts` - Doctor self-service + admin validation
- [ ] `app/actions/certificate-templates.ts` - Template CRUD + activation
- [ ] Update `app/actions/approve-cert.ts`:
  - Fetch active template version
  - Snapshot clinic/doctor identity
  - Generate idempotency key
  - Store all references on certificate
  - Log audit event

### 6.5 API Routes

- [ ] `app/api/certificates/[id]/download/route.ts` - Authenticated download
- [ ] Update `app/api/verify/route.ts`:
  - Check certificate status (valid/revoked)
  - Remove doctor full name from response
  - Add stricter rate limiting
  - Log verification to audit

### 6.6 PDF Generation (`lib/pdf/`)

- [ ] `lib/pdf/template-renderer.ts` - Config-driven PDF renderer
- [ ] Update `lib/pdf/med-cert-pdf.tsx`:
  - Accept template config
  - Use clinic identity for header
  - Use doctor identity for signature
  - Include footer disclaimer

### 6.7 Admin UI (`app/admin/`)

- [ ] `app/admin/settings/clinic/page.tsx` - Clinic identity editor
- [ ] `app/admin/settings/templates/page.tsx` - Template Studio
- [ ] `app/admin/settings/templates/[type]/page.tsx` - Template editor
- [ ] `app/admin/doctors/[id]/page.tsx` - Doctor identity validation
- [ ] `app/admin/audit/templates/page.tsx` - Template audit viewer

### 6.8 Doctor UI

- [ ] `app/doctor/settings/identity/page.tsx` - Doctor identity self-service
- [ ] `app/doctor/settings/signature/page.tsx` - Signature upload

### 6.9 Patient UI

- [ ] Update certificate download buttons to use `/api/certificates/[id]/download`
- [ ] Remove direct PDF URLs from patient-facing pages

### 6.10 Storage

- [ ] Create `branding` bucket for logos
- [ ] Create `signatures` bucket for doctor signatures
- [ ] Update bucket policies for authenticated access only

---

## 7. Implementation Priority

### Phase 1: Foundation (Week 1)
1. Database migrations
2. Type definitions
3. Data layer CRUD
4. Idempotency protection in `approve-cert.ts`

### Phase 2: Security (Week 2)
1. Authenticated download endpoint
2. Enhanced verification endpoint
3. Remove public PDF URLs from storage policy
4. Audit logging integration

### Phase 3: Admin UI (Week 3)
1. Clinic identity settings
2. Template Studio (view/activate only)
3. Doctor identity validation

### Phase 4: Full Template System (Week 4)
1. Template editor with preview
2. Config-driven PDF renderer
3. Version history viewer
4. Doctor signature upload

---

## 8. Testing Requirements

### Unit Tests
- [ ] Template versioning logic (increment, activate, deactivate)
- [ ] Idempotency key generation and duplicate detection
- [ ] Certificate status transitions (valid → revoked)
- [ ] Name masking function

### Integration Tests
- [ ] Certificate generation with template snapshot
- [ ] Re-render certificate from snapshot matches original
- [ ] Authenticated download flow
- [ ] Rate-limited verification

### E2E Tests
- [ ] Admin creates/activates template → Doctor issues cert → Patient downloads
- [ ] Verification shows masked data
- [ ] Duplicate approval attempt returns existing certificate

---

## 9. Rollback Plan

1. **Database**: All migrations are additive (new tables, new columns). Rollback = remove columns/tables.
2. **Code**: Feature flag `ENABLE_TEMPLATE_SYSTEM` gates new behavior. Disable = use hardcoded values.
3. **Storage**: Keep existing bucket policies until verified. Add new bucket for new uploads.

---

## 10. Open Questions

1. **Clinic identity history**: Should we keep full history (soft-delete old records) or just the current one?
2. **Template config complexity**: Start simple (just layout toggles) or full section customization?
3. **Doctor signature validation**: Manual admin review or automated AHPRA lookup?
4. **PDF re-generation**: Support regenerating PDF from snapshot, or always preserve original file?
