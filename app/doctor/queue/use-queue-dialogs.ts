"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { declineIntakeAction, flagForFollowupAction, getDeclineReasonTemplatesAction, updateStatusAction } from "./actions"
import { getInfoRequestTemplatesAction, requestMoreInfoAction } from "@/app/actions/request-more-info"
import { toast } from "sonner"
import { capture } from "@/lib/analytics/capture"
import type { IntakeWithPatient } from "@/types/db"

export interface QueueDialogState {
  // Decline
  declineDialog: string | null
  setDeclineDialog: (id: string | null) => void
  declineReasonCode: string
  setDeclineReasonCode: (code: string) => void
  declineReasonNote: string
  setDeclineReasonNote: (note: string) => void
  declineTemplates: Array<{ code: string; label: string; description: string | null; requires_note: boolean }>
  handleDecline: () => void
  handleDeclineTemplateChange: (code: string) => void
  requiresNote: boolean

  // Info request
  infoDialog: string | null
  setInfoDialog: (id: string | null) => void
  infoTemplateCode: string
  infoMessage: string
  setInfoMessage: (msg: string) => void
  infoTemplates: Array<{ code: string; label: string; description: string | null; message_template: string | null }>
  handleRequestInfo: () => void
  handleInfoTemplateChange: (code: string) => void

  // Flag
  flagDialog: string | null
  setFlagDialog: (id: string | null) => void
  flagReason: string
  setFlagReason: (reason: string) => void
  handleFlag: () => void

  // Revoke
  revokeDialog: string | null
  setRevokeDialog: (id: string | null) => void
  revokeReason: string
  setRevokeReason: (reason: string) => void

  isPending: boolean
}

interface UseQueueDialogsOptions {
  intakes: IntakeWithPatient[]
  setIntakes: React.Dispatch<React.SetStateAction<IntakeWithPatient[]>>
}

export function useQueueDialogs({ intakes, setIntakes }: UseQueueDialogsOptions): QueueDialogState {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Decline dialog
  const [declineDialog, setDeclineDialog] = useState<string | null>(null)
  const [declineReasonCode, setDeclineReasonCode] = useState("")
  const [declineReasonNote, setDeclineReasonNote] = useState("")
  const [declineTemplates, setDeclineTemplates] = useState<Array<{ code: string; label: string; description: string | null; requires_note: boolean }>>([])
  const [declineTemplatesLoaded, setDeclineTemplatesLoaded] = useState(false)

  // Info dialog
  const [infoDialog, setInfoDialog] = useState<string | null>(null)
  const [infoTemplateCode, setInfoTemplateCode] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [infoTemplates, setInfoTemplates] = useState<Array<{ code: string; label: string; description: string | null; message_template: string | null }>>([])
  const [infoTemplatesLoaded, setInfoTemplatesLoaded] = useState(false)

  // Flag dialog
  const [flagDialog, setFlagDialog] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")

  // Revoke dialog
  const [revokeDialog, setRevokeDialog] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState("")

  // Lazy-load templates
  useEffect(() => {
    if (declineDialog && !declineTemplatesLoaded) {
      getDeclineReasonTemplatesAction().then((result) => {
        if (result.success && result.templates) {
          setDeclineTemplates(result.templates)
          setDeclineTemplatesLoaded(true)
        }
      })
    }
  }, [declineDialog, declineTemplatesLoaded])

  useEffect(() => {
    if (infoDialog && !infoTemplatesLoaded) {
      getInfoRequestTemplatesAction().then((result) => {
        if (result.success && result.templates) {
          setInfoTemplates(result.templates)
          setInfoTemplatesLoaded(true)
        }
      })
    }
  }, [infoDialog, infoTemplatesLoaded])

  const selectedTemplate = declineTemplates.find((t) => t.code === declineReasonCode)
  const requiresNote = selectedTemplate?.requires_note || declineReasonCode === "other"

  const handleDeclineTemplateChange = (code: string) => {
    setDeclineReasonCode(code)
    const template = declineTemplates.find((t) => t.code === code)
    if (template?.description && !declineReasonNote) setDeclineReasonNote(template.description)
  }

  const handleInfoTemplateChange = (code: string) => {
    setInfoTemplateCode(code)
    const template = infoTemplates.find((t) => t.code === code)
    if (template?.message_template) setInfoMessage(template.message_template)
  }

  const handleDecline = async () => {
    if (!declineDialog || !declineReasonCode) return
    if (requiresNote && !declineReasonNote.trim()) return
    const declinedId = declineDialog
    startTransition(async () => {
      const result = await declineIntakeAction(declinedId, declineReasonCode, declineReasonNote || undefined)
      if (result.success) {
        capture("doctor_decline_submitted", {
          intake_id: declinedId,
          reason_code: declineReasonCode,
        })
        const declinedIntake = intakes.find((r) => r.id === declinedId)
        setIntakes((prev) => prev.filter((r) => r.id !== declinedId))
        setDeclineDialog(null)
        setDeclineReasonCode("")
        setDeclineReasonNote("")
        toast.success("Case declined and patient notified", {
          action: declinedIntake
            ? {
                label: "Undo",
                onClick: () => {
                  startTransition(async () => {
                    const undoResult = await updateStatusAction(declinedId, "paid")
                    if (undoResult.success) {
                      setIntakes((prev) => [declinedIntake, ...prev])
                      toast.success("Decline reversed — case restored to queue")
                      router.refresh()
                    } else {
                      toast.error(undoResult.error || "Failed to undo decline")
                    }
                  })
                },
              }
            : undefined,
          duration: 8000,
        })
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const handleRequestInfo = async () => {
    if (!infoDialog || !infoTemplateCode) return
    startTransition(async () => {
      const result = await requestMoreInfoAction(infoDialog, infoTemplateCode, infoMessage)
      if (result.success) {
        toast.success("Information request sent to patient")
        setInfoDialog(null)
        setInfoTemplateCode("")
        setInfoMessage("")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to send request")
      }
    })
  }

  const handleFlag = async () => {
    if (!flagDialog || !flagReason.trim()) return
    startTransition(async () => {
      const result = await flagForFollowupAction(flagDialog, flagReason)
      if (result.success) {
        setIntakes((prev) =>
          prev.map((r) => (r.id === flagDialog ? { ...r, flagged_for_followup: true } : r))
        )
        toast.success("Flagged for follow-up")
        setFlagDialog(null)
        setFlagReason("")
      } else {
        toast.error(result.error || "Failed to flag case")
      }
    })
  }

  return {
    declineDialog,
    setDeclineDialog,
    declineReasonCode,
    setDeclineReasonCode,
    declineReasonNote,
    setDeclineReasonNote,
    declineTemplates,
    handleDecline,
    handleDeclineTemplateChange,
    requiresNote,
    infoDialog,
    setInfoDialog,
    infoTemplateCode,
    infoMessage,
    setInfoMessage,
    infoTemplates,
    handleRequestInfo,
    handleInfoTemplateChange,
    flagDialog,
    setFlagDialog,
    flagReason,
    setFlagReason,
    handleFlag,
    revokeDialog,
    setRevokeDialog,
    revokeReason,
    setRevokeReason,
    isPending,
  }
}
