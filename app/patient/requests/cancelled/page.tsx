import Link from "next/link"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft } from "lucide-react"
import { RetryPaymentButton } from "./retry-payment-button"
import { PaymentCancelledTracker } from "./payment-cancelled-tracker"

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string }>
}) {
  const params = await searchParams
  const requestId = params.request_id

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      {/* Track payment cancelled event */}
      <PaymentCancelledTracker requestId={requestId} />
      <div className="max-w-lg mx-auto px-4">
        <div className="glass-card rounded-3xl p-8 text-center">
          {/* Cancelled Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>

          {/* Title */}
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Payment not completed</h1>
          <p className="text-muted-foreground mb-6">
            No worries — your answers are saved. You can complete payment whenever you&apos;re ready.
          </p>

          {/* Info */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground">
              Your request won&apos;t be sent to a doctor until payment is complete. Nothing has been charged to your card.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {requestId && <RetryPaymentButton requestId={requestId} />}
            <Button variant="outline" asChild className="w-full rounded-xl bg-transparent">
              <Link href="/patient/requests">
                <ArrowLeft className="mr-2 w-4 h-4" />
                View all requests
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
