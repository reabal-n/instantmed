import Link from "next/link"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, CreditCard, ShieldCheck, Clock, RefreshCw } from "lucide-react"
import { CancelledPageTracker } from "./tracker"

export const dynamic = "force-dynamic"

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string }>
}) {
  const params = await searchParams
  const intakeId = params.intake_id

  return (
    <>
      <CancelledPageTracker intakeId={intakeId} />
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="glass-card rounded-3xl p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-amber-600" />
            </div>

            {/* Title */}
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              Payment not completed
            </h1>
            <p className="text-muted-foreground mb-6">
              No worries — your answers are saved and nothing has been charged.
            </p>

            {/* Reassurance cards */}
            <div className="space-y-2 mb-6 text-left">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <RefreshCw className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your request is saved — you can complete payment anytime
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  No card has been charged. Payment is only taken when you complete checkout.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your request won&apos;t be sent to a doctor until payment is complete
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {intakeId ? (
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link href={`/patient/intakes/${intakeId}`}>
                    <CreditCard className="mr-2 w-4 h-4" />
                    Complete payment
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link href="/request">
                    <CreditCard className="mr-2 w-4 h-4" />
                    Start a new request
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="w-full rounded-xl bg-transparent">
                <Link href="/patient">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back to dashboard
                </Link>
              </Button>
            </div>

            {/* Help text */}
            <p className="text-xs text-muted-foreground mt-6">
              Having trouble paying?{" "}
              <a href="mailto:hello@instantmed.com.au" className="text-primary hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
