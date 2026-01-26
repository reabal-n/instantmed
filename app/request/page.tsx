import type { Metadata } from "next"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { RequestFlow } from "@/components/request"
import { mapServiceParam } from "@/lib/request/step-registry"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Get Started | InstantMed",
  description:
    "Medical certificates from $19, repeat prescriptions $29.95, doctor consultations from $49.95. Reviewed by Australian doctors. Most requests completed within 1 hour.",
  openGraph: {
    title: "Get Started | InstantMed",
    description: "Medical certificates, prescriptions, and consultations online. Reviewed by Australian doctors.",
  },
}

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    service?: string
    subtype?: string
    medication?: string
  }>
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
      initialSubtype={params.subtype}
      initialMedication={params.medication}
      isAuthenticated={!!user}
      hasProfile={!!profile}
      hasMedicare={!!profile?.medicare_number}
      userEmail={user?.email ?? undefined}
      userName={profile?.full_name ?? undefined}
    />
  )
}
