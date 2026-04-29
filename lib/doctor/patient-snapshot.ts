import { calculateAge, formatShortDateSafe } from "@/lib/format"
import type { AustralianState } from "@/types/db"

export interface PatientSnapshotInput {
  id: string
  full_name: string
  date_of_birth?: string | null
  medicare_number?: string | null
  phone?: string | null
  email?: string | null
  address_line1?: string | null
  suburb?: string | null
  state?: AustralianState | string | null
  postcode?: string | null
}

export interface PatientSnapshotField {
  label: string
  present: boolean
}

export interface PatientSnapshot {
  id: string
  name: string
  age: number | null
  dobLabel: string
  ageDobLabel: string
  medicare: PatientSnapshotField
  phone: PatientSnapshotField
  email: PatientSnapshotField
  address: PatientSnapshotField
  profileHref: string
  missingCriticalFields: string[]
  completenessLabel: string
  completenessTone: "complete" | "partial" | "missing"
}

export interface DuplicatePatientGroup {
  reason: "email" | "phone" | "name_dob"
  key: string
  patientIds: string[]
}

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalize(value: string | null | undefined): string {
  return present(value)?.toLowerCase().replace(/\s+/g, " ") ?? ""
}

function normalizePhone(value: string | null | undefined): string {
  return present(value)?.replace(/[^\d+]/g, "") ?? ""
}

function buildAddress(patient: PatientSnapshotInput): string | null {
  const parts = [
    present(patient.address_line1),
    present(patient.suburb),
    present(patient.state),
    present(patient.postcode),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : null
}

export function buildPatientSnapshot(
  patient: PatientSnapshotInput,
  options?: { now?: Date },
): PatientSnapshot {
  const age = options?.now && patient.date_of_birth
    ? calculateAgeAt(patient.date_of_birth, options.now)
    : calculateAge(patient.date_of_birth)
  const dobLabel = formatShortDateSafe(patient.date_of_birth) ?? "DOB not collected"
  const ageDobLabel = patient.date_of_birth
    ? `${age != null ? `${age}y` : "Age unknown"} / ${dobLabel}`
    : "DOB not collected"
  const medicare = present(patient.medicare_number)
  const phone = present(patient.phone)
  const email = present(patient.email)
  const address = buildAddress(patient)

  const missingCriticalFields = [
    patient.date_of_birth ? null : "DOB",
    medicare ? null : "Medicare",
    phone ? null : "Phone",
    address ? null : "Address",
  ].filter(Boolean) as string[]

  const completenessTone = missingCriticalFields.length === 0
    ? "complete"
    : missingCriticalFields.length >= 3
      ? "missing"
      : "partial"

  return {
    id: patient.id,
    name: present(patient.full_name) ?? "Unnamed patient",
    age,
    dobLabel,
    ageDobLabel,
    medicare: {
      label: medicare ?? "Medicare not collected",
      present: Boolean(medicare),
    },
    phone: {
      label: phone ?? "Phone not collected",
      present: Boolean(phone),
    },
    email: {
      label: email ?? "Email not collected",
      present: Boolean(email),
    },
    address: {
      label: address ?? "Address not collected",
      present: Boolean(address),
    },
    profileHref: `/doctor/patients/${patient.id}`,
    missingCriticalFields,
    completenessLabel: missingCriticalFields.length > 0
      ? `Missing ${missingCriticalFields.join(", ")}`
      : "Patient details complete",
    completenessTone,
  }
}

export function findPotentialDuplicatePatients(
  patients: PatientSnapshotInput[],
): DuplicatePatientGroup[] {
  const groups = new Map<string, DuplicatePatientGroup>()

  for (const patient of patients) {
    const candidates: Array<{ reason: DuplicatePatientGroup["reason"]; key: string }> = []
    const phone = normalizePhone(patient.phone)
    const email = normalize(patient.email)
    const nameDob = normalize(patient.full_name) && patient.date_of_birth
      ? `${normalize(patient.full_name)}|${patient.date_of_birth}`
      : ""

    if (phone) candidates.push({ reason: "phone", key: phone })
    if (email) candidates.push({ reason: "email", key: email })
    if (nameDob) candidates.push({ reason: "name_dob", key: nameDob })

    for (const candidate of candidates) {
      const mapKey = `${candidate.reason}:${candidate.key}`
      const group = groups.get(mapKey) ?? {
        reason: candidate.reason,
        key: candidate.key,
        patientIds: [],
      }
      if (!group.patientIds.includes(patient.id)) {
        group.patientIds.push(patient.id)
      }
      groups.set(mapKey, group)
    }
  }

  const priority: Record<DuplicatePatientGroup["reason"], number> = {
    phone: 0,
    email: 1,
    name_dob: 2,
  }

  const uniqueByPatientSet = new Map<string, DuplicatePatientGroup>()

  for (const group of groups.values()) {
    if (group.patientIds.length < 2) continue
    const patientSetKey = [...group.patientIds].sort().join("|")
    const existing = uniqueByPatientSet.get(patientSetKey)
    if (!existing || priority[group.reason] < priority[existing.reason]) {
      uniqueByPatientSet.set(patientSetKey, group)
    }
  }

  return [...uniqueByPatientSet.values()]
    .filter((group) => group.patientIds.length > 1)
    .sort((a, b) => b.patientIds.length - a.patientIds.length)
}

function calculateAgeAt(dob: string, now: Date): number | null {
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return null
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDiff = now.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
