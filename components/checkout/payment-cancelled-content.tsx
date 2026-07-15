import { AlertCircle, ArrowLeft, Clock, CreditCard, House, Mail, RefreshCw, ShieldAlert, ShieldCheck, TriangleAlert, XCircle } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CONTACT_EMAIL } from "@/lib/constants"
import { buildPatientIntakeHref, PATIENT_DASHBOARD_HREF, REQUEST_HREF } from "@/lib/dashboard/routes"

import { PaymentCancelledTracker } from "./payment-cancelled-tracker"

interface PaymentCancelledContentProps {
  intakeId?: string
  reason?: string
  resumeToken?: string
}

function CheckoutRecoveryNotice({ reason }: { reason: "payment_state_unresolved" | "safety_blocked" }) {
  const safetyBlocked = reason === "safety_blocked"

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto w-full max-w-lg">
        <DashboardCard tier="elevated" padding="none" className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-light/30">
            {safetyBlocked ? (
              <ShieldAlert className="h-8 w-8 text-warning" aria-hidden="true" />
            ) : (
              <TriangleAlert className="h-8 w-8 text-warning" aria-hidden="true" />
            )}
          </div>

          <Heading level="h1" className="!text-2xl mb-3">
            {safetyBlocked
              ? "This request can’t continue online"
              : "Please don’t try payment again yet"}
          </Heading>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground">
            {safetyBlocked
              ? "The certificate purpose described needs an in-person assessment. This request has been stopped, and no payment is due."
              : "We couldn’t safely confirm the status of the earlier checkout. To avoid a duplicate charge, don’t start another request or payment."}
          </p>

          <div className="mb-6 space-y-2 text-left text-base text-muted-foreground">
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p>
                {safetyBlocked
                  ? "Please contact your regular GP or the organisation that requested the certificate."
                  : "Support can check the earlier payment state before you take another step."}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p>
                {safetyBlocked
                  ? "If an answer was entered incorrectly, contact support before submitting another request."
                  : "Contact support and include your request reference if you have it."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="h-12 w-full rounded-xl">
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Contact support
              </a>
            </Button>
            <Button variant="outline" asChild className="h-12 w-full rounded-xl bg-transparent">
              <Link href="/">
                <House className="mr-2 h-4 w-4" aria-hidden="true" />
                Return home
              </Link>
            </Button>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}

function MoreInformationRequiredNotice() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto w-full max-w-lg">
        <DashboardCard tier="elevated" padding="none" className="p-6 text-center sm:p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-light/30">
            <AlertCircle className="h-8 w-8 text-warning" aria-hidden="true" />
          </div>

          <Heading level="h1" className="mb-3 !text-2xl">
            We need a little more medical information before payment
          </Heading>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground">
            This saved request is missing a required medical answer, so it can’t continue to payment. Start a fresh secure form and answer every medical question again.
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="h-12 w-full rounded-xl">
              <Link href={REQUEST_HREF}>Start a fresh request</Link>
            </Button>
            <Button variant="outline" asChild className="h-12 w-full rounded-xl bg-transparent">
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Contact support
              </a>
            </Button>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}

export function PaymentCancelledContent({
  intakeId,
  reason,
  resumeToken,
}: PaymentCancelledContentProps) {
  if (reason === "safety_blocked" || reason === "payment_state_unresolved") {
    return <CheckoutRecoveryNotice reason={reason} />
  }

  if (reason === "more_information_required") {
    return <MoreInformationRequiredNotice />
  }

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
