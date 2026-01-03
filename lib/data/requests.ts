import "server-only"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import type {
  Request,
  RequestWithPatient,
  RequestWithDetails,
  RequestStatus,
  PaymentStatus,
  RequestInsert,
  RequestCategory,
  RequestSubtype,
} from "@/types/db"
import {
  validateStatusTransition,
  logTransitionAttempt,
  logTransitionSuccess,
  logTransitionFailure,
  RequestLifecycleError,
} from "./request-lifecycle"

/**
 * Fetch all requests for a given patient.
 * Returns requests sorted by created_at descending (newest first).
 * Optionally filter by status.
 */
export async function getPatientRequests(patientId: string, status?: RequestStatus): Promise<Request[]> {
  const supabase = await createClient()

  let query = supabase
    .from("requests")
    .select(`*`)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    logger.error("Error fetching patient requests", { error })
    return []
  }

  return data as unknown as Request[]
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
  awaiting_payment: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("requests").select("status, payment_status").eq("patient_id", patientId)

  if (error || !data) {
    logger.error("Error fetching request stats", { error })
    return { total: 0, pending: 0, approved: 0, declined: 0, needs_follow_up: 0, awaiting_payment: 0 }
  }

  const stats = {
    total: data.length,
    pending: data.filter((r) => r.status === "pending" && r.payment_status !== "pending_payment").length,
    approved: data.filter((r) => r.status === "approved").length,
    declined: data.filter((r) => r.status === "declined").length,
    needs_follow_up: data.filter((r) => r.status === "needs_follow_up").length,
    awaiting_payment: data.filter((r) => r.payment_status === "pending_payment").length,
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
    .select(`*`)
    .eq("id", requestId)
    .eq("patient_id", patientId)
    .single()

  if (error || !data) {
    logger.error("Error fetching request", { error })
    return null
  }

  return data as unknown as Request
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
    logger.error("Error fetching requests by status", { error })
    return []
  }

  // Filter out any requests where patient data couldn't be loaded (RLS issue)
  const validData = (data || []).filter((r) => r.patient !== null)
  if (validData.length !== data?.length) {
    logger.warn("Filtered out requests with null patient data", { filtered: (data?.length || 0) - validData.length })
  }

  return validData as unknown as RequestWithPatient[]
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
    logger.error("Error fetching requests awaiting payment", { error })
    return []
  }

  // Filter out any requests where patient data couldn't be loaded
  const validData = (data || []).filter((r) => r.patient !== null)
  return validData as unknown as RequestWithPatient[]
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
      patient:profiles!patient_id (
        id,
        auth_user_id,
        full_name,
        date_of_birth,
        email,
        phone,
        medicare_number,
        medicare_irn,
        medicare_expiry,
        address_line1,
        address_line2,
        suburb,
        state,
        postcode
      ),
      answers:request_answers (
        id,
        request_id,
        answers,
        created_at,
        updated_at
      )
    `)
    .eq("id", requestId)
    .single()

  if (error || !data) {
    logger.error("Error fetching request details", { error })
    return null
  }

  // Fetch the latest document for this request
  const { data: document } = await supabase
    .from("documents")
    .select("id, request_id, type, subtype, pdf_url, created_at, updated_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Supabase returns arrays for one-to-many, take first item or null
  return {
    ...data,
    answers: data.answers?.[0] || null,
    document: document || null,
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
    logger.error("Error creating request", { error: requestError })
    return null
  }

  const { error: answersError } = await supabase.from("request_answers").insert({
    request_id: createdRequest.id,
    answers,
  })

  if (answersError) {
    logger.error("Error creating request answers", { error: answersError })
  }

  return createdRequest as unknown as Request
}

/**
 * Update request status (for doctor actions).
 * Enforces strict lifecycle validation - will reject invalid transitions.
 * Optionally tracks the reviewing doctor for audit purposes.
 * 
 * @throws RequestLifecycleError if transition is invalid
 */
export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  reviewedBy?: string
): Promise<Request | null> {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(requestId)) {
    logger.error("[updateRequestStatus] Invalid requestId format", { requestId })
    return null
  }

  const supabase = await createClient()

  // STEP 1: Fetch current request state for lifecycle validation
  const { data: currentRequest, error: fetchError } = await supabase
    .from("requests")
    .select("status, payment_status")
    .eq("id", requestId)
    .single()

  if (fetchError || !currentRequest) {
    logger.error("[updateRequestStatus] Failed to fetch current state", { requestId, error: fetchError })
    return null
  }

  const currentStatus = currentRequest.status as RequestStatus
  const paymentStatus = currentRequest.payment_status as PaymentStatus

  // STEP 2: Log the transition attempt
  logTransitionAttempt(
    requestId,
    currentStatus,
    status,
    paymentStatus,
    reviewedBy || "unknown",
    reviewedBy ? "doctor" : "system"
  )

  // STEP 3: Validate the transition
  const validation = validateStatusTransition(currentStatus, status, paymentStatus)

  if (!validation.valid) {
    logTransitionFailure(requestId, currentStatus, status, validation.error || "Unknown error", reviewedBy || "unknown")
    
    throw new RequestLifecycleError(
      validation.error || "Invalid status transition",
      validation.code,
      {
        currentStatus,
        attemptedStatus: status,
        paymentStatus,
      }
    )
  }

  // STEP 4: Perform the update
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Add audit fields if doctor ID provided
  if (reviewedBy) {
    updateData.reviewed_by = reviewedBy
    updateData.reviewed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", requestId)
    .select()
    .single()

  if (error || !data) {
    logger.error("[updateRequestStatus] Database error", { requestId, status, error })
    return null
  }

  // STEP 5: Log success
  logTransitionSuccess(requestId, currentStatus, status, reviewedBy || "system")

  return data as unknown as Request
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
    logger.error("Error updating clinical note", { error })
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
    logger.error("Error updating script sent status", { error })
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
    logger.error("Error fetching dashboard stats", { error })
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
    logger.error("Error fetching all requests", { error })
    return []
  }

  // Filter out requests without patient data (RLS issue)
  const validData = (data || []).filter((r) => r.patient !== null)

  if (validData.length !== data?.length) {
    logger.warn("Filtered out requests with null patient data in admin view", {
      total: data?.length || 0,
      valid: validData.length,
      filtered: (data?.length || 0) - validData.length
    })
  }

  return validData as unknown as RequestWithPatient[]
}

/**
 * Create a document for a request (e.g., prescription, certificate).
 */
export async function createDocument(requestId: string, documentType: string, content: string): Promise<boolean> {
  // TODO: Implement when documents table is created
  logger.info("createDocument called", { requestId, documentType })
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
    // Pathology
    imaging: "Imaging",
    bloods: "Blood Tests",
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
    pathology: "Pathology Request",
  }

  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Save private doctor notes for a request
 */
export async function saveDoctorNotes(requestId: string, notes: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("requests")
    .update({
      doctor_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    logger.error("Error saving doctor notes:", { error })
    return false
  }

  return true
}

/**
 * Flag a request for follow-up
 */
export async function flagForFollowup(requestId: string, reason: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("requests")
    .update({
      flagged_for_followup: true,
      followup_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    logger.error("Error flagging for followup:", { error })
    return false
  }

  return true
}

/**
 * Escalate a request.
 * Enforces lifecycle - request must be paid and in pending status.
 */
export async function escalateRequest(
  requestId: string,
  level: "senior_review" | "phone_consult",
  reason: string,
  doctorId: string,
): Promise<boolean> {
  const supabase = await createClient()

  // Fetch current state for validation
  const { data: currentRequest, error: fetchError } = await supabase
    .from("requests")
    .select("status, payment_status")
    .eq("id", requestId)
    .single()

  if (fetchError || !currentRequest) {
    logger.error("[escalateRequest] Failed to fetch request", { requestId, error: fetchError })
    return false
  }

  const currentStatus = currentRequest.status as RequestStatus
  const paymentStatus = currentRequest.payment_status as PaymentStatus

  // Validate transition to needs_follow_up
  const validation = validateStatusTransition(currentStatus, "needs_follow_up", paymentStatus)

  if (!validation.valid) {
    logTransitionFailure(requestId, currentStatus, "needs_follow_up", validation.error || "Unknown error", doctorId)
    logger.warn("[escalateRequest] Invalid transition", { error: validation.error })
    return false
  }

  const { error } = await supabase
    .from("requests")
    .update({
      escalation_level: level,
      escalation_reason: reason,
      escalated_at: new Date().toISOString(),
      escalated_by: doctorId,
      status: "needs_follow_up",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    logger.error("[escalateRequest] Database error", { error })
    return false
  }

  logTransitionSuccess(requestId, currentStatus, "needs_follow_up", doctorId)
  return true
}

/**
 * Mark request as reviewed
 */
export async function markAsReviewed(requestId: string, doctorId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("requests")
    .update({
      reviewed_by: doctorId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    logger.error("Error marking as reviewed", { error })
    return false
  }

  return true
}
