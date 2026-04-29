import type { DeclineReasonCode } from "@/types/db"

/**
 * Pre-filled decline reason templates for the doctor review surface.
 *
 * Lifted out of `app/doctor/intakes/[id]/intake-detail-header.tsx` in
 * Phase 2 of the doctor + admin portal rebuild (2026-04-29). Same
 * pattern as `lib/services/service-catalog.ts` — single source of
 * truth so admin can extend with bespoke reasons later without
 * touching UI files.
 *
 * P0 DOCTOR_WORKLOAD_AUDIT: equalises approve/decline effort by
 * giving the doctor a one-click decline path with a pre-filled
 * patient-facing template. The doctor can override before sending.
 */
export interface DeclineReason {
  code: DeclineReasonCode
  label: string
  /** Patient-facing template body. Sent verbatim if doctor doesn't customise. */
  template: string
}

export const DECLINE_REASONS: DeclineReason[] = [
  {
    code: "requires_examination",
    label: "Requires in-person examination",
    template:
      "This condition requires a physical examination that cannot be conducted via telehealth. Please see your regular doctor or visit a clinic for an in-person assessment.",
  },
  {
    code: "not_telehealth_suitable",
    label: "Not suitable for telehealth",
    template:
      "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please book a video/phone consultation or see your regular doctor.",
  },
  {
    code: "prescribing_guidelines",
    label: "Against prescribing guidelines",
    template:
      "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular doctor who has access to your full medical history.",
  },
  {
    code: "controlled_substance",
    label: "Controlled substance request",
    template:
      "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular doctor who can assess you in person.",
  },
  {
    code: "urgent_care_needed",
    label: "Requires urgent care",
    template:
      "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency.",
  },
  {
    code: "insufficient_info",
    label: "Insufficient information",
    template:
      "We need more information to safely assess your request. Please provide additional details about your condition and medical history, or see your regular doctor.",
  },
  {
    code: "patient_not_eligible",
    label: "Patient not eligible",
    template:
      "Based on the eligibility criteria, we are unable to process this request. Please see your regular doctor for assistance.",
  },
  {
    code: "outside_scope",
    label: "Outside scope of practice",
    template:
      "This request falls outside the scope of what can be safely managed via telehealth. Please consult with your regular doctor or an appropriate specialist.",
  },
  {
    code: "other",
    label: "Other reason",
    template: "",
  },
]
