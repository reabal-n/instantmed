import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth/helpers"
import { hasAdminAccess, hasDoctorAccess } from "@/lib/auth/staff-capabilities"
import { buildDoctorIntakeHref, buildStaffPatientHref } from "@/lib/dashboard/routes"
import { getDoctorAccessiblePatientIds } from "@/lib/doctor/patient-access"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("route")

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

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, "standard", userId)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createServiceRoleClient()

  // SECURITY: Enforce role-based access - patients cannot use doctor/admin search variants
  const effectiveVariant = variant
  // Patient-search scope for the doctor/admin variants. `null` = unscoped (admin
  // sees everyone); a string[] = a non-admin doctor restricted to patients they
  // have a concrete clinical relationship with. Without this, any non-admin
  // doctor could enumerate the entire patient roster (PHI / APP-11). Mirrors the
  // patient-directory boundary in lib/data/patient-directory.ts.
  let accessiblePatientIds: string[] | null = null
  if (variant === "doctor" || variant === "admin") {
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", userId)
      .single()

    if (!callerProfile || !hasDoctorAccess(callerProfile)) {
      log.warn("Unauthorized search variant request", {
        requestedVariant: variant,
        callerRole: callerProfile?.role || "unknown",
      })
      return NextResponse.json(
        { error: "Insufficient permissions for this search variant" },
        { status: 403 }
      )
    }

    if (!hasAdminAccess(callerProfile)) {
      const ids = await getDoctorAccessiblePatientIds(callerProfile.id, supabase)
      accessiblePatientIds = Array.from(ids)
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
      // A non-admin doctor with no accessible patients has nothing to search.
      if (accessiblePatientIds !== null && accessiblePatientIds.length === 0) {
        return NextResponse.json({ results: [] })
      }

      // Step 1: Find matching patients by name/medicare at the DB level (not in-memory JS)
      let matchingPatientsQuery = supabase
        .from("profiles")
        .select("id, full_name, medicare_number")
        .eq("role", "patient")
        .or(`full_name.ilike.%${escapeIlike(query)}%,medicare_number.ilike.%${escapeIlike(query)}%`)
      if (accessiblePatientIds !== null) {
        matchingPatientsQuery = matchingPatientsQuery.in("id", accessiblePatientIds)
      }
      const { data: matchingPatients } = await matchingPatientsQuery.limit(20)

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
              href: buildDoctorIntakeHref(intake.id),
            })
          }
        }
      }

      // Search patients directly
      let patientsQuery = supabase
        .from("profiles")
        .select("id, full_name, medicare_number, created_at")
        .eq("role", "patient")
        .or(`full_name.ilike.%${escapeIlike(query)}%,medicare_number.ilike.%${escapeIlike(query)}%`)
      if (accessiblePatientIds !== null) {
        patientsQuery = patientsQuery.in("id", accessiblePatientIds)
      }
      const { data: patients } = await patientsQuery
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
              href: buildStaffPatientHref(patient.id),
            })
          }
        }
      }
    } else if (effectiveVariant === "patient") {
      // Patient can only search their own requests
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", userId)
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
