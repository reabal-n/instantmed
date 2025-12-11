import "server-only"
import { createClient } from "@/lib/supabase/server"
import type {
  Request,
  RequestWithPatient,
  RequestWithDetails,
  RequestStatus,
  RequestInsert,
  RequestCategory,
  RequestSubtype,
} from "@/types/db"

/**
 * Fetch all requests for a given patient.
 * Returns requests sorted by created_at descending (newest first).
 * Optionally filter by status.
 */
export async function getPatientRequests(patientId: string, status?: RequestStatus): Promise<Request[]> {
  const supabase = await createClient()

  let query = supabase
    .from("requests")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching patient requests:", error)
    return []
  }

  return data as Request[]
}

/**
 * Get request counts by status for a patient
 */
export async function getPatientRequestStats(patientId: string): Promise<{
  total: number
  pending: number
  approved: number
  declined: number
  needs_follow_up: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("requests").select("status").eq("patient_id", patientId)

  if (error || !data) {
    console.error("Error fetching request stats:", error)
    return { total: 0, pending: 0, approved: 0, declined: 0, needs_follow_up: 0 }
  }

  const stats = {
    total: data.length,
    pending: data.filter((r) => r.status === "pending").length,
    approved: data.filter((r) => r.status === "approved").length,
    declined: data.filter((r) => r.status === "declined").length,
    needs_follow_up: data.filter((r) => r.status === "needs_follow_up").length,
  }

  return stats
}

/**
 * Fetch a single request for a patient (with ownership check)
 */
export async function getRequestForPatient(requestId: string, patientId: string): Promise<Request | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .eq("patient_id", patientId)
    .single()

  if (error || !data) {
    console.error("Error fetching request:", error)
    return null
  }

  return data as Request
}

/**
 * Fetch all requests by status (for doctor dashboard).
 * Includes patient profile information.
 * Returns requests sorted by created_at descending.
 * Only show paid requests to doctors
 */
export async function getAllRequestsByStatus(status: RequestStatus): Promise<RequestWithPatient[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (*)
    `)
    .eq("status", status)
    .eq("payment_status", "paid") // Only show paid requests
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching requests by status:", error)
    return []
  }

  return data as RequestWithPatient[]
}

/**
 * Fetch all requests with pending_payment status (for doctor info only).
 * These are NOT actionable by doctors until paid.
 */
export async function getRequestsAwaitingPayment(): Promise<RequestWithPatient[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (*)
    `)
    .eq("payment_status", "pending_payment")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching requests awaiting payment:", error)
    return []
  }

  return data as RequestWithPatient[]
}

/**
 * Fetch a single request with its answers and document.
 * Used for the doctor detail view.
 */
