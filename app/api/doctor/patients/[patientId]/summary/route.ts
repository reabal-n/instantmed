import { type NextRequest, NextResponse } from "next/server"

import { requireApiRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { getHealthProfile } from "@/lib/data/health-profile"
import { getPatientIntakes, getPatientNoteCount, getPatientNotes } from "@/lib/data/intakes"
import { doctorCanAccessPatient } from "@/lib/doctor/patient-access"
import { formatServiceType } from "@/lib/format/intake"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function compactText(value: string, maxLength = 180): string {
  const compacted = value.replace(/\s+/g, " ").trim()
  if (compacted.length <= maxLength) return compacted
  return `${compacted.slice(0, maxLength - 3)}...`
}

/**
 * GET /api/doctor/patients/[patientId]/summary
 *
 * Small patient-history bundle for staff drawers.
 * Auth: doctor or admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const { patientId } = await params

  if (!UUID_RE.test(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 })
  }

  const authResult = await requireApiRole(["doctor", "admin"])
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasAdminAccess(authResult.profile)) {
    const canAccessPatient = await doctorCanAccessPatient(authResult.profile.id, patientId)
    if (!canAccessPatient) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const [patientHistory, notes, totalNotes, healthProfile] = await Promise.all([
    getPatientIntakes(patientId, { pageSize: 10 }),
    getPatientNotes(patientId, undefined, 5),
    getPatientNoteCount(patientId),
    getHealthProfile(patientId),
  ])

  return NextResponse.json({
    totalIntakes: patientHistory.total,
    totalNotes,
    healthProfile: healthProfile
      ? {
          allergies: healthProfile.allergies,
          conditions: healthProfile.conditions,
          current_medications: healthProfile.current_medications,
          updated_at: healthProfile.updated_at,
        }
      : null,
    history: patientHistory.data.map((intake) => {
      const service = intake.service as { short_name?: string | null; name?: string | null; type?: string | null } | null
      return {
        id: intake.id,
        reference_number: intake.reference_number ?? null,
        status: intake.status,
        service_label: service?.short_name || service?.name || formatServiceType(service?.type || ""),
        created_at: intake.created_at,
      }
    }),
    notes: notes.map((note) => ({
      id: note.id,
      note_type: note.note_type,
      content: compactText(note.content),
      created_at: note.created_at,
      created_by_name: note.created_by_name ?? null,
    })),
  })
}
