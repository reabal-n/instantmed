import "server-only"

import { decryptProfilePhi } from "@/lib/data/profiles"
import { getDoctorAccessiblePatientIds } from "@/lib/doctor/patient-access"
import { collapseDuplicatePatientProfiles } from "@/lib/doctor/patient-snapshot"
import { createLogger } from "@/lib/observability/logger"
import { getServicePresentation } from "@/lib/services/service-presentation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { asProfile, type Profile } from "@/types/db"

const log = createLogger("patient-directory")

export type PatientDirectoryProfile = Profile & {
  duplicate_profile_ids?: string[]
  lastRequest?: PatientDirectoryRequestSummary | null
  lastScript?: PatientDirectoryScriptSummary | null
}

export interface PatientDirectoryRequestSummary {
  id: string
  referenceNumber: string | null
  serviceLabel: string
  serviceShortLabel: string
  serviceType: string | null
  category: string | null
  subtype: string | null
  status: string
  createdAt: string
  paidAt: string | null
}

export interface PatientDirectoryScriptSummary {
  id: string
  intakeId: string | null
  label: string
  status: string
  createdAt: string
  sentAt: string | null
}

export const PATIENT_DIRECTORY_SORT_OPTIONS = [
  "recent_request",
  "request_type",
  "recent_script",
  "name",
  "joined",
] as const

export type PatientDirectorySort = (typeof PATIENT_DIRECTORY_SORT_OPTIONS)[number]

export function parsePatientDirectorySort(value?: string | string[] | null): PatientDirectorySort {
  const candidate = Array.isArray(value) ? value[0] : value
  return PATIENT_DIRECTORY_SORT_OPTIONS.includes(candidate as PatientDirectorySort)
    ? (candidate as PatientDirectorySort)
    : "recent_request"
}

export function parsePatientDirectorySearch(value?: string | string[] | null): string {
  const candidate = Array.isArray(value) ? value[0] : value
  return normalizePatientDirectorySearch(candidate)
}

export interface PatientDirectoryPage {
  patients: PatientDirectoryProfile[]
  total: number
  collapsedCount: number
}

export async function getPatientDirectoryPage({
  doctorId,
  page,
  pageSize = 50,
  sort = "recent_request",
  search,
}: {
  doctorId?: string
  page: number
  pageSize?: number
  sort?: PatientDirectorySort
  search?: string
}): Promise<PatientDirectoryPage> {
  const supabase = createServiceRoleClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const searchFilter = buildPatientDirectorySearchFilter(search)

  const accessiblePatientIds = doctorId
    ? Array.from(await getDoctorAccessiblePatientIds(doctorId, supabase))
    : null

  if (doctorId && accessiblePatientIds?.length === 0) {
    return { patients: [], total: 0, collapsedCount: 0 }
  }

  let query = supabase
    .from("profiles")
    .select(`
      id, auth_user_id, email, full_name, first_name, last_name,
      date_of_birth, date_of_birth_encrypted, role, phone, phone_encrypted,
      address_line1, suburb, state, postcode,
      medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
      ihi_number, ihi_number_encrypted,
      parchment_patient_id,
      onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, parchment_patient_id,
      merged_into_profile_id, merged_at, merged_by, merge_reason,
      created_at, updated_at
    `, { count: "exact" })
    .eq("role", "patient")
    .is("merged_into_profile_id", null)

  query = sort === "name"
    ? query.order("full_name", { ascending: true })
    : query.order("created_at", { ascending: false })

  if (accessiblePatientIds) {
    query = query.in("id", accessiblePatientIds)
  }

  if (searchFilter) {
    query = query.or(searchFilter)
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    log.error("Failed to fetch patient directory", { error: error.message, page: from })
    return { patients: [], total: 0, collapsedCount: 0 }
  }

  const rawPatients = (data || []).map((row) =>
    asProfile(decryptProfilePhi(row as Record<string, unknown>)),
  )
  const patientIds = rawPatients.map((patient) => patient.id)
  const [lastRequests, lastScripts] = await Promise.all([
    getLastRequestMap(patientIds),
    getLastScriptMap(patientIds),
  ])
  const collapsed = collapseDuplicatePatientProfiles(rawPatients)
  const patients = collapsed.patients
    .map((patient) => hydrateDirectoryPatient(patient, lastRequests, lastScripts))
    .sort((a, b) => compareDirectoryPatients(a, b, sort))
  const rawTotal = count ?? rawPatients.length

  return {
    patients,
    total: rawTotal,
    collapsedCount: collapsed.collapsedCount,
  }
}

