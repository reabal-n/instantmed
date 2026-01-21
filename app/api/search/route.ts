import { NextRequest, NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const variant = searchParams.get("variant") || "doctor"

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Check auth via Supabase
  const supabase = createServiceRoleClient()
  const { userId: clerkUserId } = await auth()
  
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Array<{
    id: string
    type: "intake" | "patient"
    title: string
    subtitle: string
    status?: string
    href: string
  }> = []

  try {
    if (variant === "doctor" || variant === "admin") {
      const { data: intakes } = await supabase
        .from("intakes")
        .select(`
          id,
          status,
          created_at,
          patient:profiles!patient_id (
            id,
            full_name,
            medicare_number
          ),
          service:services!service_id (
            name,
            type
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20)

      if (intakes) {
        for (const intake of intakes) {
          const patientData = intake.patient as unknown as { id: string; full_name: string; medicare_number?: string } | null
          const serviceData = intake.service as unknown as { name: string; type: string } | null
          if (patientData?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
              patientData?.medicare_number?.includes(query)) {
            results.push({
              id: intake.id,
              type: "intake",
              title: patientData?.full_name || "Unknown Patient",
              subtitle: serviceData?.name || "Service",
              status: intake.status,
              href: `/doctor/intakes/${intake.id}`,
            })
          }
        }
      }

      // Search patients directly
      const { data: patients } = await supabase
        .from("profiles")
        .select("id, full_name, medicare_number, created_at")
        .eq("role", "patient")
        .or(`full_name.ilike.%${query}%,medicare_number.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(5)

      if (patients) {
        for (const patient of patients) {
          // Avoid duplicates
          if (!results.some(r => r.title === patient.full_name && r.type === "patient")) {
            results.push({
              id: patient.id,
              type: "patient",
              title: patient.full_name,
              subtitle: patient.medicare_number ? `Medicare: ${maskMedicare(patient.medicare_number)}` : "Patient",
              href: `/doctor/patients/${patient.id}`,
            })
          }
        }
      }
    } else if (variant === "patient") {
      // Patient can only search their own requests
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .single()

      if (profile) {
        const { data: intakes } = await supabase
          .from("intakes")
          .select(`
            id,
            status,
            created_at,
            service:services!service_id ( name )
          `)
          .eq("patient_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (intakes) {
          for (const intake of intakes) {
            const serviceData = intake.service as unknown as { name: string } | null
            const title = serviceData?.name || "Service"
            if (title.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                id: intake.id,
                type: "intake",
                title,
                subtitle: new Date(intake.created_at).toLocaleDateString("en-AU"),
                status: intake.status,
                href: `/patient/intakes/${intake.id}`,
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    log.error("Search error", { error: String(error) })
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

function maskMedicare(medicare: string): string {
  const cleaned = medicare.replace(/\s/g, "")
  if (cleaned.length < 6) return medicare
  return `${cleaned.slice(0, 4)}••••${cleaned.slice(-2)}`
}
