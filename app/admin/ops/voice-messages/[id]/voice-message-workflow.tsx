"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  claimVoiceMessageAction,
  reopenVoiceMessageAction,
  resolveVoiceMessageAction,
  updateVoiceMessageMatchAction,
} from "@/app/actions/medical-director-voice-messages"
import { searchPatientDirectoryAction } from "@/app/doctor/patients/search-actions"
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
  suggestedPatient: {
    id: string
    fullName: string
  } | null
}

interface PatientSearchOption {
  dateOfBirth: string | null
  email: string | null
  fullName: string
  id: string
}

function formatDateOfBirth(value: string | null): string {
  if (!value) return "Date of birth not recorded"
  const [year, month, day] = value.split("-")
  return year && month && day ? `Born ${day}/${month}/${year}` : `Born ${value}`
}

export function VoiceMessageWorkflow({
  messageId,
  status,
  suggestedPatient,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSearchPending, startSearchTransition] = useTransition()
  const [reason, setReason] = useState<VoiceMessageResolutionReason>("actioned")
  const [patientSearch, setPatientSearch] = useState("")
  const [patientMatches, setPatientMatches] = useState<PatientSearchOption[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(suggestedPatient)

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error || "Could not update the voice message")
          return
        }
        onSuccess?.()
        toast.success(successMessage)
        router.refresh()
      } catch {
        toast.error("Could not update the voice message")
      }
    })
  }

  function searchPatients(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = patientSearch.trim()
    if (!query || isSearchPending) return

    startSearchTransition(async () => {
      setHasSearched(false)
      try {
        const result = await searchPatientDirectoryAction({
          page: 1,
          pageSize: 10,
          query,
          sort: "name",
        })
        setHasSearched(true)
        if (!result.success) {
          setPatientMatches([])
          toast.error(result.error)
          return
        }
        setPatientMatches(result.data.patients.map((patient) => ({
          dateOfBirth: patient.date_of_birth,
          email: patient.email,
          fullName: patient.full_name,
          id: patient.id,
        })))
      } catch {
        setHasSearched(true)
        setPatientMatches([])
        toast.error("The patient-directory lookup could not be completed.")
      }
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
          Search the private patient directory, then compare the date of birth before selecting. A match is a suggestion only; it does not verify caller identity.
        </p>
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={searchPatients}>
          <Input
            label="Search patients"
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
            placeholder="Name, email, or suburb"
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="outline"
            isLoading={isSearchPending}
            disabled={!patientSearch.trim()}
          >
            Search
          </Button>
        </form>

        {hasSearched ? (
          patientMatches.length > 0 ? (
            <ul aria-label="Patient search results" className="space-y-1.5">
              {patientMatches.map((patient) => {
                const isSelected = selectedPatient?.id === patient.id
                return (
                  <li key={patient.id}>
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      aria-pressed={isSelected}
                      className="h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left"
                      onClick={() => setSelectedPatient({
                        id: patient.id,
                        fullName: patient.fullName,
                      })}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-foreground">
                          {patient.fullName}
                        </span>
                        <span className="block text-[11px] font-normal text-muted-foreground [overflow-wrap:anywhere]">
                          {[formatDateOfBirth(patient.dateOfBirth), patient.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p role="status" className="text-xs text-muted-foreground">
              No active patients matched that search.
            </p>
          )
        ) : null}

        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Selected suggestion
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {selectedPatient?.fullName ?? "No patient selected"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isPending || !selectedPatient}
              onClick={() => run(
                () => updateVoiceMessageMatchAction(
                  messageId,
                  selectedPatient?.id ?? null,
                ),
                "Suggested match updated",
              )}
            >
              Save match
            </Button>
            <Button
              variant="ghost"
              disabled={isPending || !selectedPatient}
              onClick={() => run(
                () => updateVoiceMessageMatchAction(messageId, null),
                "Suggested match cleared",
                () => setSelectedPatient(null),
              )}
            >
              Clear match
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