function normalizePatientDirectorySearch(value?: string | null): string {
  return (value ?? "")
    .replace(/[,%()_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function buildPatientDirectorySearchFilter(value?: string | null): string | null {
  const search = normalizePatientDirectorySearch(value)
  if (!search) return null

  const filters = [
    `full_name.ilike.%${search}%`,
    `email.ilike.%${search}%`,
    `suburb.ilike.%${search}%`,
  ]
  const phoneDigits = search.replace(/\D/g, "")
  if (phoneDigits.length >= 3) {
    filters.push(`phone.ilike.%${phoneDigits}%`)
  }

  return filters.join(",")
}

type RelatedRow<T> = T | T[] | null | undefined

function firstRelated<T>(value: RelatedRow<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

type DirectoryIntakeRow = {
  id: string
  patient_id: string
  reference_number: string | null
  category: string | null
  subtype: string | null
  status: string
  created_at: string
  paid_at: string | null
  service?: {
    name?: string | null
    short_name?: string | null
    type?: string | null
  } | Array<{
    name?: string | null
    short_name?: string | null
    type?: string | null
  }> | null
}

type DirectoryScriptTaskRow = {
  id: string
  intake_id: string | null
  medication_name: string | null
  status: string
  created_at: string
  sent_at: string | null
  intake?: { patient_id?: string | null } | Array<{ patient_id?: string | null }> | null
}

type DirectoryPrescriptionRow = {
  id: string
  intake_id: string | null
  patient_id: string
  medication_name: string | null
  status: string
  issued_date: string | null
  created_at: string
}

async function getLastRequestMap(patientIds: string[]): Promise<Map<string, PatientDirectoryRequestSummary>> {
  const map = new Map<string, PatientDirectoryRequestSummary>()
  if (patientIds.length === 0) return map

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      reference_number,
      category,
      subtype,
      status,
      created_at,
      paid_at,
      service:services(name, short_name, type)
    `)
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error || !data) {
    log.warn("Failed to fetch patient directory request summaries", { error: error?.message })
    return map
  }

  for (const row of data as DirectoryIntakeRow[]) {
    if (map.has(row.patient_id)) continue
    const service = firstRelated(row.service)
    const presentation = getServicePresentation({
      type: service?.type,
      category: row.category,
      name: service?.name,
      shortName: service?.short_name,
    })

    map.set(row.patient_id, {
      id: row.id,
      referenceNumber: row.reference_number,
      serviceLabel: presentation.label,
      serviceShortLabel: presentation.shortLabel,
      serviceType: service?.type ?? null,
      category: row.category,
      subtype: row.subtype,
      status: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    })
  }

  return map
}

async function getLastScriptMap(patientIds: string[]): Promise<Map<string, PatientDirectoryScriptSummary>> {
  const map = new Map<string, PatientDirectoryScriptSummary>()
  if (patientIds.length === 0) return map

  const supabase = createServiceRoleClient()
  const { data: prescriptions, error: prescriptionsError } = await supabase
    .from("prescriptions")
    .select("id, intake_id, patient_id, medication_name, status, issued_date, created_at")
    .in("patient_id", patientIds)
    .order("issued_date", { ascending: false, nullsFirst: false })
    .limit(1000)

  if (prescriptionsError) {
    log.warn("Failed to fetch patient directory prescription summaries", { error: prescriptionsError.message })
  }

  for (const row of (prescriptions || []) as DirectoryPrescriptionRow[]) {
    if (map.has(row.patient_id)) continue
    map.set(row.patient_id, {
      id: row.id,
      intakeId: row.intake_id,
      label: row.medication_name?.trim() || "Prescription",
      status: row.status,
      createdAt: row.created_at,
      sentAt: row.issued_date,
    })
  }

  const { data, error } = await supabase
    .from("script_tasks")
    .select("id, intake_id, medication_name, status, created_at, sent_at, intake:intakes(patient_id)")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error || !data) {
    log.warn("Failed to fetch patient directory script summaries", { error: error?.message })
    return map
  }

  const allowedPatientIds = new Set(patientIds)
  for (const row of data as DirectoryScriptTaskRow[]) {
    const patientId = firstRelated(row.intake)?.patient_id ?? null
    if (!patientId || !allowedPatientIds.has(patientId) || map.has(patientId)) continue

    map.set(patientId, {
      id: row.id,
      intakeId: row.intake_id,
      label: row.medication_name?.trim() || "Script task",
      status: row.status,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    })
  }

  return map
}

function latestByDate<T>(
  ids: string[],
  map: Map<string, T>,
  getDate: (value: T) => string | null,
): T | null {
  return ids
    .map((id) => map.get(id))
    .filter((value): value is T => Boolean(value))
    .sort((a, b) => new Date(getDate(b) ?? 0).getTime() - new Date(getDate(a) ?? 0).getTime())[0] ?? null
}

function hydrateDirectoryPatient(
  patient: PatientDirectoryProfile,
  lastRequests: Map<string, PatientDirectoryRequestSummary>,
  lastScripts: Map<string, PatientDirectoryScriptSummary>,
): PatientDirectoryProfile {
  const linkedIds = [patient.id, ...(patient.duplicate_profile_ids ?? [])]
  return {
    ...patient,
    lastRequest: latestByDate(linkedIds, lastRequests, (request) => request.createdAt),
    lastScript: latestByDate(linkedIds, lastScripts, (script) => script.sentAt ?? script.createdAt),
  }
}

function compareDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  return new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime()
}

function compareDirectoryPatients(
  a: PatientDirectoryProfile,
  b: PatientDirectoryProfile,
  sort: PatientDirectorySort,
): number {
  const byName = a.full_name.localeCompare(b.full_name)

  if (sort === "name") return byName
  if (sort === "joined") return compareDateDesc(a.created_at, b.created_at) || byName
  if (sort === "request_type") {
    return (
      (a.lastRequest?.serviceLabel ?? "No request").localeCompare(b.lastRequest?.serviceLabel ?? "No request") ||
      compareDateDesc(a.lastRequest?.createdAt, b.lastRequest?.createdAt) ||
      byName
    )
  }
  if (sort === "recent_script") {
    return (
      compareDateDesc(a.lastScript?.sentAt ?? a.lastScript?.createdAt, b.lastScript?.sentAt ?? b.lastScript?.createdAt) ||
      byName
    )
  }

  return (
    compareDateDesc(a.lastRequest?.createdAt ?? a.created_at, b.lastRequest?.createdAt ?? b.created_at) ||
    byName
  )
}
