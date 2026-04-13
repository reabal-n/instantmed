"use client"

/**
 * Draft Review Content Components
 *
 * Display components for rendering AI draft content, diff views,
 * and validation warnings within the draft review panel.
 */

import {
  AlertTriangle,
  ChevronDown,
  Shield,
} from "lucide-react"
import { useMemo } from "react"

import type { AIDraft } from "@/app/actions/draft-approval"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { computeLineDiff, type DiffLine,formatContentForDiff, isDiffTooLarge } from "@/lib/utils/text-diff"

export function formatDraftType(type: string): string {
  switch (type) {
    case "clinical_note":
      return "Clinical Note"
    case "med_cert":
      return "Medical Certificate"
    default:
      return type
  }
}

export function getStatusBadge(draft: AIDraft) {
  if (draft.approved_at) {
    return <Badge className="bg-success-light text-success">Approved</Badge>
  }
  if (draft.rejected_at) {
    return <Badge className="bg-destructive-light text-destructive">Rejected</Badge>
  }
  if (draft.status === "failed") {
    return <Badge className="bg-destructive-light text-destructive">Generation Failed</Badge>
  }
  if (draft.status === "pending") {
    return <Badge className="bg-warning-light text-warning">Generating...</Badge>
  }
  return <Badge className="bg-info-light text-info">Ready for Review</Badge>
}

/**
 * Side-by-side fallback view when diff is too large to compute safely
 */
