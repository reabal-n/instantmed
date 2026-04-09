import Link from "next/link"
import { differenceInDays, format } from "date-fns"
import { CheckCircle2, Circle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FollowupRow {
  id: string
  subtype: "ed" | "hair_loss"
  milestone: "month_3" | "month_6" | "month_12"
  due_at: string
  completed_at: string | null
  skipped: boolean
}

interface Props {
  followups: FollowupRow[]
}

const MILESTONE_LABEL: Record<FollowupRow["milestone"], string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const MILESTONE_ORDER: FollowupRow["milestone"][] = [
  "month_3",
  "month_6",
  "month_12",
]

export function FollowupTrackerCard({ followups }: Props) {
  const active = followups.filter((f) => !f.skipped)
  if (active.length === 0) return null

  // Find the next due followup that hasn't been completed
  const nextDue = active.find((f) => !f.completed_at)
  if (!nextDue) return null // nothing to prompt

  const now = new Date()
  const dueAt = new Date(nextDue.due_at)
  const isDue = dueAt <= now
  const daysOverdue = isDue ? differenceInDays(now, dueAt) : 0
  const isOverdue = daysOverdue > 7

  const completedMilestones = new Set(
    active.filter((f) => f.completed_at).map((f) => f.milestone),
  )

  const subtypeLabel =
    nextDue.subtype === "ed"
      ? "your treatment"
      : "your hair-loss treatment"
  const milestoneLabel = MILESTONE_LABEL[nextDue.milestone]

  return (
    <Card
      className={cn(
        "bg-white dark:bg-card border shadow-md shadow-primary/[0.06]",
        isOverdue
          ? "border-amber-300 dark:border-amber-700"
          : "border-border/50",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {MILESTONE_ORDER.map((m) => {
                const done = completedMilestones.has(m)
                const current = m === nextDue.milestone
                return (
                  <div key={m} className="flex items-center gap-1">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : current ? (
                      <Clock
                        className={cn(
                          "h-4 w-4",
                          isDue
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        current && "font-medium",
                      )}
                    >
                      {MILESTONE_LABEL[m]}
                    </span>
                  </div>
                )
              })}
            </div>

            {isDue ? (
              <>
                <h3 className="font-semibold text-base mb-1">
                  Time for your {milestoneLabel} check-in
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A minute of your time helps your doctor make sure{" "}
                  {subtypeLabel} is still working for you.
                </p>
                <Button asChild size="sm">
                  <Link href={`/patient/followups/${nextDue.id}`}>
                    Share your update
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-base mb-1">
                  Next check-in: {milestoneLabel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll reach out on {format(dueAt, "d MMM yyyy")} to
                  see how you&apos;re going.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
