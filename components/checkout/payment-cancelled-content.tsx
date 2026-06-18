import { ArrowLeft, Clock, CreditCard, RefreshCw, ShieldCheck, XCircle } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CONTACT_EMAIL } from "@/lib/constants"
import { buildPatientIntakeHref, PATIENT_DASHBOARD_HREF, REQUEST_HREF } from "@/lib/dashboard/routes"

import { PaymentCancelledTracker } from "./payment-cancelled-tracker"

interface PaymentCancelledContentProps {
  intakeId?: string
  resumeToken?: string
}

export function PaymentCancelledContent({
  intakeId,
  resumeToken,
}: PaymentCancelledContentProps) {
  const resumeHref = resumeToken ? `/resume/${encodeURIComponent(resumeToken)}` : null

  return (
    <>
      <PaymentCancelledTracker hasResumeToken={!!resumeHref} intakeId={intakeId} />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-lg">
          <DashboardCard tier="elevated" padding="none" className="rounded-3xl p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-light/30">
              <XCircle className="h-8 w-8 text-warning" />
            </div>

            <Heading level="h1" className="!text-2xl mb-2">
              Payment not completed
            </Heading>
            <p className="mb-6 text-muted-foreground">
              Your answers are saved. Payment is only taken when checkout is completed.
            </p>

            <div className="mb-6 space-y-2 text-left">
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {resumeHref
                    ? "You can return to secure checkout from here"
                    : "Your request is saved - you can complete payment anytime"}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-sm text-muted-foreground">
                  No card has been charged. Payment is only taken when you complete checkout.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Your request won&apos;t be sent to a doctor until payment is complete
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {resumeHref ? (
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link href={resumeHref}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Resume secure checkout
                  </Link>
                </Button>
              ) : intakeId ? (
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link href={buildPatientIntakeHref(intakeId)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Complete payment
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link href={REQUEST_HREF}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Start a new request
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="w-full rounded-xl bg-transparent">
                <Link href={resumeHref ? REQUEST_HREF : PATIENT_DASHBOARD_HREF}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {resumeHref ? "Start a new request" : "Back to dashboard"}
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Having trouble paying?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                Contact support
              </a>
            </p>
          </DashboardCard>
        </div>
      </div>
    </>
  )
}
