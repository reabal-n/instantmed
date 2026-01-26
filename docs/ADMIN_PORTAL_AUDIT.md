# Admin Portal Security & Operational Safety Audit

**Audited:** 2026-01-25  
**Scope:** `/admin` routes, feature flags, templates/studio, services config, doctors config, refunds/ops/email queue  
**Status:** Complete

---

## 1. Admin Route Inventory

| Route | Page File | Primary Actions | Auth Method |
|-------|-----------|-----------------|-------------|
| `/admin` | `app/admin/page.tsx` | Dashboard view | `requireRole(["admin"])` in layout |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | Read-only metrics | Layout guard |
| `/admin/audit` | `app/admin/audit/page.tsx` | View audit logs | Layout guard |
| `/admin/clinic` | `app/admin/clinic/page.tsx` | Clinic identity CRUD | Layout guard |
| `/admin/content` | `app/admin/content/page.tsx` | Content blocks CRUD | Layout guard |
| `/admin/doctors` | `app/admin/doctors/page.tsx` | Doctor identity CRUD | Layout guard |
| `/admin/email-queue` | `app/admin/email-queue/page.tsx` | Email retry, resolve | Layout guard |
| `/admin/emails` | `app/admin/emails/page.tsx` | Email templates CRUD | Layout guard |
| `/admin/features` | `app/admin/features/page.tsx` | Feature flags toggle | Layout guard |
| `/admin/finance` | `app/admin/finance/page.tsx` | Financial reports | Layout guard |
| `/admin/ops` | `app/admin/ops/page.tsx` | System health view | Layout guard |
| `/admin/refunds` | `app/admin/refunds/page.tsx` | Process refunds | Layout guard |
| `/admin/services` | `app/admin/services/page.tsx` | Services CRUD | Layout guard |
| `/admin/settings` | `app/admin/settings/page.tsx` | Admin settings | Layout guard |
| `/admin/settings/templates` | `app/admin/settings/templates/page.tsx` | Certificate templates | Layout guard |
| `/admin/studio` | `app/admin/studio/page.tsx` | Template studio | Layout guard |

**Root Layout Guard:** All admin routes protected by `requireRole(["admin"])` in `app/admin/layout.tsx:21`

---

## 2. Admin Mutations Inventory

### 2.1 All Mutations Have Admin Guards ✅

| Action File | Mutations | Guard Pattern | Status |
|-------------|-----------|---------------|--------|
| `admin-config.ts` | Email templates, content blocks, feature flags, refunds | `requireAdmin()` → `requireRole(["admin"])` | ✅ |
| `admin-settings.ts` | Clinic identity, doctor identity, services | `requireAdmin()` → `requireRole(["admin"])` | ✅ |
| `template-studio.ts` | Clinic identity, templates, logo upload | `requireAdminAuth()` → `requireRole(["admin"])` | ✅ |
| `templates.ts` | Save template, activate version | `auth()` + profile role check | ✅ |
| `email-retry.ts` | Retry email, mark resolved | `requireAdminRole()` → `requireRole(["admin"])` | ✅ |

### 2.2 Mutation Detail

| Mutation | File | Guard | Audit Log | Confirmation |
|----------|------|-------|-----------|--------------|
| `createServiceAction` | `admin-settings.ts:208` | ✅ | `log.info` only | ❌ None |
| `updateServiceAction` | `admin-settings.ts:222` | ✅ | `log.info` only | ❌ None |
| `deleteServiceAction` | `admin-settings.ts:264` | ✅ | `log.info` only | ✅ `window.confirm` |
| `toggleServiceActiveAction` | `admin-settings.ts:236` | ✅ | `log.info` only | ❌ None |
| `updateFeatureFlagAction` | `admin-config.ts:174` | ✅ | ✅ `logAuditEvent` | ❌ None |
| `createEmailTemplateAction` | `admin-config.ts:73` | ✅ | `log.info` only | ❌ None |
| `updateEmailTemplateAction` | `admin-config.ts:83` | ✅ | `log.info` only | ❌ None |
| `toggleEmailTemplateActiveAction` | `admin-config.ts:93` | ✅ | `log.info` only | ❌ None |
| `createContentBlockAction` | `admin-config.ts:117` | ✅ | `log.info` only | ❌ None |
| `updateContentBlockAction` | `admin-config.ts:127` | ✅ | `log.info` only | ❌ None |
| `deleteContentBlockAction` | `admin-config.ts:137` | ✅ | `log.info` only | ✅ `window.confirm` |
| `processRefundAction` | `admin-config.ts:222` | ✅ | `log.info` only | ❌ None |
| `markRefundNotEligibleAction` | `admin-config.ts:242` | ✅ | `log.info` only | ❌ None |
| `updateDoctorIdentityAction` | `admin-settings.ts:148` | ✅ | `log.info` only | ❌ None |
| `saveClinicIdentityAction` | `admin-settings.ts:62` | ✅ | `log.info` only | ❌ None |
| `saveTemplateAction` | `template-studio.ts:166` | ✅ | `log.info` only | ❌ None |
| `retryEmail` | `email-retry.ts:66` | ✅ | ✅ `logCertificateEvent` | ❌ None |
| `markEmailResolved` | `email-retry.ts:169` | ✅ | ✅ `logCertificateEvent` | ❌ None |

