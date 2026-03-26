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
  const effectiveVariant = variant
  if (variant === "doctor" || variant === "admin") {
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (!callerProfile || (callerProfile.role !== "doctor" && callerProfile.role !== "admin")) {
      log.warn("Unauthorized search variant request", {
        requestedVariant: variant,
        callerRole: callerProfile?.role || "unknown",
      })
      return NextResponse.json(
        { error: "Insufficient permissions for this search variant" },
        { status: 403 }
      )
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
      // Step 1: Find matching patients by name/medicare at the DB level (not in-memory JS)
      const { data: matchingPatients } = await supabase
        .from("profiles")
        .select("id, full_name, medicare_number")
        .eq("role", "patient")
        .or(`full_name.ilike.%${escapeIlike(query)}%,medicare_number.ilike.%${escapeIlike(query)}%`)
        .limit(20)

      const patientIds = matchingPatients?.map(p => p.id) ?? []

      if (patientIds.length > 0) {
        // Step 2: Get most recent intake per matching patient
        const { data: intakes } = await supabase
          .from("intakes")
          .select("id, status, created_at, category, patient_id")
          .in("patient_id", patientIds)
          .order("created_at", { ascending: false })
          .limit(20)

        const patientMap = new Map(matchingPatients?.map(p => [p.id, p]) ?? [])

        if (intakes) {
          for (const intake of intakes) {
            const patientData = patientMap.get(intake.patient_id)
            results.push({
              id: intake.id,
              type: "intake",
              title: patientData?.full_name || "Unknown Patient",
              subtitle: intake.category || "Service",
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
