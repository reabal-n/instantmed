import { NextRequest, NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { applyRateLimit } from "@/lib/rate-limit/redis"

/** Escape ILIKE special characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const variant = searchParams.get("variant") || "doctor"

  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json({ results: [] })
  }

  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, "standard", clerkUserId)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createServiceRoleClient()

  // SECURITY: Enforce role-based access — patients cannot use doctor/admin search variants
  let effectiveVariant = variant
  if (variant === "doctor" || variant === "admin") {
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (!callerProfile || (callerProfile.role !== "doctor" && callerProfile.role !== "admin")) {
      effectiveVariant = "patient" // Downgrade to patient search
    }
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
    if (effectiveVariant === "doctor" || effectiveVariant === "admin") {
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
          category
        `)
        .order("created_at", { ascending: false })
        .limit(20)

      if (intakes) {
        for (const intake of intakes) {
          const patientData = intake.patient as unknown as { id: string; full_name: string; medicare_number?: string } | null
          const serviceData = { name: intake.category || "Service", type: intake.category }
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
        .or(`full_name.ilike.%${escapeIlike(query)}%,medicare_number.ilike.%${escapeIlike(query)}%`)
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
    } else if (effectiveVariant === "patient") {
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
            category
          `)
          .eq("patient_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (intakes) {
          for (const intake of intakes) {
            const title = intake.category || "Service"
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
