import { buildPatientSnapshot, type PatientSnapshotInput } from "@/lib/doctor/patient-snapshot"

export interface PrescribingIdentityIntakeRow {
  id: string
  reference_number?: string | null
  status: string
  category?: string | null
  subtype?: string | null
  created_at: string
  paid_at?: string | null
  patient: PatientSnapshotInput
  answers?: Record<string, unknown> | null
}

export interface PrescribingIdentityBlockerItem {
  intakeId: string
  patientId: string
  referenceNumber: string | null
  status: string
  category: string | null
  subtype: string | null
  patientName: string
  createdAt: string
  paidAt: string | null
  blockers: string[]
  intakeHref: string
  profileHref: string
}

export interface PrescribingIdentityBlockerReport {
  totalActive: number
  blockedCount: number
  readyCount: number
  blockerCounts: Record<string, number>
  items: PrescribingIdentityBlockerItem[]
}

export function buildPrescribingIdentityBlockerReport(
  rows: PrescribingIdentityIntakeRow[],
): PrescribingIdentityBlockerReport {
  const items: PrescribingIdentityBlockerItem[] = []
  const blockerCounts: Record<string, number> = {}

  for (const row of rows) {
    const snapshot = buildPatientSnapshot(row.patient, {
      answers: row.answers,
      requireStructuredAddress: true,
      requireSex: true,
      requireMedicareDetails: true,
      validateMedicare: true,
    })

    if (snapshot.missingCriticalFields.length === 0) continue

    for (const blocker of snapshot.missingCriticalFields) {
      blockerCounts[blocker] = (blockerCounts[blocker] ?? 0) + 1
    }

    items.push({
      intakeId: row.id,
      patientId: row.patient.id,
      referenceNumber: row.reference_number ?? null,
      status: row.status,
      category: row.category ?? null,
      subtype: row.subtype ?? null,
      patientName: snapshot.name,
      createdAt: row.created_at,
      paidAt: row.paid_at ?? null,
      blockers: snapshot.missingCriticalFields,
      intakeHref: `/doctor/intakes/${row.id}`,
      profileHref: snapshot.profileHref,
    })
  }

  return {
    totalActive: rows.length,
    blockedCount: items.length,
    readyCount: rows.length - items.length,
    blockerCounts,
    items,
  }
}
