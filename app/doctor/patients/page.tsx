import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PatientsListClient } from "./patients-list-client"

async function getAllPatients() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "patient")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching patients:", error)
    return []
  }

  return data
}

export default async function PatientsPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const patients = await getAllPatients()

  return <PatientsListClient patients={patients} />
}
