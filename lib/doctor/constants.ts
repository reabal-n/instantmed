import type { DeclineReasonCode } from "@/types/db"

export interface DeclineReason {
  code: DeclineReasonCode
  label: string
  template: string
}

export const DECLINE_REASONS: DeclineReason[] = [
  { code: "not_telehealth_suitable", label: "Not suitable for telehealth", template: "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please see your regular doctor or book an in-person appointment." },
  { code: "prescribing_guidelines", label: "Against prescribing guidelines", template: "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular doctor who has access to your full medical history." },
  { code: "controlled_substance", label: "Controlled substance", template: "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular doctor who can assess you in person." },
  { code: "urgent_care_needed", label: "Requires urgent care", template: "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency." },
  { code: "other", label: "Other", template: "" },
]
