"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { submitFollowup } from "@/app/actions/followups"

interface Props {
  followupId: string
  subtype: "ed" | "hair_loss"
  milestone: "month_3" | "month_6" | "month_12"
}

const MILESTONE_LABEL: Record<Props["milestone"], string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const RATING_LABELS = [
  { v: 1, label: "Not working" },
  { v: 2, label: "Barely" },
  { v: 3, label: "Somewhat" },
  { v: 4, label: "Working well" },
  { v: 5, label: "Very well" },
] as const

export function FollowupForm({ followupId, subtype: _subtype, milestone }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rating, setRating] = useState<number>(0)
  const [sideEffects, setSideEffects] = useState(false)
  const [sideEffectsNotes, setSideEffectsNotes] = useState("")
  const [adherence, setAdherence] = useState<number>(7)
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error("Please rate how your treatment is working")
      return
    }
    if (sideEffects && sideEffectsNotes.trim().length === 0) {
      toast.error("Please describe the side effects")
      return
    }

    startTransition(async () => {
      const r = await submitFollowup({
        followupId,
        effectivenessRating: rating,
        sideEffectsReported: sideEffects,
        sideEffectsNotes,
        adherenceDaysPerWeek: adherence,
        patientNotes: notes,
      })
      if (r.success) {
        toast.success("Thanks — your doctor will review shortly")
        router.push("/patient")
      } else {
        toast.error(r.error || "Failed to save")
      }
    })
  }

  return (
    <Card className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
      <CardHeader>
        <CardTitle>Your {MILESTONE_LABEL[milestone]} check-in</CardTitle>
        <p className="text-sm text-muted-foreground">
          Takes about a minute. Your answers go straight to your doctor.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="mb-2 block">
              How&apos;s your treatment going overall?
            </Label>
            <RadioGroup
              value={rating.toString()}
              onValueChange={(v) => setRating(Number(v))}
              className="grid grid-cols-5 gap-2"
            >
              {RATING_LABELS.map((r) => (
                <div key={r.v} className="text-center">
                  <RadioGroupItem
                    value={r.v.toString()}
                    id={`r${r.v}`}
                    className="mx-auto"
                  />
                  <Label htmlFor={`r${r.v}`} className="text-xs mt-1 block">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sfx">Any side effects?</Label>
              <Switch
                id="sfx"
                checked={sideEffects}
                onCheckedChange={setSideEffects}
              />
            </div>
            {sideEffects && (
              <Textarea
                className="mt-2"
                placeholder="Please describe briefly..."
                value={sideEffectsNotes}
                onChange={(e) => setSideEffectsNotes(e.target.value)}
                maxLength={2000}
              />
            )}
          </div>

          <div>
            <Label htmlFor="adherence">
              How many days per week are you using your treatment?
            </Label>
            <input
              id="adherence"
              type="range"
              min={0}
              max={7}
              value={adherence}
              onChange={(e) => setAdherence(Number(e.target.value))}
              className="w-full mt-2"
            />
            <div className="text-sm text-muted-foreground text-right">
              {adherence} days
            </div>
          </div>

          <div>
            <Label htmlFor="notes">
              Anything you want to tell the doctor? (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder="Optional — questions, observations, concerns..."
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Submitting..." : "Submit check-in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