---

## 3. Feature Flags Analysis

### 3.1 Kill Switches

| Flag | Impact | Cache TTL | Takes Effect |
|------|--------|-----------|--------------|
| `disable_med_cert` | Blocks all new med cert requests | 30s | ~30s |
| `disable_repeat_scripts` | Blocks all new prescription requests | 30s | ~30s |
| `disable_consults` | Blocks all new consultation requests | 30s | ~30s |

### 3.2 Safety Concerns

| Issue | Risk | Location |
|-------|------|----------|
| **No confirmation dialog for kill switches** | Accidental disable affects all patients | `features-client.tsx:178-179` |
| **30s cache delay** | Kill switch doesn't take immediate effect | `feature-flags.ts:90` |
| **Audit logging exists** | ✅ Uses `logAuditEvent` with old/new values | `feature-flags.ts:189-199` |

### 3.3 Blocked Medication Terms

| Aspect | Status | Notes |
|--------|--------|-------|
| Add term | No confirmation | Could block legitimate medications |
| Remove term | No confirmation | Could unblock controlled substances |
| Validation | None | Any string accepted |

---

## 4. Templates/Studio Analysis

### 4.1 Certificate Templates

| Operation | Confirmation | Audit | Versioning |
|-----------|--------------|-------|------------|
| Save template | ❌ None | `log.info` only | ✅ Creates new version |
| Rollback version | ✅ `window.confirm` | `log.info` only | ✅ Creates new version |
| Discard changes | ✅ `window.confirm` | N/A | N/A |

### 4.2 Clinic Identity

| Aspect | Status | Notes |
|--------|--------|-------|
| Save | No confirmation | Changes clinic name, address, ABN on certificates |
| Versioning | ✅ Soft versioning | Old records deactivated, new created |
| Audit trail | ✅ `created_by`, `updated_by` tracked | History retrievable |

---

## 5. Services Config Analysis

### 5.1 Operations

| Operation | Confirmation | Audit | Delete Type |
|-----------|--------------|-------|-------------|
| Create service | ❌ None | `log.info` only | N/A |
| Update service | ❌ None | `log.info` only | N/A |
| Toggle active | ❌ None | `log.info` only | N/A |
| Delete service | ✅ `window.confirm` | `log.info` only | **Conditional** |

### 5.2 Delete Behavior

```
@/Users/rey/Desktop/instantmed/lib/data/services.ts:258-267
```
- **If service has intakes:** Soft delete (deactivates)
- **If no intakes:** Hard delete (permanent)

### 5.3 Validation Gaps

| Field | Current Validation | Missing |
|-------|-------------------|---------|
| `price_cents` | None in action | Min/max bounds, negative check |
| `sla_standard_minutes` | None | Min bounds (0?), sanity max |
| `sla_priority_minutes` | None | Must be < standard SLA |
| `min_age` / `max_age` | None | min < max, reasonable bounds |
| `slug` | Regex check for format | Uniqueness not checked client-side |

---

## 6. Doctors Config Analysis

### 6.1 Operations

| Operation | Confirmation | Audit | Validation |
|-----------|--------------|-------|------------|
| Update doctor identity | ❌ None | `log.info` only | ✅ Provider/AHPRA format |
| Upload signature | ❌ None | `log.info` only | ✅ File type/size |

### 6.2 Sensitive Data Access

```
@/Users/rey/Desktop/instantmed/app/actions/admin-settings.ts:108-138
```
- ✅ Access to provider/AHPRA numbers is logged
- ✅ Record count logged for compliance

---

## 7. Refunds/Ops/Email Queue Analysis

### 7.1 Refunds

| Operation | Confirmation | Audit | Risk |
|-----------|--------------|-------|------|
| Process refund | ❌ **None** | `log.info` only | **HIGH** - Financial impact |
| Reject refund | ❌ None (requires reason) | `log.info` only | Medium |

**Critical Gap:** `processRefundAction` has no confirmation dialog and only logs to application logs, not audit table.

### 7.2 Email Queue

