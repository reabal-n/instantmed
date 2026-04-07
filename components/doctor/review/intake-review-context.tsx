"use client"

import { createContext, useContext, type RefObject } from "react"
import type { IntakeWithDetails, IntakeStatus, DeclineReasonCode } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"

export interface ReviewData {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  aiDrafts: AIDraft[]
  nextIntakeId: string | null
  draftId: string | null
  certificate?: {
    id: string
    email_sent_at: string | null
    email_opened_at: string | null
    resend_count: number
  } | null
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
  noteSaved: boolean
  setNoteSaved: (v: boolean) => void
  isAiPrefilled: boolean
  hasClinicalDraft: boolean
  isRegenerating: boolean
  notesRef: RefObject<HTMLTextAreaElement>

  // Pending state
  isPending: boolean

  // Actions
  handleMedCertApprove: () => Promise<void>
  handleStatusChange: (status: IntakeStatus) => Promise<void>
  handleDecline: () => Promise<void>
  handleSaveNotes: () => Promise<void>
  handleGenerateOrRegenerateNote: () => Promise<void>

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
