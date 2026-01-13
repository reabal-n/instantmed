"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Loader2, 
  RefreshCw, 
  ChevronDown, 
  Sparkles, 
  AlertTriangle,
  FileText,
  Stethoscope,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentDraft {
  id: string
  intake_id: string
  type: "clinical_note" | "med_cert"
  content: Record<string, unknown>
  status: "ready" | "failed" | "pending"
  error: string | null
  created_at: string
  updated_at: string
}

interface AIDraftsPanelProps {
  intakeId: string
  onClinicalNoteChange?: (note: string) => void
  onMedCertDataChange?: (data: Record<string, unknown>) => void
  className?: string
}

export function AIDraftsPanel({
  intakeId,
  onClinicalNoteChange,
  onMedCertDataChange,
  className,
}: AIDraftsPanelProps) {
  const [drafts, setDrafts] = useState<DocumentDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(true)

  // Editable draft content
  const [editedClinicalNote, setEditedClinicalNote] = useState("")
  const [editedMedCertStatement, setEditedMedCertStatement] = useState("")

  const fetchDrafts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/doctor/drafts/${intakeId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch drafts")
      }

      setDrafts(data.drafts || [])

      // Initialize edited content from drafts
      const clinicalDraft = data.drafts?.find((d: DocumentDraft) => d.type === "clinical_note")
      const medCertDraft = data.drafts?.find((d: DocumentDraft) => d.type === "med_cert")

      if (clinicalDraft?.status === "ready" && clinicalDraft.content) {
        const noteContent = formatClinicalNoteForDisplay(clinicalDraft.content)
        setEditedClinicalNote(noteContent)
        onClinicalNoteChange?.(noteContent)
      }

      if (medCertDraft?.status === "ready" && medCertDraft.content) {
        const statement = (medCertDraft.content as { certificateStatement?: string }).certificateStatement || ""
        setEditedMedCertStatement(statement)
        onMedCertDataChange?.(medCertDraft.content)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch drafts")
    } finally {
      setIsLoading(false)
    }
  }, [intakeId, onClinicalNoteChange, onMedCertDataChange])

  const regenerateDrafts = async () => {
    try {
      setIsRegenerating(true)
      setError(null)

      const response = await fetch(`/api/doctor/drafts/${intakeId}`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate drafts")
      }

      // Refresh drafts
      await fetchDrafts()

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate drafts")
    } finally {
      setIsRegenerating(false)
    }
  }

  useEffect(() => {
    if (intakeId) {
      fetchDrafts()
    }
  }, [intakeId, fetchDrafts])

  // Notify parent when clinical note is edited
  const handleClinicalNoteChange = (value: string) => {
    setEditedClinicalNote(value)
    onClinicalNoteChange?.(value)
  }

  // Notify parent when med cert statement is edited
  const handleMedCertStatementChange = (value: string) => {
    setEditedMedCertStatement(value)
    const medCertDraft = drafts.find(d => d.type === "med_cert")
    if (medCertDraft?.content) {
      onMedCertDataChange?.({
        ...medCertDraft.content,
        certificateStatement: value,
      })
    }
  }

  const clinicalDraft = drafts.find(d => d.type === "clinical_note")
  const medCertDraft = drafts.find(d => d.type === "med_cert")
  const hasDrafts = drafts.length > 0
  const hasReadyDrafts = drafts.some(d => d.status === "ready")

  return (
    <Card className={cn("border-primary/20", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">AI-Generated Drafts</CardTitle>
                {hasReadyDrafts && (
                  <Badge variant="secondary" className="text-xs">
                    Ready for review
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          <CardDescription>
            AI-generated drafts for your review. Edit as needed before approving.
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading drafts...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive py-4">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            ) : !hasDrafts ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No AI drafts available yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateDrafts}
                  disabled={isRegenerating}
                  className="mt-4"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Drafts
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                {/* Clinical Note Draft */}
                {clinicalDraft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Stethoscope className="h-4 w-4" />
                        Clinical Note
                        <DraftStatusBadge status={clinicalDraft.status} error={clinicalDraft.error} />
                      </Label>
                    </div>
                    {clinicalDraft.status === "ready" ? (
                      <Textarea
                        value={editedClinicalNote}
                        onChange={(e) => handleClinicalNoteChange(e.target.value)}
                        className="min-h-[150px] text-sm font-mono"
                        placeholder="Clinical note will appear here..."
                      />
                    ) : (
                      <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        {clinicalDraft.error || "Failed to generate clinical note"}
                      </div>
                    )}
                  </div>
                )}

                {/* Med Cert Draft */}
                {medCertDraft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        Certificate Statement
                        <DraftStatusBadge status={medCertDraft.status} error={medCertDraft.error} />
                      </Label>
                    </div>
                    {medCertDraft.status === "ready" ? (
                      <Textarea
                        value={editedMedCertStatement}
                        onChange={(e) => handleMedCertStatementChange(e.target.value)}
                        className="min-h-[100px] text-sm"
                        placeholder="Certificate statement will appear here..."
                      />
                    ) : (
                      <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        {medCertDraft.error || "Failed to generate certificate draft"}
                      </div>
                    )}

                    {/* Show additional med cert data if available */}
                    {medCertDraft.status === "ready" && medCertDraft.content && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                        {(medCertDraft.content as { symptomsSummary?: string }).symptomsSummary && (
                          <div>
                            <span className="font-medium">Symptoms:</span>{" "}
                            {(medCertDraft.content as { symptomsSummary: string }).symptomsSummary}
                          </div>
                        )}
                        {(medCertDraft.content as { durationDays?: number }).durationDays && (
                          <div>
                            <span className="font-medium">Duration:</span>{" "}
                            {(medCertDraft.content as { durationDays: number }).durationDays} day(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Regenerate Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateDrafts}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Drafts
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function DraftStatusBadge({ status, error }: { status: string; error: string | null }) {
  if (status === "ready") {
    return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Ready</Badge>
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="text-xs" title={error || undefined}>
        Failed
      </Badge>
    )
  }
  return <Badge variant="outline" className="text-xs">Pending</Badge>
}

function formatClinicalNoteForDisplay(content: Record<string, unknown>): string {
  const parts: string[] = []
  
  if (content.presentingComplaint) {
    parts.push(`**Presenting Complaint:**\n${content.presentingComplaint}`)
  }
  
  if (content.historyOfPresentIllness) {
    parts.push(`**History of Present Illness:**\n${content.historyOfPresentIllness}`)
  }
  
  if (content.relevantInformation) {
    parts.push(`**Relevant Information:**\n${content.relevantInformation}`)
  }
  
  if (content.certificateDetails) {
    parts.push(`**Certificate Details:**\n${content.certificateDetails}`)
  }
  
  return parts.join("\n\n")
}
