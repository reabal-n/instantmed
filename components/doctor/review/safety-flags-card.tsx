"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { XCircle } from "lucide-react"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"

export function SafetyFlagsCard() {
  const { hasRedFlags, redFlagDetails, redFlagsAcknowledged, setRedFlagsAcknowledged } = useIntakeReview()

  if (!hasRedFlags) return null

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="py-4 px-5">
        <CardTitle className="text-destructive flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4" />
          Safety Flags Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-4">
        <div className="text-sm space-y-1">
          {redFlagDetails.map((detail, i) => (
            <p key={i} className="text-destructive-foreground">
              • {detail}
            </p>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-destructive/20">
          <Switch
            id="panel-acknowledge-flags"
            checked={redFlagsAcknowledged}
            onCheckedChange={setRedFlagsAcknowledged}
          />
          <Label
            htmlFor="panel-acknowledge-flags"
            className="text-sm font-medium text-destructive-foreground cursor-pointer"
          >
            I have reviewed these safety flags and determined it is appropriate to proceed
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
