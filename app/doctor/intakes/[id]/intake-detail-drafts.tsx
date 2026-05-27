"use client"

import { FileText, Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"

import type { AIDraft } from "@/app/actions/draft-approval"
import { DraftReviewPanel, RepeatPrescriptionChecklist } from "@/components/doctor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { isClinicalNoteSufficient } from "@/lib/doctor/clinical-notes"
import { formatDateTime } from "@/lib/format"
import type { IntakeWithDetails } from "@/types/db"

interface IntakeDetailDraftsProps {
  intake: IntakeWithDetails
  aiDrafts: AIDraft[]
  doctorNotes: string
  setDoctorNotes: (val: string) => void
  noteSaved: boolean
  notesAutoSaving: boolean
  notesAutoSaveError: string | null
  lastSavedDoctorNotesAt: string | null
  noteDirty: boolean
  isAiPrefilled: boolean
  isPending: boolean
  isRegenerating: boolean
  hasClinicalDraft: boolean
  notesRef: React.RefObject<HTMLTextAreaElement>
  onSaveNotes: () => void
  onGenerateOrRegenerateNote: () => void
  compact?: boolean
}

export function IntakeDetailDrafts({
  intake,
  aiDrafts,
  doctorNotes,
  setDoctorNotes,
  noteSaved,
  notesAutoSaving,
  notesAutoSaveError,
  lastSavedDoctorNotesAt,
  noteDirty,
  isAiPrefilled,
  isPending,
  isRegenerating,
  hasClinicalDraft,
  notesRef,
  onSaveNotes,
  onGenerateOrRegenerateNote,
  compact = false,
}: IntakeDetailDraftsProps) {
  const router = useRouter()
  const service = intake.service as { type?: string } | undefined

  return (
    <>
      {/* AI-Generated Drafts (excludes clinical_note - shown in Clinical Notes textarea) */}
      {(() => {
        const nonNoteDrafts = aiDrafts.filter((d) => d.type !== "clinical_note")
        return nonNoteDrafts.length > 0 ? (
          compact ? (
            <details className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-blue-950">
                AI drafts ({nonNoteDrafts.length})
              </summary>
              <div className="mt-3">
                <DraftReviewPanel
                  drafts={nonNoteDrafts}
                  intakeId={intake.id}
                  onDraftApproved={() => router.refresh()}
                  onDraftRejected={() => router.refresh()}
                  onRegenerated={() => router.refresh()}
                />
              </div>
            </details>
          ) : (
            <DraftReviewPanel
              drafts={nonNoteDrafts}
              intakeId={intake.id}
              onDraftApproved={() => router.refresh()}
              onDraftRejected={() => router.refresh()}
              onRegenerated={() => router.refresh()}
            />
          )
        ) : null
      })()}

      {/* Repeat Prescription Checklist */}
      {service?.type === "common_scripts" && (
        compact ? (
          <details className="rounded-lg border border-border/70 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Repeat prescription checklist
            </summary>
            <div className="mt-3">
              <RepeatPrescriptionChecklist
                intakeId={intake.id}
                intakeStatus={intake.status}
                aiDrafts={aiDrafts}
                scriptSent={Boolean(intake.script_sent)}
                scriptSentAt={intake.script_sent_at || null}
                scriptSentChannel={intake.parchment_reference ? "Parchment" : null}
                compact={compact}
              />
            </div>
          </details>
        ) : (
          <RepeatPrescriptionChecklist
            intakeId={intake.id}
            intakeStatus={intake.status}
            aiDrafts={aiDrafts}
            scriptSent={Boolean(intake.script_sent)}
            scriptSentAt={intake.script_sent_at || null}
            scriptSentChannel={intake.parchment_reference ? "Parchment" : null}
            compact={compact}
          />
        )
      )}

      {/* Doctor Notes - Editable for pending, read-only for approved/completed */}
      <Card hoverable={false}>
        <CardHeader className={compact ? "px-4 py-2.5" : "py-3 px-4"}>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {["approved", "completed", "awaiting_script"].includes(intake.status)
              ? "Approved Clinical Note"
              : "Clinical Notes (Private)"}
            {isAiPrefilled && !["approved", "completed", "awaiting_script"].includes(intake.status) && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                AI Draft
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "px-4 pb-3 space-y-2" : "px-4 py-3 space-y-3"}>
          {["approved", "completed", "awaiting_script"].includes(intake.status) ? (
            // Read-only view for approved intakes
            <div className="space-y-2">
              {intake.doctor_notes ? (
                <div className={compact ? "max-h-56 overflow-y-auto rounded-lg border border-border/50 bg-muted/50 p-3" : "p-3 bg-muted/50 rounded-lg border border-border/50"}>
                  <p className="text-sm whitespace-pre-wrap">{intake.doctor_notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No clinical notes recorded for this case.</p>
              )}
              {intake.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Reviewed on {formatDateTime(intake.reviewed_at)}
                </p>
              )}
            </div>
          ) : (
            // Editable view for pending intakes
            <>
              {isAiPrefilled && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled from AI draft. Edits save on approval, or click Save to persist now.
                </p>
              )}
              {isRegenerating && !doctorNotes ? (
                <div className="flex items-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating draft...</span>
                </div>
              ) : (
                <Textarea
                  ref={notesRef}
                  placeholder="Add your clinical notes here... (⌘+N to focus)"
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  disabled={isPending || isRegenerating}
                  className={compact ? "min-h-24 text-sm" : "min-h-[120px] text-sm"}
                />
              )}
              {notesAutoSaveError && (
                <div role="status" className="rounded-lg border border-warning-border bg-warning-light/40 px-3 py-2 text-xs text-warning">
                  <span className="font-medium">Autosave is having trouble.</span>{" "}
                  Use Save Notes before approving.
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={onSaveNotes} disabled={isPending || isRegenerating} variant="outline" size="sm">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save Notes
                  </Button>
                  <Button
                    onClick={onGenerateOrRegenerateNote}
                    disabled={isPending || isRegenerating}
                    variant={hasClinicalDraft ? "ghost" : "outline"}
                    size="sm"
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isRegenerating
                      ? "Generating..."
                      : hasClinicalDraft
                        ? "Regenerate AI draft"
                        : "Generate AI draft"}
                  </Button>
                  {notesAutoSaving && (
                    <span className="text-xs text-muted-foreground">Auto-saving...</span>
                  )}
                  {!notesAutoSaving && noteSaved && <span className="text-xs text-success">Saved!</span>}
                  {!notesAutoSaving && !noteSaved && noteDirty && !isPending && (
                    <span className="text-xs text-warning">Unsaved clinical notes</span>
                  )}
                  {!notesAutoSaving && !noteDirty && lastSavedDoctorNotesAt && (
                    <span className="text-xs text-muted-foreground">
                      Last saved {formatDateTime(lastSavedDoctorNotesAt)}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs tabular-nums ${
                    isClinicalNoteSufficient(doctorNotes)
                      ? "text-muted-foreground"
                      : "text-amber-600 dark:text-amber-500"
                  }`}
                  aria-live="polite"
                >
                  {isClinicalNoteSufficient(doctorNotes) ? "Note ready" : "Add a note before deciding"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
