import type { DeclineReasonCode } from "@/types/db"

export interface DeclineReason {
  code: DeclineReasonCode
  label: string
  template: string
}

export const DECLINE_REASONS: DeclineReason[] = [
  {
    code: "not_telehealth_suitable",
    label: "Not suitable online",
    template:
      "Thanks for your request. Based on the information provided, we're unable to safely manage this request through InstantMed. Please book an in-person appointment with your regular doctor.",
  },
  {
    code: "prescribing_guidelines",
    label: "Frequent requests",
    template:
      "Thanks for your request. Due to the number and frequency of your recent requests for this medicine, we're unable to safely issue this prescription. Please contact the clinician managing your condition to review your treatment. If you paid, we'll issue a full refund.",
  },
  {
    code: "urgent_care_needed",
    label: "Urgent care",
    template:
      "Based on the symptoms provided, we recommend urgent in-person assessment. If this is a medical emergency, call 000 or go to your nearest emergency department.",
  },
]
