"use client"

/**
 * AI Draft Review Panel
 * 
 * Displays AI-generated drafts for doctor review with approval/rejection workflow.
 * Allows doctors to edit content before approving.
 */

import { useState, useTransition, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Bot,
  CheckCircle,
  XCircle,
  Edit,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Loader2,
  Clock,
  Shield,
  GitCompare,
} from "lucide-react"
import { computeLineDiff, formatContentForDiff, isDiffTooLarge, type DiffLine } from "@/lib/utils/text-diff"
import { approveDraft, rejectDraft, regenerateDrafts, checkDraftStaleness } from "@/app/actions/draft-approval"
import type { AIDraft } from "@/app/actions/draft-approval"
import { Checkbox } from "@/components/ui/checkbox"

interface DraftReviewPanelProps {
  drafts: AIDraft[]
  intakeId: string
  onDraftApproved?: (draftId: string) => void
  onDraftRejected?: (draftId: string) => void
}

function formatDraftType(type: string): string {
  switch (type) {
    case "clinical_note":
      return "Clinical Note"
    case "med_cert":
      return "Medical Certificate"
    default:
      return type
  }
}

function getStatusBadge(draft: AIDraft) {
  if (draft.approved_at) {
    return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>
  }
  if (draft.rejected_at) {
    return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
  }
  if (draft.status === "failed") {
    return <Badge className="bg-red-100 text-red-800">Generation Failed</Badge>
  }
  if (draft.status === "pending") {
    return <Badge className="bg-amber-100 text-amber-800">Generating...</Badge>
  }
  return <Badge className="bg-blue-100 text-blue-800">Ready for Review</Badge>
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
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          Diff too large to render safely
        </div>
        <p className="text-xs text-amber-700 mt-1">{reason}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-red-300" />
            Original
          </div>
          <div className="border rounded-lg p-3 bg-red-50/30 max-h-[300px] overflow-y-auto">
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
          <div className="border rounded-lg p-3 bg-emerald-50/30 max-h-[300px] overflow-y-auto">
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
function ClinicalNoteDiffView({ 
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
          <div key={index} className={`${baseClass} bg-emerald-100 text-emerald-900 border-l-2 border-emerald-500`}>
            <span className="select-none text-emerald-600 mr-2">+</span>
            {line.content || ' '}
          </div>
        )
      case 'removed':
        return (
          <div key={index} className={`${baseClass} bg-red-100 text-red-900 border-l-2 border-red-500`}>
            <span className="select-none text-red-600 mr-2">−</span>
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
      <div className="border rounded-lg overflow-hidden bg-white max-h-[400px] overflow-y-auto">
        {diff.lines.map((line, i) => renderLine(line, i))}
      </div>
    </div>
  )
}

function ValidationWarnings({ draft }: { draft: AIDraft }) {
  const hasValidationErrors = draft.validation_errors && draft.validation_errors.length > 0
  const hasGroundTruthErrors = draft.ground_truth_errors && draft.ground_truth_errors.length > 0

  if (!hasValidationErrors && !hasGroundTruthErrors) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
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
          <div key={i} className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            {typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: string }).message)
              : String(error)}
          </div>
        ))}
        {draft.validation_errors?.map((error, i) => (
          <div key={i} className="text-sm text-red-700 bg-red-50 p-2 rounded">
            {typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: string }).message)
              : String(error)}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function DraftContent({ content }: { content: Record<string, unknown> }) {
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

function SingleDraftCard({
  draft,
  onApproved,
  onRejected,
}: {
  draft: AIDraft
  onApproved?: () => void
  onRejected?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(JSON.stringify(draft.content, null, 2))
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [stalenessInfo, setStalenessInfo] = useState<{ isStale: boolean; reason?: string } | null>(null)
  const [acknowledgedChanges, setAcknowledgedChanges] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  // Check if this is a clinical note with edits (for diff view)
  const isClinicalNote = draft.type === "clinical_note"
  const hasEdits = !!draft.edited_content
  const canShowDiff = isClinicalNote && hasEdits

  const isAlreadyDecided = !!draft.approved_at || !!draft.rejected_at
  const canApprove = draft.status === "ready" && !isAlreadyDecided

  // Compute draft age once on mount to avoid impure Date.now() during render
  const { hoursOld, isStale } = useMemo(() => {
    const now = new Date()
    const draftAge = now.getTime() - new Date(draft.created_at).getTime()
    const hours = Math.floor(draftAge / (1000 * 60 * 60))
    return { hoursOld: hours, isStale: hours > 24 }
  }, [draft.created_at])

  // Check for staleness (answers changed since draft generation)
  useEffect(() => {
    if (isAlreadyDecided) return
    
    checkDraftStaleness(draft.id).then((result) => {
      setStalenessInfo(result)
    })
  }, [draft.id, isAlreadyDecided])

  const handleApprove = (withEdits: boolean) => {
    startTransition(async () => {
      try {
        let editedData: Record<string, unknown> | undefined
        if (withEdits) {
          editedData = JSON.parse(editedContent)
        }
        const result = await approveDraft(draft.id, editedData)
        if (result.success) {
          setActionMessage({ type: "success", text: "Draft approved" })
          setIsEditing(false)
          onApproved?.()
        } else {
          setActionMessage({ type: "error", text: result.error || "Failed to approve" })
        }
      } catch {
        setActionMessage({ type: "error", text: "Invalid JSON in edited content" })
      }
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) return
    startTransition(async () => {
      const result = await rejectDraft(draft.id, rejectReason)
      if (result.success) {
        setShowRejectDialog(false)
        setActionMessage({ type: "success", text: "Draft rejected" })
        onRejected?.()
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to reject" })
      }
    })
  }

  return (
    <Card className={isAlreadyDecided ? "opacity-75" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">{formatDraftType(draft.type)}</CardTitle>
            <Badge variant="outline" className="text-xs">
              v{draft.version}
            </Badge>
          </div>
          {getStatusBadge(draft)}
        </div>
        <CardDescription className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Generated {hoursOld > 0 ? `${hoursOld}h ago` : "just now"}
          </span>
          {isStale && (
            <span className="text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Draft may be stale
            </span>
          )}
          <span className="text-muted-foreground">Model: {draft.model}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionMessage && (
          <div className={`p-2 rounded text-sm ${
            actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Staleness Warning Banner */}
        {stalenessInfo?.isStale && !isAlreadyDecided && (
          <div className="p-3 rounded-lg border-2 border-amber-400 bg-amber-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Answers changed since draft was generated</p>
                <p className="text-sm text-amber-700 mt-1">{stalenessInfo.reason}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id={`ack-${draft.id}`}
                    checked={acknowledgedChanges}
                    onCheckedChange={(checked) => setAcknowledgedChanges(checked === true)}
                  />
                  <label htmlFor={`ack-${draft.id}`} className="text-sm text-amber-800 cursor-pointer">
                    I&apos;ve reviewed the updated answers and confirm this draft is still accurate
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <ValidationWarnings draft={draft} />

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="font-mono text-xs min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleApprove(true)} disabled={isPending}>
                {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save & Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Diff toggle for clinical notes with edits */}
            {canShowDiff && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={showDiff ? "secondary" : "outline"}
                  onClick={() => setShowDiff(!showDiff)}
                  className="text-xs"
                >
                  <GitCompare className="h-3 w-3 mr-1" />
                  {showDiff ? "Hide changes" : "View changes"}
                </Button>
                {hasEdits && (
                  <span className="text-xs text-muted-foreground">
                    Doctor edited this draft
                  </span>
                )}
              </div>
            )}

            {/* Show diff view or normal content */}
            {showDiff && canShowDiff ? (
              <ClinicalNoteDiffView 
                original={draft.content} 
                edited={draft.edited_content!} 
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-4">
                <DraftContent content={draft.edited_content || draft.content} />
              </div>
            )}
          </div>
        )}

        {canApprove && !isEditing && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleApprove(false)}
              disabled={isPending || (stalenessInfo?.isStale && !acknowledgedChanges)}
            >
              {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit & Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {draft.rejected_at && draft.rejection_reason && (
          <div className="text-sm text-red-700 bg-red-50 p-3 rounded">
            <strong>Rejection reason:</strong> {draft.rejection_reason}
          </div>
        )}
      </CardContent>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject AI Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this draft. You can regenerate a new draft afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || isPending}
              className="bg-red-600"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/**
 * P1 AI-1: AI summaries collapsed by default per MEDICOLEGAL_AUDIT_REPORT
 * 
 * To reduce cognitive anchoring, doctors should view patient intake answers
 * first before seeing AI-generated summaries. This panel is collapsed by 
 * default and requires explicit expansion.
 */
export function DraftReviewPanel({
  drafts,
  intakeId,
  onDraftApproved,
  onDraftRejected,
}: DraftReviewPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null)
  // P1 AI-1: Collapsed by default to reduce cognitive anchoring
  const [isExpanded, setIsExpanded] = useState(false)

  const handleRegenerate = () => {
    startTransition(async () => {
      setRegenerateMessage(null)
      const result = await regenerateDrafts(intakeId)
      if (result.success) {
        setRegenerateMessage("Drafts regenerated successfully")
      } else {
        setRegenerateMessage(result.error || "Failed to regenerate")
      }
    })
  }

  if (!drafts || drafts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No AI drafts available for this case.
          </p>
          <Button size="sm" onClick={handleRegenerate} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate AI Drafts
          </Button>
        </CardContent>
      </Card>
    )
  }

  const allDecided = drafts.every(d => d.approved_at || d.rejected_at)
  const pendingCount = drafts.filter(d => !d.approved_at && !d.rejected_at).length

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={!isExpanded ? "border-blue-200 bg-blue-50/30" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-base cursor-pointer">
                  <Bot className="h-5 w-5 text-blue-500" />
                  AI-Generated Drafts
                  {pendingCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 ml-2">{pendingCount} pending</Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            {allDecided && (
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            )}
          </div>
          {!isExpanded && (
            <CardDescription className="text-xs mt-1">
              <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
              Review patient intake answers first to avoid cognitive anchoring
            </CardDescription>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-4">
            {regenerateMessage && (
              <div className={`p-2 rounded text-sm ${
                regenerateMessage.includes("success") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
              }`}>
                {regenerateMessage}
              </div>
            )}

            {drafts.map((draft) => (
              <SingleDraftCard
                key={draft.id}
                draft={draft}
                onApproved={() => onDraftApproved?.(draft.id)}
                onRejected={() => onDraftRejected?.(draft.id)}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
