"use client"

import { useEffect } from "react"
import { Check, Mail, Clock, ArrowRight } from "lucide-react"
import { LottieAnimation } from "@/components/ui/lottie-animation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { capture } from "@/lib/analytics/capture"
import { CONTACT_EMAIL } from "@/lib/constants"

interface ConfirmedClientProps {
  intakeId?: string
  email?: string
}

export function ConfirmedClient({ intakeId, email }: ConfirmedClientProps) {
  useEffect(() => {
    // Track guest confirmation view
    capture("guest_confirmation_viewed", {
      intake_id: intakeId,
      has_email: !!email,
    })
  }, [intakeId, email])

  return (
    <Card className="p-8 text-center">
      <LottieAnimation name="confetti" size={80} loop={false} className="mx-auto -mb-2" />
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
        <Check className="w-8 h-8 text-emerald-500" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight mb-2">Request Confirmed</h1>
      <p className="text-muted-foreground mb-6">
        Your payment was successful. A doctor will review your request shortly.
      </p>

      <div className="space-y-4 text-left bg-muted/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Check your email</p>
            <p className="text-sm text-muted-foreground">
              {email ? (
                <>We&apos;ll send your certificate to <span className="font-medium">{email}</span></>
              ) : (
                "We'll email your certificate once it's ready"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Typical turnaround</p>
            <p className="text-sm text-muted-foreground">
              Reviewed within hours, most days.
            </p>
          </div>
        </div>
      </div>

      <div className="text-left bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">How does this work?</span>{" "}
          A real doctor reviews your request and decides based on your symptoms and history. 
          If they need more info, they&apos;ll reach out. If your request isn&apos;t approved, 
          you get a full refund.{" "}
          <a href="/how-we-decide" className="text-primary hover:underline font-medium">
            Learn more →
          </a>
        </p>
      </div>

      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link href={`/auth/register?redirect=${encodeURIComponent(`/patient/intakes/success?intake_id=${intakeId}`)}`}>
            Create account to track progress
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>

        <Button variant="ghost" asChild className="w-full">
          <Link href="/">
            Return to home
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Questions? Contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Card>
  )
}
