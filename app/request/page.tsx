import type { Metadata } from "next"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { RequestFlow } from "@/components/request"
import { mapServiceParam } from "@/lib/request/step-registry"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

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

  // Map URL param to unified service type
  // Returns null for invalid services (RequestFlow will show error)
  const initialService = mapServiceParam(params.service)

  return (
    <RequestFlow
      initialService={initialService}
      rawServiceParam={params.service}
      isAuthenticated={!!user}
      hasProfile={!!profile}
      hasMedicare={!!profile?.medicare_number}
      userEmail={user?.email ?? undefined}
      userName={profile?.full_name ?? undefined}
    />
  )
}
