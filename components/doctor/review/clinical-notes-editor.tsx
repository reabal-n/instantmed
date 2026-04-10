"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Save, Loader2 } from "lucide-react"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { FormattingToolbar } from "@/components/doctor/review/formatting-toolbar"
import { MIN_CLINICAL_NOTES_LENGTH } from "@/components/doctor/review/utils"

export function ClinicalNotesEditor() {
  const {
    intake,
    doctorNotes,
    setDoctorNotes,
    noteSaved,
    setNoteSaved,
    isAiPrefilled,
    hasClinicalDraft,
    isRegenerating,
    isPending,
    notesRef,
    handleSaveNotes,
    handleGenerateOrRegenerateNote,
  } = useIntakeReview()

  const isReadonly = ["approved", "completed", "awaiting_script"].includes(intake.status)

  return (
    <Card>
      <CardHeader className="py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          {isReadonly ? "Approved Clinical Note" : "Clinical Notes"}
          {isAiPrefilled && !isReadonly && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
              AI Draft
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-4">
        {isReadonly ? (
          <div className="space-y-2">
            {intake.doctor_notes ? (
              <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                {intake.doctor_notes}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No clinical notes recorded.</p>
            )}
          </div>
        ) : (
          <>
            {isAiPrefilled && (
              <p className="text-xs text-muted-foreground">
                Pre-filled from AI draft. Edits save on approval, or click Save to persist now.
              </p>
            )}
            {isRegenerating && !doctorNotes ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating draft...</span>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-colors">
                <FormattingToolbar />
                <Textarea
                  ref={notesRef}
                  placeholder="Add your clinical notes here... (⌘+N to focus)"
                  value={doctorNotes}
                  onChange={(e) => {
                    setDoctorNotes(e.target.value)
                    setNoteSaved(false)
                  }}
                  disabled={isPending || isRegenerating}
                  className="min-h-[180px] text-sm border-0 rounded-none focus-visible:ring-0 resize-y"
                />
              </div>
            )}
            {/* Actions row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveNotes} disabled={isPending || isRegenerating} variant="outline" size="sm">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Notes
                </Button>
                <Button
                  onClick={handleGenerateOrRegenerateNote}
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
              </div>
              <div className="flex items-center gap-2">
                {noteSaved && <span className="text-xs text-emerald-600">Saved!</span>}
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
