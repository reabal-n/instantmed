# Google Ads Policy Audit — InstantMed

**Date:** March 2025  
**Updated:** 2026-04-28  
**Purpose:** Ensure platform compliance with Google Ads policies after ad rejections.

---

## Rejection Reasons Addressed

### 1. Healthcare and medicines: Prescription drug services

**Policy:** Google restricts promotion of online prescribing, dispensation and sale of prescription drugs. Telemedicine providers must be certified. Australia is an approved location but requires certification.

**Action required (account-level):**
- [x] Apply for Google Ads healthcare certification for telemedicine
- [x] LegitScript Healthcare Merchant Certification approved (2026-04-08, Cert ID 48400566)
- [x] Google Ads account 920-501-0513 approved for Online Pharmacy Certification / healthcare promotion (support ticket 4-3698000041178)
- [x] Ensure website is fully functional and globally accessible

**Code changes:** None — certification is an operational/account process. See `docs/ADVERTISING_COMPLIANCE.md` for the current source of truth.

**Conversion tracking:** Technical Google Ads purchase tracking was re-audited on 2026-05-03. See `docs/audits/2026-05-03-supabase-conversion-audit.md` for the current server-side Conversion API and attribution-storage contract.

---

### 2. Healthcare and medicines: Restricted drug terms

**Policy (Australia):** Certification allows eligible healthcare advertising, but ad copy and paid destinations still need conservative restricted-drug handling. Do not use prescription drug terms in ad copy or paid landing pages. Non-promotional organic education is handled separately in `docs/SEO_CONTENT_POLICY.md`.

**Restricted terms:** "prescription", "script", "scripts", "Rx", "meds", medication names, drug classes when used promotionally.

**Landing pages audited:** `/`, `/prescriptions`, `/medical-certificate`, `/faq`, `/contact`, `/how-it-works`, `/pricing`, `/consult`, `/weight-loss`, etc.

**Fixes applied:**
- Layout metadata: "scripts" → "medication renewals"
- Prescriptions page: "Same-Day Scripts" → "Same-Day Service"
- Homepage hero: "Prescriptions renewed" → "Repeat medication from"
- Service categories: "Repeat Scripts" → "Repeat medication"
- Service funnel configs: "script" → "medication" where promotional
- Footer links: "Prescriptions" → "Repeat medication" (or keep as service name with compliant framing)
- **Navbar (shared):** "Repeat Scripts" → "Repeat Medication", "New prescriptions & dose changes" → "New medication & dose changes" — affects landing pages including `/medical-certificate/*`
- **Shared Footer:** "Prescriptions" → "Repeat Medication"

---

### 3. Editorial: Punctuation and Symbols

**Policy:** No emojis (invalid/unsupported characters). No excessive punctuation (!!, ..., ***). No gimmicky use of symbols.

**Fixes applied:**
- Removed emojis from marketing landing pages (homepage, how-it-works, service-picker, FAQ, contact)
- Removed emojis from service funnel config titles (bed, phone icons in howItWorks)
- Email templates: unchanged (transactional emails, not ad destinations)
- Patient/doctor dashboards: unchanged (behind auth, not ad landing pages)

---

### 4. Health in personalized advertising

**Policy:** Health is a sensitive interest category. Advertiser-curated audiences (Customer Match, Your data segments, Lookalike) cannot be used. Use predefined Google audiences (In-market, Affinity, Demographics, etc.).

**Action required (account-level):**
- [ ] In Google Ads: Campaigns → Audiences → remove any Customer Match, custom uploads, or lookalike segments from health-related campaigns
- [ ] Use only: In-market segments, Affinity, Demographics, Life events, Location targeting, Custom segments (with non-sensitive creative)

**Code changes:** None — this is a targeting setting in Google Ads.

---

## Summary of Code Changes

| File | Change |
|------|--------|
| `app/layout.tsx` | Metadata: "scripts" → "medication renewals", "prescriptions" → "repeat medication" |
| `app/page.tsx` | Metadata: "Scripts" → "Medication", "prescriptions" → "repeat medication" |
| `app/prescriptions/page.tsx` | Title/description: remove "Scripts", use "Repeat medication" |
| `lib/marketing/homepage.ts` | Hero, services, featuredServices: prescription/script → medication renewal; remove emojis from proofMetrics, howItWorks |
| `lib/marketing/service-funnel-configs.ts` | repeatScriptFunnelConfig: script → medication; remove emoji from howItWorks titles |
| `components/marketing/how-it-works.tsx` | Remove emoji from step description and CTA |
| `components/marketing/service-picker.tsx` | Remove emoji from PBS note |
| `components/marketing/how-it-works-content.tsx` | Remove emoji, "script" → "medication", "Get Script" → "Renew medication" |
| `components/marketing/live-wait-time.tsx` | "Repeat Prescriptions" → "Repeat medication", "Scripts" → "Medication" |
| `components/marketing/hero.tsx` | "Renew a prescription" → "Renew medication" |
| `app/faq/faq-page-client.tsx` | Remove emojis from FAQ answers |
| `app/contact/contact-client.tsx` | Remove emojis from success/helper text |
| `components/seo/healthcare-schema.tsx` | MedicalServiceSchema for prescriptions: update description if needed |
| `components/shared/navbar.tsx` | "Repeat Scripts" → "Repeat Medication", "New prescriptions & dose changes" → "New medication & dose changes" |
| `components/shared/footer.tsx` | "Prescriptions" → "Repeat Medication" |

---

## Post-Audit Checklist

1. [x] Apply for Google Ads healthcare certification (telemedicine)
2. [ ] Remove advertiser-curated audiences from health campaign targeting
3. [ ] Deploy code changes
4. [ ] Re-submit ads for review or appeal existing rejections using ticket 4-3698000041178 if needed
5. [ ] Ensure ad copy, paid destinations, metadata, and schema avoid prescription drug terms and emojis

---

## References

- [Healthcare and medicines policy](https://support.google.com/adspolicy/answer/176031)
- [Restricted drug terms](https://support.google.com/adspolicy/answer/176031#restricted_drug_terms)
- [Editorial: Punctuation and Symbols](https://support.google.com/adspolicy/answer/176035)
- [Health in personalized advertising](https://support.google.com/adspolicy/answer/9012909)
