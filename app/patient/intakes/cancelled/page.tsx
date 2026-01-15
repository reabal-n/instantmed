import Link from "next/link"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, CreditCard } from "lucide-react"
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
          {/* Cancelled Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-dawn-600" />
          </div>

          {/* Title */}
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Payment not completed</h1>
          <p className="text-muted-foreground mb-6">
            No worries — your answers are saved. You can complete payment whenever you&apos;re ready.
          </p>

          {/* Info */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground">
              Your request won&apos;t be sent to the doctor until payment is complete. Nothing has been charged to your card.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {intakeId && (
              <Button asChild className="w-full rounded-xl">
                <Link href={`/patient/intakes/${intakeId}`}>
                  <CreditCard className="mr-2 w-4 h-4" />
                  Retry payment
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
        </div>
      </div>
    </div>
    </>
  )
}
