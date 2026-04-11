"use client"

import { useTransition } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { markFollowupReviewed } from "@/app/actions/followups-doctor"
import { cn } from "@/lib/utils"

export interface DoctorFollowupRow {
  id: string
  subtype: "ed" | "hair_loss"
  milestone: "month_3" | "month_6" | "month_12"
  due_at: string
  completed_at: string | null
  skipped: boolean
  effectiveness_rating: number | null
  side_effects_reported: boolean
  side_effects_notes: string | null
  adherence_days_per_week: number | null
  patient_notes: string | null
  doctor_reviewed_at: string | null
}

const MILESTONE_LABEL: Record<DoctorFollowupRow["milestone"], string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const RATING_LABEL: Record<number, string> = {
  1: "Not working",
  2: "Barely",
  3: "Somewhat",
  4: "Working well",
  5: "Very well",
}

export function IntakeDetailFollowups({
  followups,
}: {
  followups: DoctorFollowupRow[]
}) {
  const [isPending, startTransition] = useTransition()

  if (followups.length === 0) return null

  const handleMarkReviewed = (id: string) => {
    startTransition(async () => {
      const r = await markFollowupReviewed(id)
      if (r.success) toast.success("Marked reviewed")
      else toast.error(r.error || "Failed")
    })
  }

  return (
    <Card className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Follow-up check-ins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {followups.map((f) => {
          const submitted = !!f.completed_at && !f.skipped
          const lowRating =
            f.effectiveness_rating !== null && f.effectiveness_rating <= 2
          const flagged = f.side_effects_reported || lowRating
          const reviewed = !!f.doctor_reviewed_at

          if (!submitted) {
            return (
              <div
                key={f.id}
                className="p-3 rounded-lg border border-dashed border-border/40 text-sm text-muted-foreground"
              >
                {MILESTONE_LABEL[f.milestone]} - due{" "}
                {format(new Date(f.due_at), "d MMM yyyy")}
                {f.skipped && " (skipped)"}
              </div>
            )
          }

          return (
            <div
              key={f.id}
              className={cn(
                "p-4 rounded-lg border",
                flagged
                  ? "border-warning/30 bg-warning/5"
                  : "border-border/50 bg-muted/20",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {MILESTONE_LABEL[f.milestone]} check-in
                    </span>
                    {flagged && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Needs
                        attention
                      </Badge>
                    )}
                    {reviewed && (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Reviewed
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submitted{" "}
                    {format(new Date(f.completed_at!), "d MMM yyyy")}
                  </div>
                </div>
                {!reviewed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkReviewed(f.id)}
                    disabled={isPending}
                  >
                    Mark reviewed
                  </Button>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Effectiveness
                  </dt>
                  <dd
                    className={cn(
                      lowRating && "text-destructive font-medium",
                    )}
                  >
                    {f.effectiveness_rating}/5 -{" "}
                    {RATING_LABEL[f.effectiveness_rating ?? 0] ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Adherence
                  </dt>
                  <dd>{f.adherence_days_per_week ?? "—"} days/week</dd>
                </div>
              </dl>

              {f.side_effects_reported && f.side_effects_notes && (
                <div className="mt-3 p-2 rounded bg-destructive/5 border border-destructive/20">
                  <div className="text-xs text-destructive font-medium mb-1">
                    Side effects reported
                  </div>
                  <p className="text-sm">{f.side_effects_notes}</p>
                </div>
              )}

              {f.patient_notes && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Patient notes
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {f.patient_notes}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
