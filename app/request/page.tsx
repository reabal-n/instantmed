import type { Metadata } from "next"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { UnifiedFlowClient } from "./unified-flow-client"

export const metadata: Metadata = {
  title: "New Request | InstantMed",
  description:
    "Get a medical certificate, prescription, or referral online. Reviewed by Australian doctors. Most requests completed within 1 hour.",
}

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const params = await searchParams
  const user = await getCurrentUser()
  const profile = user ? await getUserProfile(user.id) : null

  const initialService = params.service as "medcert" | "prescription" | "referral" | undefined

  return (
    <main className="min-h-screen bg-background">
      <UnifiedFlowClient
        initialService={initialService}
        patientId={profile?.id || null}
        isAuthenticated={!!user}
        needsOnboarding={!!user && !profile}
        userEmail={user?.email ?? undefined}
        userName={profile?.full_name || user?.user_metadata?.full_name}
        medicareNumber={profile?.medicare_number ?? undefined}
        medicareIrn={profile?.medicare_irn ?? undefined}
      />
    </main>
  )
}
