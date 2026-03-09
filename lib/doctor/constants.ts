import type { DeclineReasonCode } from "@/types/db"

export interface DeclineReason {
  code: DeclineReasonCode
  label: string
  template: string
}

export const DECLINE_REASONS: DeclineReason[] = [
  { code: "requires_examination", label: "Requires in-person examination", template: "This condition requires a physical examination that cannot be conducted via telehealth. Please see your regular doctor or visit a clinic for an in-person assessment." },
  { code: "not_telehealth_suitable", label: "Not suitable for telehealth", template: "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please book a video/phone consultation or see your regular doctor." },
  { code: "prescribing_guidelines", label: "Against prescribing guidelines", template: "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular doctor who has access to your full medical history." },
  { code: "controlled_substance", label: "Controlled substance request", template: "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular doctor who can assess you in person." },
  { code: "urgent_care_needed", label: "Requires urgent care", template: "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency." },
  { code: "insufficient_info", label: "Insufficient information", template: "We need more information to safely assess your request. Please provide additional details about your condition and medical history, or see your regular doctor." },
  { code: "patient_not_eligible", label: "Patient not eligible", template: "Based on the eligibility criteria, we are unable to process this request. Please see your regular doctor for assistance." },
  { code: "outside_scope", label: "Outside scope of practice", template: "This request falls outside the scope of what can be safely managed via telehealth. Please consult with your regular doctor or an appropriate specialist." },
  { code: "other", label: "Other reason", template: "" },
]
