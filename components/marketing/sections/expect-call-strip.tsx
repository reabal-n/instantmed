import { CheckCircle2, Phone } from "lucide-react"

// =============================================================================
// COMPONENT
// =============================================================================

/** Reassurance strip - most consults include a brief phone call */
export function ExpectCallStrip() {
  return (
    <div className="bg-primary/5 border-y border-primary/15">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary/90 shrink-0" />
          <p className="text-sm font-medium text-primary/90">
            Most consults include a brief phone call with the doctor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Keep your phone nearby after submitting
          </p>
        </div>
      </div>
    </div>
  )
}
