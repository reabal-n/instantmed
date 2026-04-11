"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Save, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { DraftReviewPanel } from "@/components/doctor/draft-review-panel"
import { RepeatPrescriptionChecklist } from "@/components/doctor/repeat-prescription-checklist"
import { formatDateTime } from "@/lib/format"
import type { IntakeWithDetails } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"
import { MIN_CLINICAL_NOTES_LENGTH } from "@/components/doctor/review/utils"

interface IntakeDetailDraftsProps {
  intake: IntakeWithDetails
  aiDrafts: AIDraft[]
  doctorNotes: string
  setDoctorNotes: (val: string) => void
  noteSaved: boolean
  isAiPrefilled: boolean
  isPending: boolean
  isRegenerating: boolean
  hasClinicalDraft: boolean
  notesRef: React.RefObject<HTMLTextAreaElement>
  onSaveNotes: () => void
  onGenerateOrRegenerateNote: () => void
}

export function IntakeDetailDrafts({
  intake,
  aiDrafts,
  doctorNotes,
  setDoctorNotes,
  noteSaved,
  isAiPrefilled,
  isPending,
  isRegenerating,
  hasClinicalDraft,
  notesRef,
  onSaveNotes,
  onGenerateOrRegenerateNote,
}: IntakeDetailDraftsProps) {
  const router = useRouter()
  const service = intake.service as { type?: string } | undefined

  return (
    <>
      {/* AI-Generated Drafts (excludes clinical_note - shown in Clinical Notes textarea) */}
      {(() => {
        const nonNoteDrafts = aiDrafts.filter((d) => d.type !== "clinical_note")
        return nonNoteDrafts.length > 0 ? (
          <DraftReviewPanel
            drafts={nonNoteDrafts}
            intakeId={intake.id}
            onDraftApproved={() => router.refresh()}
            onDraftRejected={() => router.refresh()}
            onRegenerated={() => router.refresh()}
          />
        ) : null
      })()}

      {/* Repeat Prescription Checklist */}
      {service?.type === "common_scripts" && (
        <RepeatPrescriptionChecklist
          intakeId={intake.id}
          intakeStatus={intake.status}
          aiDrafts={aiDrafts}
          prescriptionSentAt={intake.prescription_sent_at || null}
          prescriptionSentChannel={intake.prescription_sent_channel || null}
        />
      )}

      {/* Doctor Notes - Editable for pending, read-only for approved/completed */}
      <Card>
        <CardHeader className="py-3 px-4">
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
        <CardContent className="px-4 py-3 space-y-3">
          {["approved", "completed", "awaiting_script"].includes(intake.status) ? (
            // Read-only view for approved intakes
            <div className="space-y-2">
              {intake.doctor_notes ? (
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
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
                  className="min-h-[120px] text-sm"
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                  {noteSaved && <span className="text-xs text-success">Saved!</span>}
                </div>
                {/* Minimum-length hint for AHPRA defensibility */}
                <span
                  className={`text-xs tabular-nums ${
                    doctorNotes.trim().length >= MIN_CLINICAL_NOTES_LENGTH
                      ? "text-muted-foreground"
                      : "text-amber-600 dark:text-amber-500"
                  }`}
                  aria-live="polite"
                >
                  {doctorNotes.trim().length}/{MIN_CLINICAL_NOTES_LENGTH} min
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
