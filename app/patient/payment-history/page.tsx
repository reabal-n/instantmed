import { DashboardPageHeader } from "@/components/dashboard"
import { PaymentHistoryContent } from "@/components/patient"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Payment history",
  description: "View your payment history and invoices",
}

export default async function PaymentHistoryPage() {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  return (
    <div>
      <DashboardPageHeader
        title="Payment history"
        backHref="/patient"
        backLabel="Back to dashboard"
      />

      <PaymentHistoryContent patientId={authUser.profile.id} />
    </div>
  )
}
