import { AlertCircle } from "@/lib/icons"
import { Card, CardContent } from "@/components/ui/card"

interface PatientErrorAlertProps {
  error: string
  className?: string
}

export function PatientErrorAlert({ error, className }: PatientErrorAlertProps) {
  return (
    <Card className={`border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 ${className ?? ""}`}>
      <CardContent className="flex items-center gap-3 py-4">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </CardContent>
    </Card>
  )
}
