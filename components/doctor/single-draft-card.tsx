"use client"

/**
 * Single Draft Card
 *
 * Renders an individual AI draft with approve/reject/edit workflow,
 * staleness detection, and diff viewing for clinical notes.
 */

import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Edit,
  GitCompare,
  Loader2,
  XCircle,
} from "lucide-react"
import { useEffect,useMemo, useState, useTransition } from "react"

import type { AIDraft } from "@/app/actions/draft-approval"
import { approveDraft, rejectDraft } from "@/app/actions/draft-approval"
import { checkDraftStaleness } from "@/app/actions/drafts/draft-validation"
import {
  ClinicalNoteDiffView,
  DraftContent,
  formatDraftType,
  getStatusBadge,
  ValidationWarnings,
} from "@/components/doctor/draft-review-content"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

interface SingleDraftCardProps {
  draft: AIDraft
  onApproved?: () => void
  onRejected?: () => void
}

export function SingleDraftCard({
  draft,
  onApproved,
  onRejected,
}: SingleDraftCardProps) {
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
      <CardHeader className="py-4 px-5">
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
        <CardDescription className="flex items-center gap-4 text-xs mt-1.5">
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
      <CardContent className="px-5 py-4 space-y-4">
        {actionMessage && (
          <div className={`p-2 rounded text-sm ${
            actionMessage.type === "success" ? "bg-success-light text-success" : "bg-destructive-light text-destructive"
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Staleness Warning Banner */}
        {stalenessInfo?.isStale && !isAlreadyDecided && (
          <div className="p-3 rounded-lg border-2 border-warning-border bg-warning-light">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-warning">Answers changed since draft was generated</p>
                <p className="text-sm text-warning mt-1">{stalenessInfo.reason}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id={`ack-${draft.id}`}
                    checked={acknowledgedChanges}
                    onCheckedChange={(checked) => setAcknowledgedChanges(checked === true)}
                  />
                  <label htmlFor={`ack-${draft.id}`} className="text-sm text-warning cursor-pointer">
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
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
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
          <div className="text-sm text-destructive bg-destructive-light p-3 rounded">
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
