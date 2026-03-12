import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
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
      id, auth_user_id, clerk_user_id, email, full_name, first_name, last_name,
      date_of_birth, role, phone, address_line1, suburb, state, postcode,
      medicare_number, medicare_irn, medicare_expiry,
      ahpra_number, ahpra_verified, ahpra_verified_at, ahpra_verified_by,
      provider_number, consent_myhr, onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, created_at, updated_at
    `, { count: "exact" })
    .eq("role", "patient")
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    log.error("Failed to fetch patients list", { error: error.message, page: from })
    return { patients: [], total: 0 }
  }

  return {
    patients: data as unknown as import("@/types/db").Profile[],
    total: count ?? 0,
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
  const { patients, total } = await getPatients(page)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <PatientsListClient
      patients={patients}
      currentPage={page}
      totalPages={totalPages}
      totalPatients={total}
    />
  )
}
