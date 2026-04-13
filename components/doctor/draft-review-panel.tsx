"use client"

/**
 * AI Draft Review Panel
 *
 * Displays AI-generated drafts for doctor review with approval/rejection workflow.
 * Allows doctors to edit content before approving.
 *
 * P1 AI-1: Collapsed by default per MEDICOLEGAL_AUDIT_REPORT to reduce
 * cognitive anchoring - doctors should review patient intake answers first.
 */

import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useState, useTransition } from "react"

import type { AIDraft } from "@/app/actions/draft-approval"
import { regenerateDrafts } from "@/app/actions/draft-approval"
import { SingleDraftCard } from "@/components/doctor/single-draft-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface DraftReviewPanelProps {
  drafts: AIDraft[]
  intakeId: string
  onDraftApproved?: (draftId: string) => void
  onDraftRejected?: (draftId: string) => void
  onRegenerated?: () => void
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
  onRegenerated,
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
        onRegenerated?.()
      } else {
        setRegenerateMessage(result.error || "Failed to regenerate")
      }
    })
  }

  if (!drafts || drafts.length === 0) {
    return (
      <Card>
        <CardHeader className="py-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-5 w-5" />
            AI Drafts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
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
      <Card className={!isExpanded ? "border-info-border bg-info-light" : ""}>
        <CardHeader className="py-4 px-5">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-base cursor-pointer">
                  <Bot className="h-5 w-5 text-blue-500" />
                  AI-Generated Drafts
                  {pendingCount > 0 && (
                    <Badge className="bg-info-light text-info ml-2">{pendingCount} pending</Badge>
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
            <CardDescription className="text-xs mt-1.5">
              <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
              Review patient intake answers first to avoid cognitive anchoring
            </CardDescription>
          )}
          {isExpanded && (
            <div className="flex items-center gap-1.5 mt-1 mb-2">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">AI draft - review before approving</span>
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-5 py-4 space-y-4">
            {regenerateMessage && (
              <div className={`p-2 rounded text-sm ${
                regenerateMessage.includes("success") ? "bg-success-light text-success" : "bg-destructive-light text-destructive"
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
