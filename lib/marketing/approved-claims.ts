/**
 * Approved public claims registry.
 *
 * This is the marketing-copy control point for high-repetition claims that
 * carry clinical, advertising, or platform-risk implications. Keep the copy
 * human, but do not fork these strings in page components.
 */

export type ClaimRisk = "low" | "medium" | "high"

export type ClaimContext =
  | "brand"
  | "platform"
  | "medical_certificate"
  | "prescribing"
  | "specialty"
  | "employer"
  | "checkout"
  | "privacy"
  | "complaints"
  | "governance"

export type ApprovedClaimId =
  | "brand_thesis"
  | "tagline"
  | "tagline_paid_safe"
  | "platform_wedge"
  | "med_cert_wedge"
  | "form_first_wedge"
  | "prop_phrase"
  | "iconic_hook"
  | "refund_guarantee"
  | "refund_guarantee_label"
  | "refund_payment_process"
  | "availability_24_7"
  | "clinical_decision_model"
  | "clinical_review_sequence"
  | "clinical_access_scope"
  | "complaints_timing"
  | "doctor_registration"
  | "legitscript_label"
  | "legitscript_tooltip"
  | "google_healthcare_ads_label"
  | "google_healthcare_ads_tooltip"
  | "trust_no_appointment_label"
  | "trust_no_appointment_tooltip"
  | "trust_simple_cert_label"
  | "trust_simple_cert_tooltip"
  | "trust_talk_if_needed_label"
  | "trust_talk_if_needed_tooltip"
  | "trust_form_first_label"
  | "trust_form_first_tooltip"
  | "trust_no_waiting_room_label"
  | "trust_no_waiting_room_tooltip"
  | "trust_digital_delivery_label"
  | "trust_digital_delivery_tooltip"
  | "trust_doctor_issued_label"
  | "trust_doctor_issued_tooltip"
  | "prescription_escript_sent"
  | "prescription_if_approved"
  | "employer_verify_authenticity"
  | "employer_privacy_limited"

export interface ApprovedClaim {
  contexts: readonly ClaimContext[]
  id: ApprovedClaimId
  notes: string
  risk: ClaimRisk
  sources: readonly string[]
  text: string
}

const BRAND_RECEIPTS = ["docs/BRAND.md", "docs/VOICE.md"] as const
const CLINICAL_RECEIPTS = ["AGENTS.md", "docs/CLINICAL.md"] as const
const REFUND_RECEIPTS = [
  "AGENTS.md",
  "docs/CLINICAL.md",
  "app/actions/decline-refund.ts",
] as const
const COMPLAINT_RECEIPTS = ["AGENTS.md", "docs/CLINICAL.md"] as const
const ADS_RECEIPTS = ["docs/ADVERTISING_COMPLIANCE.md"] as const
const EMPLOYER_RECEIPTS = [
  "docs/CLINICAL.md",
  "docs/ADVERTISING_COMPLIANCE.md",
] as const

