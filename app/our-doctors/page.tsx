import type { Metadata } from "next"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

import OurDoctorsClient from "./our-doctors-client"

export const metadata: Metadata = {
  title: "Our Clinical Team | AHPRA-Registered Australian Practice",
  description:
    "InstantMed operates under AHPRA-registered Medical Director oversight. Every request is reviewed by a real Australian GP with experience in general practice, emergency medicine, and telehealth.",
  openGraph: {
    title: "Our Clinical Team | InstantMed",
    description:
      "Every request is reviewed by a real Australian GP. AHPRA-registered Medical Director oversight. Independent registration verification via the AHPRA public register.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/our-doctors",
  },
}

export default async function OurDoctorsPage() {
  // Multi-doctor model: we never expose individual doctor names on marketing
  // pages (per CLAUDE.md Platform Identity + feedback_author.md). We only
  // surface a count of AHPRA-verified consulting doctors.
  const supabase = createServiceRoleClient()
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["doctor", "admin"])
    .eq("is_active", true)
    .not("ahpra_number", "is", null)

  const verifiedDoctorCount = count ?? 0

  return <OurDoctorsClient verifiedDoctorCount={verifiedDoctorCount} />
}
