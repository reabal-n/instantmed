import type { UnifiedServiceType } from "@/types/services"

// Medical certificates are the only intake flow that does NOT require the
// structured prescribing identity bundle (Medicare + address + sex + phone).
// Everything else does, even subtypes that are currently retired or gated off:
//   - prescription / repeat_rx / common_scripts
//   - consult / consults (every subtype)
//
// Keeping the rule expressed as "anything that is not a med cert" rather than
// an allowlist of consult subtypes means future re-activation of a service
// (weight_loss, womens_health, infection, mental_health, general, etc.)
// inherits the correct gating automatically without a code change.
//
// Operator-stated rule (2026-05-21):
//   Address + Medicare + phone are required for every service EXCEPT med certs.
//   Name + DOB + email are required for ALL services (enforced at checkout
//   identity step separately).
//
// Contract test: lib/__tests__/prescribing-identity-gate-contract.test.ts
const MED_CERT_CATEGORIES: ReadonlySet<string> = new Set(["medical_certificate", "med_certs"])
// IMPORTANT: the canonical UnifiedServiceType is `'med-cert'` (HYPHEN) per
// types/services.ts and the /request URL convention. The underscore variants
// here cover legacy callers (intake categories, persisted answers) but the
// hyphenated form is the live one. Missing the hyphenated form historically
// caused the patient-details step to demand a Medicare number from every
// med-cert patient — exactly the wrong gate. Keep both.
const MED_CERT_SERVICE_TYPES: ReadonlySet<string> = new Set([
  "med-cert",
  "med_cert",
  "med_certs",
  "medical_certificate",
])

export function requiresPrescribingIdentityForRequest({
  category,
  serviceType,
  subtype,
}: {
  category?: string | null
  serviceType?: UnifiedServiceType | string | null
  subtype?: string | null
}): boolean {
  void subtype
  const normalizedCategory = (category ?? "").trim()
  const normalizedServiceType = (serviceType ?? "").trim()

  // If nothing is known about the request, default to NOT requiring the full
  // identity bundle. Better to under-collect than to block a legitimate flow.
  if (!normalizedCategory && !normalizedServiceType) return false

  if (MED_CERT_CATEGORIES.has(normalizedCategory)) return false
  if (MED_CERT_SERVICE_TYPES.has(normalizedServiceType)) return false

  return true
}
