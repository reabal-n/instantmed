"use client"

import { useCallback,useState } from "react"

import type { CertificatePreviewData } from "@/components/doctor"
import type { DeclineReasonCode } from "@/types/db"

import { DECLINE_REASONS } from "./intake-detail-header"

export interface IntakeDialogState {
  // Decline
  showDeclineDialog: boolean
  openDeclineDialog: () => void
  closeDeclineDialog: () => void
  declineReason: string
  setDeclineReason: (val: string) => void
  declineReasonCode: DeclineReasonCode
  onDeclineReasonCodeChange: (code: DeclineReasonCode) => void

  // Script
  showScriptDialog: boolean
  openScriptDialog: () => void
  closeScriptDialog: () => void
  parchmentReference: string
  setParchmentReference: (val: string) => void

  // Refund
  showRefundDialog: boolean
  openRefundDialog: () => void
  closeRefundDialog: () => void

  // Reissue
  showReissueDialog: boolean
  setShowReissueDialog: (val: boolean) => void
  reissuePreviewData: CertificatePreviewData | null
  setReissuePreviewData: (val: CertificatePreviewData | null) => void
}

export function useIntakeDialogs(initialOpenDecline = false): IntakeDialogState {
  const [showDeclineDialog, setShowDeclineDialog] = useState(initialOpenDecline)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].template)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

  const [showScriptDialog, setShowScriptDialog] = useState(false)
  const [parchmentReference, setParchmentReference] = useState("")

  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [showReissueDialog, setShowReissueDialog] = useState(false)
  const [reissuePreviewData, setReissuePreviewData] = useState<CertificatePreviewData | null>(null)

  const openDeclineDialog = useCallback(() => setShowDeclineDialog(true), [])
  const closeDeclineDialog = useCallback(() => {
    setShowDeclineDialog(false)
    setDeclineReason(DECLINE_REASONS[0].template)
    setDeclineReasonCode("requires_examination")
  }, [])

  const onDeclineReasonCodeChange = useCallback((code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find((r) => r.code === code)
    if (template?.template !== undefined) {
      setDeclineReason(template.template)
    }
  }, [])

  const openScriptDialog = useCallback(() => setShowScriptDialog(true), [])
  const closeScriptDialog = useCallback(() => {
    setShowScriptDialog(false)
    setParchmentReference("")
  }, [])

  const openRefundDialog = useCallback(() => setShowRefundDialog(true), [])
  const closeRefundDialog = useCallback(() => setShowRefundDialog(false), [])

  return {
    showDeclineDialog,
    openDeclineDialog,
    closeDeclineDialog,
    declineReason,
    setDeclineReason,
    declineReasonCode,
    onDeclineReasonCodeChange,
    showScriptDialog,
    openScriptDialog,
    closeScriptDialog,
    parchmentReference,
    setParchmentReference,
    showRefundDialog,
    openRefundDialog,
    closeRefundDialog,
    showReissueDialog,
    setShowReissueDialog,
    reissuePreviewData,
    setReissuePreviewData,
  }
}
