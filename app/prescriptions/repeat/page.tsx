import { Suspense } from "react"
import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { RepeatRxIntakeFlow } from "@/components/repeat-rx/intake-flow"

// SEO Metadata
export const metadata: Metadata = {
  title: "Repeat Prescription | InstantMed",
  description:
    "Request a repeat of your existing medication online. AHPRA-registered doctors, same-day electronic scripts.",
  openGraph: {
    title: "Repeat Prescription | InstantMed",
    description: "Same medication, same dose, less hassle. Get your repeat prescription online.",
    type: "website",
    images: [
      {
        url: "/og/repeat-prescription.png",
        width: 1200,
        height: 630,
        alt: "InstantMed Repeat Prescription",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Repeat Prescription | InstantMed",
    description: "Same medication, same dose, less hassle. Get your repeat prescription online.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

// Loading state component
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Server-side data fetching
async function getPatientData() {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return {
      patientId: null,
      isAuthenticated: false,
      needsOnboarding: true,
      userEmail: undefined,
      userName: undefined,
      userPhone: undefined,
      userDob: undefined,
      userAddress: undefined,
      preferredPharmacy: null,
    }
  }
  
  // Get patient profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      phone,
      date_of_birth,
      address,
      onboarding_complete,
      preferred_pharmacy_name,
      preferred_pharmacy_address,
      preferred_pharmacy_phone
    `)
    .eq("user_id", session.user.id)
    .single()
  
  const preferredPharmacy = profile?.preferred_pharmacy_name
    ? {
        name: profile.preferred_pharmacy_name,
        address: profile.preferred_pharmacy_address || "",
        phone: profile.preferred_pharmacy_phone || "",
      }
    : null
  
  return {
    patientId: profile?.id || null,
    isAuthenticated: true,
    needsOnboarding: !profile?.onboarding_complete,
    userEmail: profile?.email || session.user.email,
    userName: profile?.full_name || session.user.user_metadata?.full_name,
    userPhone: profile?.phone || undefined,
    userDob: profile?.date_of_birth || undefined,
    userAddress: profile?.address || undefined,
    preferredPharmacy,
  }
}

// Main page component
export default async function RepeatPrescriptionPage() {
  const patientData = await getPatientData()
  
  return (
    <Suspense fallback={<LoadingState />}>
      <RepeatRxIntakeFlow
        patientId={patientData.patientId}
        isAuthenticated={patientData.isAuthenticated}
        needsOnboarding={patientData.needsOnboarding}
        userEmail={patientData.userEmail}
        userName={patientData.userName}
        userPhone={patientData.userPhone}
        userDob={patientData.userDob}
        userAddress={patientData.userAddress}
        preferredPharmacy={patientData.preferredPharmacy}
      />
    </Suspense>
  )
}
