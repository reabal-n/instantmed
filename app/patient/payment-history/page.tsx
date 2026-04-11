import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PaymentHistoryContent } from "@/components/patient/payment-history-content"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Payment History",
  description: "View your payment history and invoices",
}

export default async function PaymentHistoryPage() {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patient">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payment History</h1>
      </div>

      <PaymentHistoryContent patientId={authUser.profile.id} />
    </div>
  )
}
