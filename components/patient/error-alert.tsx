import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PatientErrorAlertProps {
  error: string
  className?: string
}

export function PatientErrorAlert({ error, className }: PatientErrorAlertProps) {
  return (
    <Card className={`border-destructive-border bg-destructive-light ${className ?? ""}`}>
      <CardContent className="flex items-center gap-3 py-4">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-destructive">{error}</p>
      </CardContent>
    </Card>
  )
}
