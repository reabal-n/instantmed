"use client"

import { FileText, Loader2,Save } from "lucide-react"

import { FormattingToolbar } from "@/components/doctor/review/formatting-toolbar"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { MIN_CLINICAL_NOTES_LENGTH } from "@/components/doctor/review/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const SNIPPETS_BY_TYPE: Record<string, { label: string; text: string }[]> = {
  med_certs: [
    { label: "Viral URTI", text: "Patient presented with viral upper respiratory tract infection symptoms including sore throat, nasal congestion, fatigue and low-grade fever. Clinical assessment supports a period of absence from work/study." },
    { label: "MSK / Back pain", text: "Patient reports musculoskeletal symptoms consistent with back strain. Aggravated by prolonged sitting/standing. Rest, analgesia and gradual mobilisation recommended. Medical absence is clinically appropriate." },
    { label: "GI illness", text: "Patient presenting with gastrointestinal symptoms including nausea, abdominal discomfort and altered bowel habits. Medical absence is clinically appropriate while symptomatic." },
    { label: "Mental health", text: "Patient presenting with acute psychological distress impacting capacity to attend work/study. Medical absence is clinically appropriate to allow rest and recovery." },
    { label: "Migraine", text: "Patient presenting with migraine episode with associated photophobia and functional impairment. Medical absence is clinically appropriate." },
  ],
  repeat_rx: [
    { label: "Stable repeat", text: "Patient has an established, stable prescription for this medication. No contraindications identified. Repeat prescription is clinically appropriate." },
    { label: "Controlled condition", text: "Patient reports good tolerance and therapeutic effect from current medication. Condition is well-controlled. Repeat prescription is appropriate." },
    { label: "No change", text: "No changes to current clinical picture. Patient confirms adherence and no adverse effects. Repeat prescription approved." },
  ],
  common_scripts: [
    { label: "Stable repeat", text: "Patient has an established, stable prescription for this medication. No contraindications identified. Repeat prescription is clinically appropriate." },
    { label: "Controlled condition", text: "Patient reports good therapeutic effect from current medication. Condition is well-controlled. Repeat prescription is appropriate." },
  ],
}

const DEFAULT_SNIPPETS = [
  { label: "Viral URTI", text: "Patient presented with viral upper respiratory tract infection. Symptoms consistent with clinical history provided. Management plan discussed." },
  { label: "MSK pain", text: "Patient reports musculoskeletal symptoms. Clinical history reviewed. Rest and appropriate analgesia recommended." },
  { label: "GI symptoms", text: "Patient reporting gastrointestinal symptoms. Clinical history reviewed and assessed as consistent with presentation." },
  { label: "Anxiety/stress", text: "Patient presenting with symptoms consistent with anxiety and acute psychological stress. Telehealth review conducted. Management options discussed." },
  { label: "Follow-up", text: "Follow-up review conducted via telehealth. Patient reports [progress]. Current management plan continues to be appropriate." },
]

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement>,
  current: string,
  snippet: string,
  onChange: (v: string) => void
) {
  const el = ref.current
  if (!el) {
    onChange(current ? `${current}\n\n${snippet}` : snippet)
    return
  }
  const start = el.selectionStart ?? current.length
  const end = el.selectionEnd ?? current.length
  const prefix = current.slice(0, start)
  const suffix = current.slice(end)
  const separator = prefix.length > 0 && !prefix.endsWith("\n\n") ? "\n\n" : ""
  const newValue = `${prefix}${separator}${snippet}${suffix}`
  onChange(newValue)
  setTimeout(() => {
    el.focus()
    const pos = prefix.length + separator.length + snippet.length
    el.setSelectionRange(pos, pos)
  }, 0)
}

export function ClinicalNotesEditor() {
  const {
    intake,
    service,
    doctorNotes,
    setDoctorNotes,
    noteSaved,
    setNoteSaved,
    noteDirty,
    isAiPrefilled,
    hasClinicalDraft,
    isRegenerating,
    isPending,
    notesRef,
    handleSaveNotes,
    handleGenerateOrRegenerateNote,
  } = useIntakeReview()

  const isReadonly = ["approved", "completed", "awaiting_script"].includes(intake.status)
  const snippets = (service?.type && SNIPPETS_BY_TYPE[service.type]) || DEFAULT_SNIPPETS

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
                Draft loaded. Save or approve to persist it.
              </p>
            )}

            {/* Snippet chips */}
            {!isRegenerating && (
              <div className="flex flex-wrap gap-1.5">
                {snippets.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    disabled={isPending || isRegenerating}
                    onClick={() => {
                      insertAtCursor(notesRef, doctorNotes, s.text, (v) => {
                        setDoctorNotes(v)
                        setNoteSaved(false)
                      })
                    }}
                    className="px-2.5 py-1 text-xs rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 transition-colors disabled:opacity-40"
                  >
                    + {s.label}
                  </button>
                ))}
              </div>
            )}

            {isRegenerating && !doctorNotes ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating draft...</span>
              </div>
            ) : (
              <div className={cn(
                "rounded-lg border bg-background overflow-hidden focus-within:ring-1 transition-colors",
                doctorNotes.trim().length > 0 && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH
                  ? "border-amber-300 dark:border-amber-500/50 focus-within:ring-amber-400/50 focus-within:border-amber-400"
                  : "border-border/60 focus-within:ring-ring focus-within:border-ring"
              )}>
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
              <div className="flex items-center gap-2.5">
                {noteSaved && <span className="text-xs text-emerald-600">Saved!</span>}
                {!noteSaved && noteDirty && !isPending && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Auto-saving…
                  </span>
                )}
                {doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH ? (
                  <div className="flex items-center gap-1.5" aria-live="polite">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300",
                          doctorNotes.trim().length === 0
                            ? "w-0"
                            : doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH * 0.5
                              ? "bg-amber-400"
                              : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min(100, (doctorNotes.trim().length / MIN_CLINICAL_NOTES_LENGTH) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-amber-600 dark:text-amber-500">
                      {doctorNotes.trim().length}/{MIN_CLINICAL_NOTES_LENGTH}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground" aria-live="polite">Min met</span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
