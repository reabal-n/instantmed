import type { Metadata } from "next"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import OurDoctorsClient from "./our-doctors-client"

export const metadata: Metadata = {
  title: "Our Doctors | AHPRA-Registered Australian GPs",
  description:
    "Every InstantMed request is reviewed by AHPRA-registered Australian doctors with experience in general practice, emergency medicine, and telehealth.",
  openGraph: {
    title: "Our Doctors | InstantMed",
    description:
      "Every request is reviewed by a real doctor. AHPRA-registered Australian GPs with years of clinical experience.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/our-doctors",
  },
}

interface DoctorProfile {
  id: string
  full_name: string
  nominals: string | null
  ahpra_number: string | null
}

export default async function OurDoctorsPage() {
  // Fetch verified doctors with AHPRA numbers
  const supabase = createServiceRoleClient()
  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name, nominals, ahpra_number")
    .in("role", ["doctor", "admin"])
    .eq("is_active", true)
    .not("ahpra_number", "is", null)
    .order("full_name")

  const verifiedDoctors: DoctorProfile[] = (doctors || []).filter(
    (d) => d.full_name && d.ahpra_number
  )

  return <OurDoctorsClient doctors={verifiedDoctors} />
}
