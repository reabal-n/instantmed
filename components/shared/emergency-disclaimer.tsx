import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmergencyDisclaimerProps {
  className?: string
  variant?: "default" | "compact"
}

/**
 * EmergencyDisclaimer - Required compliance component for service pages
 * Displays emergency warning and service limitations
 */
export function EmergencyDisclaimer({ 
  className,
  variant = "default" 
}: EmergencyDisclaimerProps) {
  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <span>
          Not for emergencies. Call <strong>000</strong> for urgent medical help.
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30 p-4",
      className
    )}>
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Not for emergencies
          </p>
          <p className="text-sm text-amber-800/80 dark:text-amber-300/70">
            If you&apos;re experiencing chest pain, difficulty breathing, severe bleeding, or other 
            urgent symptoms, call <strong>000</strong> immediately or go to your nearest emergency department.
          </p>
          <p className="text-xs text-amber-700/70 dark:text-amber-400/60">
            Our doctors may decline a request if they determine an in-person consultation is required. 
            If declined, you&apos;ll receive a full refund.
          </p>
        </div>
      </div>
    </div>
  )
}
