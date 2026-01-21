import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PatientsListClient } from "./patients-list-client"

async function getAllPatients() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "patient")
    .order("created_at", { ascending: false })

  if (error) {
    // Server-side error - use logger in production, console in dev
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error("Error fetching patients:", error)
    return []
  }

  return data
}

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export default async function PatientsPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const patients = await getAllPatients()

  return <PatientsListClient patients={patients} />
}
