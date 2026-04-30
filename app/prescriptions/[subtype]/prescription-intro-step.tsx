"use client"

import { ArrowRight, CheckCircle, Pill } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import type { FlowStep } from "./types"

interface PrescriptionIntroStepProps {
  title: string
  subtype: string
  setStep: (s: FlowStep) => void
}

function getIntroText(subtype: string) {
  switch (subtype) {
    case "repeat":
      return "Quick repeat for stable, existing medications. New or high-risk meds may need a full consult."
    case "chronic":
      return "For chronic or ongoing medications where you may need more context, dose adjustments, or side effect review."
    default:
      return "Tell us about your prescription needs."
  }
}

export function PrescriptionIntroStep({ title, subtype, setStep }: PrescriptionIntroStepProps) {
  return (
    <div className="space-y-8">
      <div
        className="text-center animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
          <Pill className="h-4 w-4" />
          Prescription
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{getIntroText(subtype)}</p>
      </div>

      <div
        className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">What happens next?</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Tell us about your medication</p>
              <p className="text-sm text-muted-foreground">
                Provide details about the medication you need, including name and strength.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">A GP reviews your request</p>
              <p className="text-sm text-muted-foreground">
                An Australian-registered GP will verify your prescription history.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Receive your e-script</p>
              <p className="text-sm text-muted-foreground">
                If approved, your e-script will be sent to your phone via SMS after doctor review.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setStep("form")} className="flex-1 rounded-xl btn-glow">
            Continue to questionnaire
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" asChild className="flex-1 rounded-xl bg-white dark:bg-card hover:bg-muted/50">
            <Link href="/prescriptions">Back to options</Link>
          </Button>
        </div>
      </div>

      {/* Trust indicators */}
      <div
        className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>E-script to your phone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>Any pharmacy Australia-wide</span>
        </div>
      </div>
    </div>
  )
}