| Operation | Confirmation | Audit | Status |
|-----------|--------------|-------|--------|
| Retry email | ❌ None | ✅ `logCertificateEvent` | OK |
| Mark resolved | ❌ None (requires note) | ✅ `logCertificateEvent` | OK |

### 7.3 Ops Dashboard

- Read-only monitoring view
- No mutations
- ✅ Safe

---

## 8. Actions Requiring Improvements

### 8.1 Missing Confirmation Dialogs (HIGH Impact)

| Action | File | Risk |
|--------|------|------|
| **Process refund** | `refunds-client.tsx:107-133` | Financial loss from accidental click |
| **Toggle service kill switch** | `features-client.tsx:178-179` | Service outage |
| **Update doctor AHPRA/Provider** | `doctors-client.tsx:155-200` | Certificate validity |

### 8.2 Missing Audit Logging (Compliance Risk)

| Action | File | Should Log |
|--------|------|------------|
| Service create/update/delete | `admin-settings.ts:208-276` | `logAuditEvent` with old/new values |
| Content block delete | `admin-config.ts:137-145` | `logAuditEvent` |
| Clinic identity change | `admin-settings.ts:62-74` | `logAuditEvent` |
| Doctor identity change | `admin-settings.ts:148-163` | `logAuditEvent` |
| Refund processed | `admin-config.ts:222-240` | `logAuditEvent` (financial) |
| Template rollback | `templates.ts:100-127` | `logAuditEvent` |

### 8.3 Hard Deletes (Data Loss Risk)

| Entity | Current Behavior | Should Be |
|--------|------------------|-----------|
| Content blocks | Hard delete | Soft delete with `deleted_at` |
| Services (no intakes) | Hard delete | Always soft delete |

### 8.4 Missing Validation (Data Integrity)

| Field | Location | Needed |
|-------|----------|--------|
| `price_cents` | `services-client.tsx` | `>= 0`, max bound |
| `sla_*_minutes` | `services-client.tsx` | `> 0`, priority < standard |
| `blocked_medication_terms` | `features-client.tsx` | Non-empty, no duplicates (server) |
| `safety_screening_symptoms` | `features-client.tsx` | Non-empty, min count |

---

## 9. Recommendations (Max 10)

### HIGH Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 1 | **Refund processing has no confirmation** | `app/admin/refunds/refunds-client.tsx:107` | Add `AlertDialog` with amount confirmation before `processRefundAction` |
| 2 | **Feature flag kill switches lack confirmation** | `app/admin/features/features-client.tsx:39` | Add confirmation dialog when toggling `disable_*` flags |
| 3 | **Refund actions not in audit log** | `app/actions/admin-config.ts:222` | Add `logAuditEvent({ action: "refund_processed", ... })` |

### MEDIUM Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 4 | **Service mutations not in audit log** | `app/actions/admin-settings.ts:208-276` | Add `logAuditEvent` for create/update/delete with old/new values |
| 5 | **Content block hard delete** | `lib/data/content-blocks.ts:155-172` | Add `deleted_at` column, change to soft delete |
| 6 | **Service price_cents lacks validation** | `lib/data/services.ts:133-166` | Add `if (input.price_cents < 0) return error` |
| 7 | **Doctor identity changes not audited** | `app/actions/admin-settings.ts:148` | Add `logAuditEvent` for AHPRA/provider changes |

### LOW Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 8 | **Template version rollback lacks audit** | `app/actions/templates.ts:100` | Add `logAuditEvent` when activating old version |
| 9 | **SLA validation missing** | `app/admin/services/services-client.tsx:194-200` | Validate `sla_priority_minutes < sla_standard_minutes` |
| 10 | **Blocked medication terms no minimum** | `lib/feature-flags.ts` | Warn if removing last blocked term, or enforce minimum |

---

## 10. Summary

| Area | Status | Risk Level |
|------|--------|------------|
| Route protection | ✅ All routes guarded | **Low** |
| Auth guards on mutations | ✅ All mutations require admin | **Low** |
| Feature flag audit logging | ✅ Properly logged | **Low** |
| Refund confirmation/audit | ❌ Missing both | **High** |
| Service config audit | ❌ Logger only, no audit table | **Medium** |
| Content block deletion | ❌ Hard delete | **Medium** |
| Input validation | ⚠️ Partial (slug validated, price not) | **Medium** |
| Doctor identity audit | ❌ Logger only | **Medium** |

**Overall Assessment:** Admin portal has correct authorization (all routes and mutations require admin role). Primary gaps are:
1. **Operational safety:** High-impact actions (refunds, kill switches) lack confirmation dialogs
2. **Compliance:** Several mutations only log to application logs, not the audit_logs table
3. **Data integrity:** Content blocks use hard delete; services use hard delete when no references exist

Addressing recommendations #1-3 will significantly reduce operational and compliance risk.
