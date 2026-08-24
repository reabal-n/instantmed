import type { DeclineReasonCode } from "@/types/db"

export interface DeclineReason {
  code: DeclineReasonCode
  label: string
  template: string
}

export const DECLINE_REASONS: DeclineReason[] = [
  {
    code: "not_telehealth_suitable",
    label: "Not suitable for telehealth",
    template:
      "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please see your regular doctor or book an in-person appointment.",
  },
  {
    code: "prescribing_guidelines",
    label: "Frequent medicine requests",
    template:
      "Thanks for your request. I'm sorry, but due to the number and frequency of your recent requests for this medicine, we're unable to safely issue this prescription. Please contact the clinician managing your condition to review your treatment. If you paid, you'll receive a full refund.",
  },
  {
    code: "urgent_care_needed",
    label: "Refer to urgent care",
    template:
      "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency.",
  },
]
