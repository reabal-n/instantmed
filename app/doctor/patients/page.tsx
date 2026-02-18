import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PatientsListClient } from "./patients-list-client"

async function getAllPatients() {
  const supabase = createServiceRoleClient()

  // Add pagination to prevent crash with thousands of patients
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, auth_user_id, clerk_user_id, email, full_name, first_name, last_name,
      date_of_birth, role, phone, address_line1, suburb, state, postcode,
      medicare_number, medicare_irn, medicare_expiry,
      ahpra_number, ahpra_verified, ahpra_verified_at, ahpra_verified_by,
      provider_number, consent_myhr, onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, created_at, updated_at
    `)
    .eq("role", "patient")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    // Server-side error - use logger in production, console in dev
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error("Error fetching patients:", error)
    return []
  }

  return data as unknown as import("@/types/db").Profile[]
}

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export default async function PatientsPage() {
  // Layout enforces doctor/admin role
  await requireRole(["doctor", "admin"])

  const patients = await getAllPatients()

  return <PatientsListClient patients={patients} />
}
