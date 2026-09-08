"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { getInfoRequestTemplatesAction, requestMoreInfoAction } from "@/app/actions/request-more-info"
import { capture } from "@/lib/analytics/capture"
import type { IntakeWithPatient } from "@/types/db"

import { declineIntakeAction, flagForFollowupAction, getDeclineReasonTemplatesAction, updateStatusAction } from "./actions"

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
  isInfoPending: boolean
  infoError: string | null
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

  const info = useRequestInfoDialog()

  // Flag dialog
  const [flagDialog, setFlagDialog] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")

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

  const selectedTemplate = declineTemplates.find((t) => t.code === declineReasonCode)
  const requiresNote = selectedTemplate?.requires_note || declineReasonCode === "other"

  const handleDeclineTemplateChange = (code: string) => {
    setDeclineReasonCode(code)
    const template = declineTemplates.find((t) => t.code === code)
    if (template?.description && !declineReasonNote) setDeclineReasonNote(template.description)
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
                      toast.success("Decline reversed - case restored to queue")
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
    ...info,
    flagDialog,
    setFlagDialog,
    flagReason,
    setFlagReason,
    handleFlag,
    isPending: isPending || info.isInfoPending,
  }
}

/** Shared queue/full-review clarification state. React 18 transitions do not
 * track async actions, so a ref and explicit busy state own the whole send. */
export function useRequestInfoDialog(onRequested?: () => void | Promise<void>) {
  const router = useRouter()
  const [infoDialog, setInfoDialogState] = useState<string | null>(null)
  const draftIntakeId = useRef<string | null>(null)
  const [infoTemplateCode, setInfoTemplateCode] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [infoTemplates, setInfoTemplates] = useState<Array<{ code: string; label: string; description: string | null; message_template: string | null }>>([])
  const [infoTemplatesLoaded, setInfoTemplatesLoaded] = useState(false)
  const [isInfoPending, setIsInfoPending] = useState(false)
  const inFlight = useRef(false)
  const [infoError, setInfoError] = useState<string | null>(null)

  const setInfoDialog = (id: string | null) => {
    if (inFlight.current) return
    if (id && draftIntakeId.current !== id) {
      setInfoMessage("")
      setInfoTemplateCode("")
      setInfoError(null)
      draftIntakeId.current = id
    }
    setInfoDialogState(id)
  }

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

  const handleInfoTemplateChange = (code: string) => {
    if (inFlight.current) return
    setInfoTemplateCode(code)
    const template = infoTemplates.find((t) => t.code === code)
    if (template?.message_template) setInfoMessage(template.message_template)
  }

  const handleRequestInfo = async () => {
    if (inFlight.current || !infoDialog || !infoTemplateCode || !infoMessage.trim()) return
    inFlight.current = true
    setIsInfoPending(true)
    setInfoError(null)
    try {
      const result = await requestMoreInfoAction(infoDialog, infoTemplateCode, infoMessage)
      if (!result.success) {
        const error = result.error || "Failed to save information request"
        setInfoError(error)
        toast.error(error)
        return
      }
      // Clear only after durable success, even when the separate email failed.
      setInfoDialogState(null)
      setInfoTemplateCode("")
      setInfoMessage("")
      draftIntakeId.current = null
      if (result.notificationWarning) toast.warning(result.notificationWarning, { duration: 12000 })
      else toast.success("Information request saved and notification email sent")
      router.refresh()
      try {
        await onRequested?.()
      } catch {
        toast.warning("Information request saved. Refresh the review to see the latest state.")
      }
    } catch {
      const error = "Could not confirm the request. Your draft is retained. Check the patient message thread before trying again."
      setInfoError(error)
      toast.error(error)
    } finally {
      inFlight.current = false
      setIsInfoPending(false)
    }
  }

  return { infoDialog, setInfoDialog, infoTemplateCode, infoMessage, setInfoMessage, infoTemplates, handleRequestInfo, handleInfoTemplateChange, isInfoPending, infoError }
}
