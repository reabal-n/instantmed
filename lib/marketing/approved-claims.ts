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
  text: string
}

export const APPROVED_CLAIMS: Record<ApprovedClaimId, ApprovedClaim> = {
  brand_thesis: {
    id: "brand_thesis",
    text: "Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.",
    contexts: ["brand"],
    risk: "medium",
    notes: "Brand thesis. Avoid using in paid creative if comparative speed substantiation is unavailable.",
  },
  tagline: {
    id: "tagline",
    text: "Faster than your GP.",
    contexts: ["brand"],
    risk: "medium",
    notes: "Brand spine. Use paid-safe variant for ads when review sensitivity is high.",
  },
  tagline_paid_safe: {
    id: "tagline_paid_safe",
    text: "Faster than the wait at your GP.",
    contexts: ["brand"],
    risk: "low",
    notes: "Lower-risk paid media variant because it compares waiting time, not clinician quality.",
  },
  platform_wedge: {
    id: "platform_wedge",
    text: "No appointment. No waiting room. Start with a secure clinical form.",
    contexts: ["platform", "checkout"],
    risk: "medium",
    notes: "Default platform mechanism. Does not promise no clinical contact for prescribing pathways.",
  },
  med_cert_wedge: {
    id: "med_cert_wedge",
    text: "No video. No call. No appointment.",
    contexts: ["medical_certificate"],
    risk: "high",
    notes: "Medical-certificate surfaces only, for suitable administrative documentation requests.",
  },
  form_first_wedge: {
    id: "form_first_wedge",
    text: "Complete a secure clinical form. We only interrupt you if something important is missing.",
    contexts: ["prescribing", "specialty", "platform"],
    risk: "medium",
    notes: "Use where a doctor may message or call before making a clinical decision.",
  },
  prop_phrase: {
    id: "prop_phrase",
    text: "Telehealth without the small talk.",
    contexts: ["brand", "platform"],
    risk: "low",
    notes: "Core voice line.",
  },
  iconic_hook: {
    id: "iconic_hook",
    text: "Start with a secure form. Takes about 3 minutes.",
    contexts: ["platform", "checkout"],
    risk: "medium",
    notes: "Form-duration claim. Keep approximate.",
  },
  refund_guarantee: {
    id: "refund_guarantee",
    text: "Full refund if the doctor declines.",
    contexts: ["platform", "checkout"],
    risk: "low",
    notes: "Outcome guarantee tied to documented clinical decline. Do not add time-bound review promises.",
  },
  trust_no_appointment_label: {
    id: "trust_no_appointment_label",
    text: "No appointment",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "low",
    notes: "Short trust primitive label.",
  },
  trust_no_appointment_tooltip: {
    id: "trust_no_appointment_tooltip",
    text: "Submit any time. No booking, no scheduling.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "low",
    notes: "Short trust primitive tooltip.",
  },
  trust_simple_cert_label: {
    id: "trust_simple_cert_label",
    text: "No call for simple certs",
    contexts: ["medical_certificate"],
    risk: "high",
    notes: "Medical-certificate surfaces only.",
  },
  trust_simple_cert_tooltip: {
    id: "trust_simple_cert_tooltip",
    text: "Straightforward certificate requests can usually be reviewed from the form.",
    contexts: ["medical_certificate"],
    risk: "high",
    notes: "Avoid using on prescribing or specialty pathways.",
  },
  trust_talk_if_needed_label: {
    id: "trust_talk_if_needed_label",
    text: "Talk only if needed",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "medium",
    notes: "Human version of the clinical-contact caveat.",
  },
  trust_talk_if_needed_tooltip: {
    id: "trust_talk_if_needed_tooltip",
    text: "Start with the form. If the doctor needs a key detail, they'll contact you.",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "medium",
    notes: "Use instead of sterile may-message-or-call language.",
  },
  trust_form_first_label: {
    id: "trust_form_first_label",
    text: "Secure form first",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "low",
    notes: "Short trust primitive label.",
  },
  trust_form_first_tooltip: {
    id: "trust_form_first_tooltip",
    text: "Answer the clinical questions upfront, then the doctor reviews them.",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "low",
    notes: "Avoids implying automatic approval.",
  },
  trust_no_waiting_room_label: {
    id: "trust_no_waiting_room_label",
    text: "No waiting room",
    contexts: ["platform"],
    risk: "low",
    notes: "Safe friction primitive.",
  },
  trust_no_waiting_room_tooltip: {
    id: "trust_no_waiting_room_tooltip",
    text: "No clinic queue. Start from wherever you are.",
    contexts: ["platform"],
    risk: "low",
    notes: "Avoids precise wait-time promises.",
  },
  trust_digital_delivery_label: {
    id: "trust_digital_delivery_label",
    text: "Digital delivery",
    contexts: ["medical_certificate", "prescribing"],
    risk: "low",
    notes: "Replaces unsupported same-day percentage claims.",
  },
  trust_digital_delivery_tooltip: {
    id: "trust_digital_delivery_tooltip",
    text: "If approved, your document or eScript is sent digitally.",
    contexts: ["medical_certificate", "prescribing"],
    risk: "medium",
    notes: "Keeps approval conditional.",
  },
  trust_doctor_issued_label: {
    id: "trust_doctor_issued_label",
    text: "Doctor-issued certificate",
    contexts: ["medical_certificate", "employer"],
    risk: "medium",
    notes: "Use instead of legal-validity claims.",
  },
  trust_doctor_issued_tooltip: {
    id: "trust_doctor_issued_tooltip",
    text: "Issued by an AHPRA-registered doctor. Employer policies may vary.",
    contexts: ["medical_certificate", "employer"],
    risk: "medium",
    notes: "Safe employer-policy caveat.",
  },
  prescription_escript_sent: {
    id: "prescription_escript_sent",
    text: "eScript sent",
    contexts: ["prescribing", "specialty"],
    risk: "medium",
    notes: "Use only where the UI is showing an approved/sent state.",
  },
  prescription_if_approved: {
    id: "prescription_if_approved",
    text: "If approved, your eScript goes straight to your phone.",
    contexts: ["prescribing", "specialty"],
    risk: "medium",
    notes: "Human alternative to sterile clinical-appropriateness copy.",
  },
  employer_verify_authenticity: {
    id: "employer_verify_authenticity",
    text: "Verify certificate authenticity",
    contexts: ["employer"],
    risk: "low",
    notes: "Verification confirms InstantMed issuance, not workplace entitlement.",
  },
  employer_privacy_limited: {
    id: "employer_privacy_limited",
    text: "Privacy-limited result. No diagnosis shown.",
    contexts: ["employer"],
    risk: "low",
    notes: "Employer verification must disclose minimal document facts only.",
  },
}

export function getApprovedClaim(id: ApprovedClaimId): string {
  return APPROVED_CLAIMS[id].text
}
