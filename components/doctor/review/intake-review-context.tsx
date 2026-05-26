"use client"

import { createContext, type RefObject, useContext } from "react"

import type { AIDraft } from "@/app/actions/draft-approval"
import type { PatientThreadMessage } from "@/lib/data/patient-messages"
import type { RenewalMatch } from "@/lib/doctor/renewal-format"
import type { DeclineReasonCode, IntakeStatus, IntakeWithDetails, IntakeWithPatient, PatientNote } from "@/types/db"

export interface ReviewData {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  aiDrafts: AIDraft[]
  nextIntakeId: string | null
  previousIntakes?: IntakeWithPatient[]
  previousIntakeCount?: number
  patientNotes?: PatientNote[]
  draftId: string | null
  certificate?: {
    id: string
    email_sent_at: string | null
    email_failed_at?: string | null
    email_failure_reason?: string | null
    email_opened_at: string | null
    resend_count: number
  } | null
  patientMessages?: PatientThreadMessage[]
  /**
   * Populated by the review-data API when the intake is a renewal of a
   * prior active/completed prescription for the same patient. Drives the
   * inline `RenewalLink` smart-link on the cockpit. Null when the intake
   * is not a renewal or the lookup failed (fail-soft).
   */
  renewalMatch?: RenewalMatch | null
}

export interface IntakeReviewContextValue {
  // Data
  data: ReviewData
  intake: IntakeWithDetails
  service: { name?: string; type?: string; short_name?: string } | undefined
  answers: Record<string, unknown>
  intakeAnswers: Record<string, unknown> | undefined

  // Safety flags
  hasRedFlags: boolean
  redFlagDetails: string[]
  redFlagsAcknowledged: boolean
  setRedFlagsAcknowledged: (v: boolean) => void

  // Clinical notes
  doctorNotes: string
  setDoctorNotes: (v: string) => void
  setInitialNotes: (notes: string, dbNotes: string) => void
  noteSaved: boolean
  setNoteSaved: (v: boolean) => void
  noteDirty: boolean
  savedAt: Date | null
  isAutoSaving: boolean
  autoSaveError: boolean
  isAiPrefilled: boolean
  hasClinicalDraft: boolean
  isRegenerating: boolean
  notesRef: RefObject<HTMLTextAreaElement>

  // Pending state
  isPending: boolean
  isResending?: boolean
  isViewingCert?: boolean

  // Actions
  handleMedCertApprove: () => Promise<void>
  handleStatusChange: (status: IntakeStatus) => Promise<void>
  handleDecline: () => Promise<void>
  handleSaveNotes: () => Promise<void>
  handleGenerateOrRegenerateNote: () => Promise<void>
  handleOpenParchmentPrescribe: () => void
  handleApproveAndOpenParchment: () => Promise<void>
  handleResend?: () => Promise<void>
  handleViewCertificate?: () => Promise<void>

  // Decline dialog
  showDeclineDialog: boolean
  setShowDeclineDialog: (v: boolean) => void
  declineReason: string
  setDeclineReason: (v: string) => void
  declineReasonCode: DeclineReasonCode
  handleDeclineReasonCodeChange: (code: DeclineReasonCode) => void

  // Certificate preview
  isLoadingPreview: boolean

  // Helpers
  formatDate: (dateString: string) => string
  getStatusColor: (status: string) => string
}

const IntakeReviewContext = createContext<IntakeReviewContextValue | null>(null)

export function IntakeReviewProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: IntakeReviewContextValue
}) {
  return (
    <IntakeReviewContext.Provider value={value}>
      {children}
    </IntakeReviewContext.Provider>
  )
}

export function useIntakeReview() {
  const ctx = useContext(IntakeReviewContext)
  if (!ctx) {
    throw new Error("useIntakeReview must be used within IntakeReviewProvider")
  }
  return ctx
}
