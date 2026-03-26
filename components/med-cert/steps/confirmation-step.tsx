"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  Check,
  Clock,
  Loader2,
  Phone,
  ChevronRight,
} from "lucide-react"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { cn } from "@/lib/utils"

interface ConfirmationStepProps {
  requiresCall: boolean
}

export function ConfirmationStep({ requiresCall }: ConfirmationStepProps) {
  const router = useRouter()

  return (
    <div className="space-y-6 animate-step-enter">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold">{MED_CERT_COPY.confirmation.heading}</h1>
        <p className="text-muted-foreground">{MED_CERT_COPY.confirmation.subtitle}</p>
      </div>

      {/* Timeline */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="space-y-4">
          {MED_CERT_COPY.confirmation.timeline.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                item.status === "complete" ? "bg-green-100" :
                item.status === "current" ? "bg-primary/20" :
                "bg-muted"
              )}>
                {item.status === "complete" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : item.status === "current" ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium",
                item.status === "pending" ? "text-muted-foreground" : ""
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation message */}
      {requiresCall && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {MED_CERT_COPY.confirmation.escalationMessage.heading}
              </p>
              <p className="text-sm text-amber-800">
                {MED_CERT_COPY.confirmation.escalationMessage.body}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What next */}
      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
        <p className="font-medium text-sm">{MED_CERT_COPY.confirmation.whatNext.heading}</p>
        <ol className="space-y-2">
          {MED_CERT_COPY.confirmation.whatNext.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-primary">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <Button
        onClick={() => router.push("/patient/intakes")}
        className="w-full h-12 rounded-xl"
      >
        {MED_CERT_COPY.confirmation.trackStatus}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}
