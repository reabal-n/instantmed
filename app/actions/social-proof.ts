"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface SocialProofItem {
  city: string
  service: string
  minutesAgo: number
}

const AUSTRALIAN_CITIES = [
  "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
  "Gold Coast", "Canberra", "Newcastle", "Hobart", "Geelong",
]

const SERVICE_LABELS: Record<string, string> = {
  medical_certificate: "medical certificate",
  prescription: "prescription",
  consult: "consultation",
}

/**
 * Fetch recent approved intakes for social proof notifications.
 * Returns anonymized data (city only, no names/emails).
 */
export async function getRecentApprovals(): Promise<SocialProofItem[]> {
  const supabase = createServiceRoleClient()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select("approved_at, category, patient:profiles!intakes_patient_id_fkey(state)")
    .not("approved_at", "is", null)
    .gte("approved_at", twoHoursAgo)
    .order("approved_at", { ascending: false })
    .limit(10)

  if (error || !data) return []

  const now = Date.now()

  return data
    .map((intake) => {
      const approvedAt = new Date(intake.approved_at as string).getTime()
      const minutesAgo = Math.max(1, Math.round((now - approvedAt) / 60000))
      // Use state to pick a city, or fallback to random Australian city
      const patientState = (intake.patient as { state?: string } | null)?.state
      const city = stateToCityMap(patientState)
      const service = SERVICE_LABELS[intake.category || "medical_certificate"] || "medical certificate"

      return { city, service, minutesAgo }
    })
    .filter((item) => item.minutesAgo <= 120)
}

function stateToCityMap(state?: string | null): string {
  const mapping: Record<string, string[]> = {
    NSW: ["Sydney", "Newcastle"],
    VIC: ["Melbourne", "Geelong"],
    QLD: ["Brisbane", "Gold Coast"],
    WA: ["Perth"],
    SA: ["Adelaide"],
    TAS: ["Hobart"],
    ACT: ["Canberra"],
    NT: ["Darwin"],
  }
  if (state && mapping[state]) {
    const cities = mapping[state]
    return cities[Math.floor(Math.random() * cities.length)]
  }
  return AUSTRALIAN_CITIES[Math.floor(Math.random() * AUSTRALIAN_CITIES.length)]
}