function SideBySideFallback({
  originalText,
  editedText,
  reason,
}: {
  originalText: string
  editedText: string
  reason: string
}) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-warning-light border border-warning-border">
        <div className="flex items-center gap-2 text-warning text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          Diff too large to render safely
        </div>
        <p className="text-xs text-warning mt-1">{reason}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-red-300" />
            Original
          </div>
          <div className="border rounded-lg p-3 bg-red-50/30 dark:bg-red-500/5 max-h-[300px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
              {originalText || '(empty)'}
            </pre>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-300" />
            Edited
          </div>
          <div className="border rounded-lg p-3 bg-emerald-50/30 dark:bg-emerald-500/5 max-h-[300px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
              {editedText || '(empty)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Diff view component for clinical note edits
 * Shows line-by-line comparison between original and edited content
 *
 * PERFORMANCE GUARD: If content exceeds safe thresholds (8000 lines / 200k chars),
 * falls back to side-by-side plain text view instead of computing LCS diff.
 */
export function ClinicalNoteDiffView({
  original,
  edited
}: {
  original: Record<string, unknown>
  edited: Record<string, unknown>
}) {
  // Format content and check size - all hooks must be called unconditionally
  const { originalText, editedText, sizeCheck, diff } = useMemo(() => {
    const origText = formatContentForDiff(original)
    const editText = formatContentForDiff(edited)
    const check = isDiffTooLarge(origText, editText)

    // Only compute diff if content is within safe limits
    const diffResult = check.tooLarge
      ? null
      : computeLineDiff(origText, editText)

    return {
      originalText: origText,
      editedText: editText,
      sizeCheck: check,
      diff: diffResult,
    }
  }, [original, edited])

  // PERFORMANCE GUARD: Show fallback for large content
  if (sizeCheck.tooLarge || !diff) {
    return (
      <SideBySideFallback
        originalText={originalText}
        editedText={editedText}
        reason={sizeCheck.reason || 'Content exceeds safe rendering limits'}
      />
    )
  }

  if (!diff.hasChanges) {
    return (
      <div className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded">
        No changes from original AI draft
      </div>
    )
  }

  const renderLine = (line: DiffLine, index: number) => {
    const baseClass = "font-mono text-xs py-0.5 px-2 whitespace-pre-wrap"
    switch (line.type) {
      case 'added':
        return (
          <div key={index} className={`${baseClass} bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200 border-l-2 border-emerald-500`}>
            <span className="select-none text-success mr-2">+</span>
            {line.content || ' '}
          </div>
        )
      case 'removed':
        return (
          <div key={index} className={`${baseClass} bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200 border-l-2 border-red-500`}>
            <span className="select-none text-destructive mr-2">−</span>
            {line.content || ' '}
          </div>
        )
      default:
        return (
          <div key={index} className={`${baseClass} text-muted-foreground`}>
            <span className="select-none mr-2">&nbsp;</span>
            {line.content || ' '}
          </div>
        )
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-200 border border-red-400" />
          {diff.removedCount} removed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" />
          {diff.addedCount} added
        </span>
      </div>
      <div className="border rounded-lg overflow-hidden bg-background max-h-[400px] overflow-y-auto">
        {diff.lines.map((line, i) => renderLine(line, i))}
      </div>
    </div>
  )
}

export function ValidationWarnings({ draft }: { draft: AIDraft }) {
  const hasValidationErrors = draft.validation_errors && draft.validation_errors.length > 0
  const hasGroundTruthErrors = draft.ground_truth_errors && draft.ground_truth_errors.length > 0

  if (!hasValidationErrors && !hasGroundTruthErrors) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <Shield className="h-4 w-4" />
        All validation checks passed
      </div>
    )
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        {(draft.validation_errors?.length || 0) + (draft.ground_truth_errors?.length || 0)} validation warning(s)
        <ChevronDown className="h-3 w-3" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {draft.ground_truth_errors?.map((error, i) => (
          <div key={i} className="text-sm text-warning bg-warning-light p-2 rounded">
            {typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: string }).message)
              : String(error)}
          </div>
        ))}
        {draft.validation_errors?.map((error, i) => (
          <div key={i} className="text-sm text-destructive bg-destructive-light p-2 rounded">
            {typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: string }).message)
              : String(error)}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function DraftContent({ content }: { content: Record<string, unknown> }) {
  // Render content based on common fields
  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "string") return value
    if (typeof value === "number") return String(value)
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (Array.isArray(value)) return value.join(", ")
    return JSON.stringify(value)
  }

  // Clinical note fields with nice labels
  const displayFields = [
    { key: "presentingComplaint", label: "Presenting Complaint" },
    { key: "historyOfPresentIllness", label: "History of Present Illness" },
    { key: "relevantInformation", label: "Relevant Information" },
    { key: "certificateDetails", label: "Certificate Details" },
    { key: "certificateStatement", label: "Certificate Statement" },
    { key: "symptomsSummary", label: "Symptoms Summary" },
    { key: "clinicalNotes", label: "Clinical Notes" },
    { key: "medicationSummary", label: "Medication Summary" },
    { key: "indicationStatement", label: "Indication" },
    { key: "treatmentHistory", label: "Treatment History" },
    { key: "complianceNotes", label: "Compliance Notes" },
    { key: "clinicalConsiderations", label: "Clinical Considerations" },
    { key: "chiefComplaint", label: "Chief Complaint" },
    { key: "relevantHistory", label: "Relevant History" },
    { key: "systemsReview", label: "Systems Review" },
    { key: "urgencyAssessment", label: "Urgency" },
    { key: "reason", label: "Reason / Description" },
    { key: "symptoms", label: "Symptoms" },
    { key: "assessment", label: "Assessment" },
    { key: "plan", label: "Plan" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "date_from", label: "Date From" },
    { key: "date_to", label: "Date To" },
    { key: "durationDays", label: "Duration (days)" },
    { key: "duration", label: "Duration" },
    { key: "certificateType", label: "Certificate Type" },
    { key: "work_capacity", label: "Work Capacity" },
    { key: "notes", label: "Notes" },
    { key: "suggestedConsultType", label: "Suggested Consult Type" },
  ]

  const fieldsToShow = displayFields.filter(f => content[f.key] !== undefined && content[f.key] !== null)
  const otherFields = Object.entries(content).filter(
    ([key]) => !displayFields.some(f => f.key === key) && key !== "flags" && !key.startsWith("_")
  )

  return (
    <div className="space-y-3 text-sm">
      {fieldsToShow.map(({ key, label }) => (
        <div key={key}>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap">{renderValue(content[key])}</dd>
        </div>
      ))}
      {otherFields.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            Show {otherFields.length} more field(s) <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {otherFields.map(([key, value]) => (
              <div key={key}>
                <dt className="text-muted-foreground text-xs">{key.replace(/_/g, " ")}</dt>
                <dd className="mt-0.5">{renderValue(value)}</dd>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
