import type { DeclineReasonCode } from "@/types/db"

export interface DeclineReason {
  code: DeclineReasonCode
  label: string
  template: string
}

export const DECLINE_REASONS: DeclineReason[] = [
  { code: "requires_examination", label: "In-person assessment needed", template: "Your request needs an in-person assessment before we can safely proceed. Please book an appointment with your GP." },
  { code: "usual_clinician_review", label: "Usual clinician review needed", template: "This request needs a review with the clinician managing your condition, so your treatment and follow-up can be considered together." },
  { code: "prescribing_guidelines", label: "Prescription not appropriate", template: "After reviewing your information, we're unable to safely issue this prescription. [Specific reason and recommended next step.]" },
  { code: "repeat_too_soon", label: "Repeat requested too soon", template: "Based on your recent prescription and the information provided, we're unable to issue another supply at this time. [Explain the recent supply, timing concern and next step.]" },
  { code: "outside_scope", label: "Outside our service scope", template: "We're unable to provide the treatment or document you've requested through this service. [Explain the limitation and where to seek help.]" },
  { code: "duplicate_request", label: "Duplicate request", template: "This duplicates another request for the same service, so we've closed this request. Please refer to your other request for updates." },
  { code: "patient_cancelled", label: "Patient requested cancellation", template: "We've cancelled this request as you asked." },
  { code: "urgent_care_needed", label: "Urgent assessment needed", template: "Your symptoms need urgent assessment. [Specify where to seek care, how soon, and what to do if symptoms worsen.]" },
  { code: "other", label: "Other reason", template: "" },
]

export function isAdministrativeClosure(code: string | undefined): boolean {
  return code === "duplicate_request" || code === "patient_cancelled"
}

/** Patient text must be deliberately selected and completed before it can be sent. */
export function validateDeclineReason(code: string | undefined, note: string | undefined): string | null {
  if (!DECLINE_REASONS.some(reason => reason.code === code)) return "Choose a reason."
  if (!note?.trim()) return "Add an explanation and any next steps for the patient."
  if (note.includes("[") || note.includes("]")) return "Replace all bracketed instructions with patient-specific details."
  return null
}