export async function getRequestWithDetails(requestId: string): Promise<RequestWithDetails | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (*),
      answers:request_answers (*)
    `)
    .eq("id", requestId)
    .single()

  if (error || !data) {
    console.error("Error fetching request details:", error)
    return null
  }

  // Supabase returns arrays for one-to-many, take first item or null
  return {
    ...data,
    answers: data.answers?.[0] || null,
    document: null, // Documents table not yet created
  } as RequestWithDetails
}

/**
 * Create a new request with answers.
 * Updated to support category and subtype directly in insert
 */
export async function createRequest(
  request: RequestInsert,
  answers: Record<string, unknown>,
  options?: { category?: RequestCategory; subtype?: RequestSubtype },
): Promise<Request | null> {
  const supabase = await createClient()

  const requestData = {
    patient_id: request.patient_id,
    type: request.type,
    status: request.status,
    category: request.category || options?.category || null,
    subtype: request.subtype || options?.subtype || null,
  }

  const { data: createdRequest, error: requestError } = await supabase
    .from("requests")
    .insert(requestData)
    .select()
    .single()

  if (requestError || !createdRequest) {
    console.error("Error creating request:", requestError)
    return null
  }

  const { error: answersError } = await supabase.from("request_answers").insert({
    request_id: createdRequest.id,
    answers,
  })

  if (answersError) {
    console.error("Error creating request answers:", answersError)
  }

  return createdRequest as Request
}

/**
 * Update request status (for doctor actions).
 */
export async function updateRequestStatus(requestId: string, status: RequestStatus): Promise<Request | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select()
    .single()

  if (error || !data) {
    console.error("Error updating request status:", error)
    return null
  }

  return data as Request
}

/**
 * Update clinical note for a request (doctor only).
 */
export async function updateClinicalNote(requestId: string, clinicalNote: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("requests")
    .update({ clinical_note: clinicalNote, updated_at: new Date().toISOString() })
    .eq("id", requestId)

  if (error) {
    console.error("Error updating clinical note:", error)
    return false
  }

  return true
}

/**
 * Update script sent status for a request (doctor only).
 */
export async function updateScriptSent(requestId: string, scriptSent: boolean, scriptNotes?: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("requests")
    .update({
      script_sent: scriptSent,
      script_sent_at: scriptSent ? new Date().toISOString() : null,
      script_notes: scriptNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    console.error("Error updating script sent status:", error)
    return false
  }

  return true
}

/**
 * Get all requests grouped by status for doctor dashboard
 * Only count paid requests
 */
export async function getDoctorDashboardStats(): Promise<{
  total: number
  pending: number
  approved: number
  declined: number
  needs_follow_up: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("requests").select("status, payment_status").eq("payment_status", "paid") // Only count paid requests

  if (error || !data) {
    console.error("Error fetching dashboard stats:", error)
    return { total: 0, pending: 0, approved: 0, declined: 0, needs_follow_up: 0 }
  }

  return {
    total: data.length,
    pending: data.filter((r) => r.status === "pending").length,
    approved: data.filter((r) => r.status === "approved").length,
    declined: data.filter((r) => r.status === "declined").length,
    needs_follow_up: data.filter((r) => r.status === "needs_follow_up").length,
  }
}

/**
 * Get all requests for admin dashboard with full patient details
 */
export async function getAllRequestsForAdmin(): Promise<RequestWithPatient[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching all requests:", error)
    return []
  }

  return data as RequestWithPatient[]
}

/**
 * Create a document for a request (e.g., prescription, certificate).
 */
export async function createDocument(requestId: string, documentType: string, content: string): Promise<boolean> {
  // TODO: Implement when documents table is created
  console.log("createDocument called with:", requestId, documentType)
  return false
}

/**
 * Format a request category for display
 */
export function formatCategory(category: RequestCategory | string | null | undefined): string {
  if (!category) return "Unknown"

  const categoryMap: Record<string, string> = {
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    referral: "Referral",
    pathology: "Pathology",
  }

  return categoryMap[category] || category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format a request subtype for display
 */
export function formatSubtype(subtype: RequestSubtype | string | null | undefined): string {
  if (!subtype) return "General"

  const subtypeMap: Record<string, string> = {
    // Medical certificates
    work: "Work",
    university: "University/TAFE",
    carer: "Carer's Leave",
    // Prescriptions
    contraceptive: "Contraceptive Pill",
    uti: "UTI Treatment",
    cold_sore: "Cold Sore",
    reflux: "Reflux",
    erectile_dysfunction: "Erectile Dysfunction",
    premature_ejaculation: "Premature Ejaculation",
    hair_loss: "Hair Loss",
    acne: "Acne",
    // Referrals
    imaging: "Imaging",
    bloods: "Blood Tests",
    specialist: "Specialist",
  }

  return subtypeMap[subtype] || subtype.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format a request type for display (legacy support)
 */
export function formatRequestType(type: string | null | undefined): string {
  if (!type) return "Request"

  const typeMap: Record<string, string> = {
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    referral: "Referral",
    pathology: "Pathology Request",
  }

  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
