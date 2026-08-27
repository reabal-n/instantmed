"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  claimVoiceMessageAction,
  reopenVoiceMessageAction,
  resolveVoiceMessageAction,
  updateVoiceMessageMatchAction,
} from "@/app/actions/medical-director-voice-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  VOICE_MESSAGE_RESOLUTION_LABELS,
  VOICE_MESSAGE_RESOLUTION_REASONS,
  type VoiceMessageResolutionReason,
  type VoiceMessageStatus,
} from "@/lib/admin/medical-director-voice-message-types"

interface Props {
  messageId: string
  status: VoiceMessageStatus
  suggestedPatientId: string | null
}

export function VoiceMessageWorkflow({
  messageId,
  status,
  suggestedPatientId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState<VoiceMessageResolutionReason>("actioned")
  const [patientId, setPatientId] = useState(suggestedPatientId ?? "")

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast.error(result.error || "Could not update the voice message")
        return
      }
      toast.success(successMessage)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Workflow
        </h2>
        {status === "new" ? (
          <Button
            disabled={isPending}
            onClick={() => run(
              () => claimVoiceMessageAction(messageId),
              "Message moved to In review",
            )}
          >
            Take ownership
          </Button>
        ) : null}
        {status === "in_review" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as VoiceMessageResolutionReason)}
              disabled={isPending}
            >
              <SelectTrigger aria-label="Resolution reason" className="sm:max-w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_MESSAGE_RESOLUTION_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {VOICE_MESSAGE_RESOLUTION_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={isPending}
              onClick={() => run(
                () => resolveVoiceMessageAction(messageId, reason),
                "Message resolved",
              )}
            >
              Resolve
            </Button>
          </div>
        ) : null}
        {status === "resolved" ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(
              () => reopenVoiceMessageAction(messageId),
              "Message reopened",
            )}
          >
            Reopen
          </Button>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-border/50 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Suggested patient match
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This is a suggestion only, not verified caller identity. Enter an active patient profile ID or clear it.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Patient profile ID"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            placeholder="Patient profile UUID"
            size="sm"
          />
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(
              () => updateVoiceMessageMatchAction(
                messageId,
                patientId.trim() || null,
              ),
              patientId.trim() ? "Suggested match updated" : "Suggested match cleared",
            )}
          >
            Save match
          </Button>
        </div>
      </section>
    </div>
  )
}
