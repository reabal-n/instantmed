import { NextRequest, NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { hasAdminAccess, hasDoctorAccess } from "@/lib/auth/staff-capabilities"
import { SEEDED_E2E_PATIENT_PROFILE_ID, shouldIncludeSeededE2EData } from "@/lib/data/seeded-e2e-data"
import { getDoctorAccessiblePatientIds } from "@/lib/doctor/patient-access"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("palette-search")

const PATIENT_LIMIT = 6
const INTAKE_LIMIT = 6

export const dynamic = "force-dynamic"

interface PaletteResult {
  id: string
  kind: "patient" | "intake"
  title: string
  detail: string
  href: string
  badge: string
}

/**
 * Staff command-palette fuzzy search.
 *
 * GET /api/admin/palette-search?q=...
 *
 * Searches across:
 *   - profiles: full_name ILIKE, email ILIKE, medicare_number trail
 *   - intakes:  reference_number ILIKE
 *
 * Runs in parallel via Promise.all. Results are merged and capped at
 * 12 (6 patients + 6 intakes). Caller is responsible for routing the
 * `href` field. The endpoint is rate-limited like other staff APIs
 * and gated to admin/doctor only. Support staff get the local nav-only
 * palette; they must not be able to enumerate patients by name, email, or
 * Medicare trail from a global search box.
 *
 * Why not full-text search: ILIKE on the indexed columns is plenty
 * fast for an N≈10k-row patient table, and the palette query is
 * debounced client-side. If we ever cross 100k patients we can layer
 * a trigram index without changing the API.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const auth = await getApiAuth()
  if (!auth || (!hasAdminAccess(auth.profile) && !hasDoctorAccess(auth.profile))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] satisfies PaletteResult[] })
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  // Escape Postgres LIKE wildcards so a stray % or _ in user input doesn't
  // explode the query into a full table scan.
  const escaped = q.replace(/[\\%_]/g, "\\$&")
  const pattern = `%${escaped}%`

  const isAdmin = hasAdminAccess(auth.profile)
  const accessiblePatientIds = isAdmin
    ? null
    : Array.from(await getDoctorAccessiblePatientIds(auth.profile.id, supabase))

  if (!isAdmin && accessiblePatientIds?.length === 0) {
    return NextResponse.json({ results: [] satisfies PaletteResult[] })
  }

  const includeSeeded = shouldIncludeSeededE2EData()
  const patientQuery = supabase
    .from("profiles")
    .select("id, full_name, email, medicare_number, phone")
    .eq("role", "patient")
    .is("merged_into_profile_id", null)
    .or(`full_name.ilike.${pattern},email.ilike.${pattern},medicare_number.ilike.${pattern}`)
    .limit(PATIENT_LIMIT)
  if (accessiblePatientIds) {
    patientQuery.in("id", accessiblePatientIds)
  }
  if (!includeSeeded) {
    patientQuery.neq("id", SEEDED_E2E_PATIENT_PROFILE_ID)
  }

  const intakeQuery = supabase
    .from("intakes")
    .select(`
      id,
      reference_number,
      status,
      category,
      subtype,
      created_at,
      patient_id,
      patient:profiles!patient_id (id, full_name)
    `)
    .ilike("reference_number", pattern)
    .limit(INTAKE_LIMIT)
  if (accessiblePatientIds) {
    intakeQuery.in("patient_id", accessiblePatientIds)
  }
  if (!includeSeeded) {
    intakeQuery.neq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
  }

  const [patientsResult, intakesResult] = await Promise.all([patientQuery, intakeQuery])

  if (patientsResult.error) {
    log.warn("palette-search patient query failed", { q }, patientsResult.error)
  }
  if (intakesResult.error) {
    log.warn("palette-search intake query failed", { q }, intakesResult.error)
  }

  const patientResults: PaletteResult[] = (patientsResult.data ?? []).map((row) => {
    const fullName = (row as { full_name?: string | null }).full_name ?? "Unnamed patient"
    const email = (row as { email?: string | null }).email ?? null
    const medicare = (row as { medicare_number?: string | null }).medicare_number ?? null
    const detailParts = [
      email,
      medicare ? `Medicare ${medicare.slice(-4).padStart(medicare.length, "•")}` : null,
    ].filter((part): part is string => Boolean(part))
    return {
      id: `patient-${(row as { id: string }).id}`,
      kind: "patient",
      title: fullName,
      detail: detailParts.join(" · ") || "Patient",
      href: `/doctor/patients/${(row as { id: string }).id}`,
      badge: "Patient",
    }
  })

  const intakeResults: PaletteResult[] = (intakesResult.data ?? []).map((row) => {
    const r = row as {
      id: string
      reference_number: string | null
      status: string | null
      category: string | null
      subtype: string | null
      patient?: { full_name?: string | null } | { full_name?: string | null }[] | null
    }
    const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient
    const patientName = patient?.full_name ?? "Unknown"
    const serviceLabel = [r.category, r.subtype].filter(Boolean).join(" · ") || "Intake"
    return {
      id: `intake-${r.id}`,
      kind: "intake",
      title: r.reference_number ?? `Intake ${r.id.slice(0, 6)}`,
      detail: `${patientName} · ${serviceLabel}${r.status ? ` · ${r.status}` : ""}`,
      href: isAdmin ? `/admin/intakes/${r.id}` : `/doctor/intakes/${r.id}`,
      badge: "Case",
    }
  })

  return NextResponse.json({
    results: [...patientResults, ...intakeResults] satisfies PaletteResult[],
  })
}