export const APPROVED_CLAIMS: Record<ApprovedClaimId, ApprovedClaim> = {
  brand_thesis: {
    id: "brand_thesis",
    text: "Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.",
    contexts: ["brand"],
    risk: "medium",
    sources: BRAND_RECEIPTS,
    notes: "Brand thesis. Avoid using in paid creative if comparative speed substantiation is unavailable.",
  },
  tagline: {
    id: "tagline",
    text: "Faster than your GP.",
    contexts: ["brand"],
    risk: "medium",
    sources: BRAND_RECEIPTS,
    notes: "Brand spine. Use paid-safe variant for ads when review sensitivity is high.",
  },
  tagline_paid_safe: {
    id: "tagline_paid_safe",
    text: "Faster than the wait at your GP.",
    contexts: ["brand"],
    risk: "low",
    sources: BRAND_RECEIPTS,
    notes: "Lower-risk paid media variant because it compares waiting time, not clinician quality.",
  },
  platform_wedge: {
    id: "platform_wedge",
    text: "No appointment. No waiting room. Start with a secure clinical form.",
    contexts: ["platform", "checkout"],
    risk: "medium",
    sources: BRAND_RECEIPTS,
    notes: "Default platform mechanism. Does not promise no clinical contact for prescribing pathways.",
  },
  med_cert_wedge: {
    id: "med_cert_wedge",
    text: "No video. No call. No appointment.",
    contexts: ["medical_certificate"],
    risk: "high",
    sources: CLINICAL_RECEIPTS,
    notes: "Medical-certificate surfaces only, for suitable administrative documentation requests.",
  },
  form_first_wedge: {
    id: "form_first_wedge",
    text: "Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.",
    contexts: ["prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Use for prescribing and specialty surfaces. Keeps a possible brief doctor call visible rather than implying contact is rare.",
  },
  prop_phrase: {
    id: "prop_phrase",
    text: "Telehealth without the small talk.",
    contexts: ["brand", "platform"],
    risk: "low",
    sources: BRAND_RECEIPTS,
    notes: "Core voice line.",
  },
  iconic_hook: {
    id: "iconic_hook",
    text: "Start with a secure form. Takes about 3 minutes.",
    contexts: ["platform", "checkout"],
    risk: "medium",
    sources: BRAND_RECEIPTS,
    notes: "Form-duration claim. Keep approximate.",
  },
  refund_guarantee: {
    id: "refund_guarantee",
    text: "Full refund if the doctor declines.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty", "checkout"],
    risk: "medium",
    sources: REFUND_RECEIPTS,
    notes: "Outcome guarantee tied to documented clinical decline. Do not add time-bound review promises.",
  },
  refund_guarantee_label: {
    id: "refund_guarantee_label",
    text: "Refund if declined",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty", "checkout"],
    risk: "medium",
    sources: REFUND_RECEIPTS,
    notes: "Short display label for stats, badges, and dense trust rows. Use refund_guarantee for sentence copy.",
  },
  refund_payment_process: {
    id: "refund_payment_process",
    text: "You pay upfront. If the doctor declines, the full request fee and priority fee are automatically refunded to the original payment method.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty", "checkout"],
    risk: "high",
    sources: REFUND_RECEIPTS,
    notes: "Canonical payment-mechanism sentence. Never shorten this to 'pay nothing' or imply no upfront charge.",
  },
  availability_24_7: {
    id: "availability_24_7",
    text: "Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Use where operating availability matters. Do not replace with a review-hours window or guaranteed turnaround.",
  },
  clinical_decision_model: {
    id: "clinical_decision_model",
    text: "AI never prescribes or makes clinical decisions. Eligible low-risk certificate requests may be approved under a doctor-owned protocol and are individually reviewed afterward.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty", "governance"],
    risk: "high",
    sources: CLINICAL_RECEIPTS,
    notes: "Canonical automation disclosure. Do not deny the logged medical-certificate protocol or imply protocol prescribing.",
  },
  clinical_review_sequence: {
    id: "clinical_review_sequence",
    text: "Prescribing requests receive doctor review before any prescription is issued. Eligible low-risk certificate requests may follow a doctor-owned protocol and are individually reviewed afterward.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty", "governance"],
    risk: "high",
    sources: CLINICAL_RECEIPTS,
    notes: "Branch-aware public process order. Do not imply every certificate is doctor-reviewed before issue or that protocol issuance applies to prescribing.",
  },
  clinical_access_scope: {
    id: "clinical_access_scope",
    text: "Clinical access is role-scoped. Doctors and the owner-admin can access records needed for care; support sees only bounded, masked operational data.",
    contexts: ["platform", "privacy", "governance"],
    risk: "high",
    sources: ["AGENTS.md", "docs/SECURITY.md"],
    notes: "Public access-control summary. Avoid claiming that only one doctor can access a record or that completed records become patient-only.",
  },
  complaints_timing: {
    id: "complaints_timing",
    text: "We acknowledge complaints within 24 hours. Clinical complaints target resolution within 14 days.",
    contexts: ["platform", "complaints", "governance"],
    risk: "medium",
    sources: COMPLAINT_RECEIPTS,
    notes: "Canonical complaints timing. The 14-day clinical target is not a guaranteed outcome.",
  },
  doctor_registration: {
    id: "doctor_registration",
    text: "Clinical reviews are performed by AHPRA-registered doctors under documented clinical governance.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty", "governance"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Safe public doctor-model summary. Do not add doctor count, names, fellowship, experience, training, insurance, or monitoring claims without a current receipt.",
  },
  legitscript_label: {
    id: "legitscript_label",
    text: "LegitScript certified",
    contexts: ["platform"],
    risk: "low",
    sources: ADS_RECEIPTS,
    notes: "Short certification label; link to the live LegitScript verification page where possible.",
  },
  legitscript_tooltip: {
    id: "legitscript_tooltip",
    text: "Independent healthcare merchant certification used for advertising and payment-platform eligibility, not a clinical endorsement.",
    contexts: ["platform"],
    risk: "medium",
    sources: ADS_RECEIPTS,
    notes: "Explains what the certification does and does not mean.",
  },
  google_healthcare_ads_label: {
    id: "google_healthcare_ads_label",
    text: "Google Ads Online Pharmacy Certification",
    contexts: ["platform"],
    risk: "medium",
    sources: ADS_RECEIPTS,
    notes: "Exact approval category for advertising eligibility. Never call this 'Telehealth Certified' or a clinical endorsement.",
  },
  google_healthcare_ads_tooltip: {
    id: "google_healthcare_ads_tooltip",
    text: "Approved for Google Ads Online Pharmacy Certification / healthcare promotion. This is advertising eligibility, not a clinical endorsement.",
    contexts: ["platform"],
    risk: "medium",
    sources: ADS_RECEIPTS,
    notes: "Use with the Google certification mark or tooltip.",
  },
  trust_no_appointment_label: {
    id: "trust_no_appointment_label",
    text: "No appointment",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "Short trust primitive label.",
  },
  trust_no_appointment_tooltip: {
    id: "trust_no_appointment_tooltip",
    text: "Submit any time. No booking, no scheduling.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "Short trust primitive tooltip.",
  },
  trust_simple_cert_label: {
    id: "trust_simple_cert_label",
    text: "No call for simple certs",
    contexts: ["medical_certificate"],
    risk: "high",
    sources: CLINICAL_RECEIPTS,
    notes: "Medical-certificate surfaces only.",
  },
  trust_simple_cert_tooltip: {
    id: "trust_simple_cert_tooltip",
    text: "Straightforward certificate requests can usually be reviewed from the form.",
    contexts: ["medical_certificate"],
    risk: "high",
    sources: CLINICAL_RECEIPTS,
    notes: "Avoid using on prescribing or specialty pathways.",
  },
  trust_talk_if_needed_label: {
    id: "trust_talk_if_needed_label",
    text: "Doctor contact if needed",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Human version of the clinical-contact caveat.",
  },
  trust_talk_if_needed_tooltip: {
    id: "trust_talk_if_needed_tooltip",
    text: "A doctor reviews the form and may call or message before deciding.",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Use instead of sterile may-message-or-call language.",
  },
  trust_form_first_label: {
    id: "trust_form_first_label",
    text: "Secure form first",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "Short trust primitive label.",
  },
  trust_form_first_tooltip: {
    id: "trust_form_first_tooltip",
    text: "Answer the clinical questions upfront, then the doctor reviews them.",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "Avoids implying automatic approval.",
  },
  trust_no_waiting_room_label: {
    id: "trust_no_waiting_room_label",
    text: "No waiting room",
    contexts: ["platform"],
    risk: "low",
    sources: BRAND_RECEIPTS,
    notes: "Safe friction primitive.",
  },
  trust_no_waiting_room_tooltip: {
    id: "trust_no_waiting_room_tooltip",
    text: "No clinic queue. Start from wherever you are.",
    contexts: ["platform"],
    risk: "low",
    sources: BRAND_RECEIPTS,
    notes: "Avoids precise wait-time promises.",
  },
  trust_digital_delivery_label: {
    id: "trust_digital_delivery_label",
    text: "Digital delivery",
    contexts: ["medical_certificate", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "Replaces unsupported same-day percentage claims.",
  },
  trust_digital_delivery_tooltip: {
    id: "trust_digital_delivery_tooltip",
    text: "If approved, your document or eScript is sent digitally.",
    contexts: ["medical_certificate", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Keeps approval conditional.",
  },
  trust_doctor_issued_label: {
    id: "trust_doctor_issued_label",
    text: "Doctor-issued certificate",
    contexts: ["medical_certificate", "employer"],
    risk: "medium",
    sources: EMPLOYER_RECEIPTS,
    notes: "Use instead of legal-validity claims.",
  },
  trust_doctor_issued_tooltip: {
    id: "trust_doctor_issued_tooltip",
    text: "Issued by an AHPRA-registered doctor. Employer policies may vary.",
    contexts: ["medical_certificate", "employer"],
    risk: "medium",
    sources: EMPLOYER_RECEIPTS,
    notes: "Safe employer-policy caveat.",
  },
  prescription_escript_sent: {
    id: "prescription_escript_sent",
    text: "eScript sent",
    contexts: ["prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Use only where the UI is showing an approved/sent state.",
  },
  prescription_if_approved: {
    id: "prescription_if_approved",
    text: "If approved, your eScript goes straight to your phone.",
    contexts: ["prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Human alternative to sterile clinical-appropriateness copy.",
  },
  employer_verify_authenticity: {
    id: "employer_verify_authenticity",
    text: "Verify certificate authenticity",
    contexts: ["employer"],
    risk: "low",
    sources: EMPLOYER_RECEIPTS,
    notes: "Verification confirms InstantMed issuance, not workplace entitlement.",
  },
  employer_privacy_limited: {
    id: "employer_privacy_limited",
    text: "Privacy-limited result. No diagnosis shown.",
    contexts: ["employer"],
    risk: "low",
    sources: EMPLOYER_RECEIPTS,
    notes: "Employer verification must disclose minimal document facts only.",
  },
}

export function getApprovedClaim(id: ApprovedClaimId): string {
  return APPROVED_CLAIMS[id].text
}
