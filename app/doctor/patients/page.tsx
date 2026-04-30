import { decryptProfilePhi } from "@/lib/data/profiles"
import { collapseDuplicatePatientProfiles } from "@/lib/doctor/patient-snapshot"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { asProfile } from "@/types/db"

import { PatientsListClient } from "./patients-list-client"

const log = createLogger("doctor-patients")

const PAGE_SIZE = 50

async function getPatients(page: number) {
  const supabase = createServiceRoleClient()

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from("profiles")
    .select(`
      id, auth_user_id, email, full_name, first_name, last_name,
      date_of_birth, date_of_birth_encrypted, role, phone, phone_encrypted,
      address_line1, suburb, state, postcode,
      medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
      onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, created_at, updated_at
    `, { count: "exact" })
    .eq("role", "patient")
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch patients list", { error: error.message, page: from })
    return { patients: [], total: 0, rawTotal: 0, collapsedCount: 0 }
  }

  const rawPatients = (data || []).map(row => asProfile(decryptProfilePhi(row as Record<string, unknown>)))
  const collapsed = collapseDuplicatePatientProfiles(rawPatients)

  return {
    patients: collapsed.patients.slice(from, to + 1),
    total: collapsed.patients.length,
    rawTotal: count ?? rawPatients.length,
    collapsedCount: collapsed.collapsedCount,
  }
}

export const metadata = { title: "Patients" }

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  // Layout enforces doctor/admin role
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const { patients, total, rawTotal, collapsedCount } = await getPatients(page)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <PatientsListClient
      patients={patients}
      currentPage={page}
      totalPages={totalPages}
      totalPatients={total}
      rawPatientProfiles={rawTotal}
      collapsedDuplicateProfiles={collapsedCount}
    />
  )
}
