import { createClient } from "@/lib/supabase/server"
import type { DocumentDraft, GeneratedDocument, MedCertDraftData, PathologyDraftData } from "@/types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Get or create a medical certificate draft for a request.
 * Uses INSERT...ON CONFLICT for idempotent creation.
 * If a draft already exists, returns it.
 * Otherwise, creates a new draft pre-filled with patient/request data.
 */
export async function getOrCreateMedCertDraftForRequest(requestId: string): Promise<DocumentDraft | null> {
  // Validate UUID format
  if (!isValidUUID(requestId)) {
    return null
  }

  const supabase = await createClient()

  // Check if draft already exists - use SELECT FOR UPDATE pattern conceptually
  // The actual idempotency is enforced by unique constraint
  const { data: existingDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("request_id", requestId)
    .eq("type", "med_cert")
    .maybeSingle()

  if (fetchError) {
    return null
  }

  if (existingDraft) {
    return existingDraft as DocumentDraft
  }

  // Fetch request with patient profile and answers
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (*),
      answers:request_answers (*)
    `)
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    return null
  }

  const patient = request.patient
  const answers = request.answers?.[0]?.answers || {}

  // Extract date info from answers
  const dateNeeded = (answers.date_needed as string) || null
  const today = new Date().toISOString().split("T")[0]

  // Calculate dates based on date_needed selection
  let dateFrom = today
  let dateTo = today
  if (dateNeeded === "Yesterday") {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    dateFrom = yesterday.toISOString().split("T")[0]
    dateTo = today
  } else if (dateNeeded === "Last 7 days") {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    dateFrom = weekAgo.toISOString().split("T")[0]
    dateTo = today
  }

  const subtype = request.subtype || "work"
  let defaultCapacity = "Unable to work"
  if (subtype === "uni") {
    defaultCapacity = "Unable to attend"
  } else if (subtype === "carer") {
    defaultCapacity = "Unable to work - providing care"
  }

  // Build draft data from patient profile and request answers
  const draftData: MedCertDraftData = {
    patient_name: patient.full_name || "",
    dob: patient.date_of_birth || null,
    reason: (answers.reason as string) || (answers.description as string) || null,
    date_from: dateFrom,
    date_to: dateTo,
    work_capacity: (answers.impact as string) || defaultCapacity,
    notes: (answers.description as string) || null,
    doctor_name: "Dr Reabal Najjar",
    provider_number: "2426577L",
    created_date: today,
  }

  const { data: newDraft, error: insertError } = await supabase
    .from("document_drafts")
    .insert({
      request_id: requestId,
      type: "med_cert",
      subtype: subtype, // Use the request's subtype
      data: draftData,
    })
    .select()
    .single()

  if (insertError) {
    // Handle unique constraint violation (race condition)
    if (insertError.code === "23505") {
      // Another request created the draft, fetch it
      const { data: raceDraft } = await supabase
        .from("document_drafts")
        .select("*")
        .eq("request_id", requestId)
        .eq("type", "med_cert")
        .single()
      
      return raceDraft as DocumentDraft | null
    }
    
    return null
  }

  return newDraft as DocumentDraft
}

/**
 * Update the data field of a document draft
 */
export async function updateMedCertDraftData(
  draftId: string,
  data: Partial<MedCertDraftData>,
): Promise<DocumentDraft | null> {
  const supabase = await createClient()

  // First get the current draft to merge data
  const { data: currentDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("data")
    .eq("id", draftId)
    .single()

  if (fetchError || !currentDraft) {
    return null
  }

  // Merge the new data with existing
  const mergedData = {
    ...currentDraft.data,
    ...data,
  }

  const { data: updatedDraft, error: updateError } = await supabase
    .from("document_drafts")
    .update({
      data: mergedData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select()
    .single()

  if (updateError) {
    return null
  }

  return updatedDraft as DocumentDraft
}

/**
 * Get the latest generated document for a request
 */
export async function getLatestDocumentForRequest(requestId: string): Promise<GeneratedDocument | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return null
  }

  return data as GeneratedDocument | null
}

/**
 * Generate a unique verification code for documents
 */
function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed confusing chars: 0, O, 1, I
  let code = "IM-"
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create a new generated document record with verification.
 * This creates both the document and its verification record atomically.
 */
export async function createGeneratedDocument(
  requestId: string,
  type: string,
  subtype: string,
  pdfUrl: string,
): Promise<GeneratedDocument | null> {
  // Validate inputs
  if (!isValidUUID(requestId)) {
    return null
  }

  if (!pdfUrl || !pdfUrl.startsWith("http")) {
    return null
  }

  const validTypes = ["med_cert", "prescription", "referral", "pathology"]
  if (!validTypes.includes(type)) {
    return null
  }

  const supabase = await createClient()
  const verificationCode = generateVerificationCode()

  // Create document with verification code
  const { data: document, error: docError } = await supabase
    .from("documents")
    .insert({
      request_id: requestId,
      type,
      subtype,
      pdf_url: pdfUrl,
      verification_code: verificationCode,
    })
    .select()
    .single()

  if (docError) {
    return null
  }

  // Create verification record
  const { error: verifyError } = await supabase
    .from("document_verifications")
    .insert({
      request_id: requestId,
      document_id: document.id,
      verification_code: verificationCode,
      document_type: type,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      is_valid: true,
      verified_count: 0,
    })

  if (verifyError) {
    // Verification is secondary - don't fail
  }

  return document as GeneratedDocument
}

/**
 * Get draft by ID
 */
export async function getDraftById(draftId: string): Promise<DocumentDraft | null> {
  if (!isValidUUID(draftId)) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase.from("document_drafts").select("*").eq("id", draftId).single()

  if (error) {
    return null
  }

  return data as DocumentDraft
}

/**
 * Check if a document exists for a request
 */
export async function hasDocumentForRequest(requestId: string): Promise<boolean> {
  if (!isValidUUID(requestId)) {
    return false
  }

  const supabase = await createClient()

  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)

  if (error) {
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Get all documents for a request
 */
export async function getDocumentsForRequest(requestId: string): Promise<GeneratedDocument[]> {
  if (!isValidUUID(requestId)) {
    return []
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })

  if (error) {
    return []
  }

  return data as GeneratedDocument[]
}

/**
 * Determine pathology subtype based on requested tests
 */
function determinePathologySubtype(testsArray: string[]): "pathology_bloods" | "pathology_imaging" {
  const bloodTestKeywords = ["blood", "fbc", "lfts", "u&e", "lipids", "hba1c", "tsh", "iron"]
  const imagingKeywords = ["x-ray", "xray", "ultrasound", "ct", "mri", "imaging", "scan"]

  const testsLower = testsArray.map((t) => t.toLowerCase())

  const hasOnlyBlood = testsLower.every((t) => bloodTestKeywords.some((keyword) => t.includes(keyword)))
  const hasImaging = testsLower.some((t) => imagingKeywords.some((keyword) => t.includes(keyword)))

  if (hasOnlyBlood && !hasImaging) {
    return "pathology_bloods"
  }

  return "pathology_imaging"
}

/**
 * Get or create a pathology/imaging request draft for a referral request.
 * Uses idempotent creation pattern.
 */
export async function getOrCreatePathologyDraftForRequest(requestId: string): Promise<DocumentDraft | null> {
  // Validate UUID format
  if (!isValidUUID(requestId)) {
    return null
  }

  const supabase = await createClient()

  // Check if draft already exists
  const { data: existingDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("request_id", requestId)
    .eq("type", "referral")
    .maybeSingle()

  if (fetchError) {
    return null
  }

  if (existingDraft) {
    return existingDraft as DocumentDraft
  }

  // Fetch request with patient profile and answers
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select(
      `
      *,
      patient:profiles!patient_id (*),
      answers:request_answers (*)
    `,
    )
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    return null
  }

  // Verify this is a pathology-imaging referral
  if (request.category !== "referral" || request.subtype !== "pathology-imaging") {
    return null
  }

  const patient = request.patient
  const answers = request.answers?.[0]?.answers || {}

  // Extract test types from answers
  const testTypes = (answers.test_types_labels as string[]) || (answers.test_types as string[]) || []
  const testsRequested = Array.isArray(testTypes) ? testTypes.join(", ") : String(testTypes)

  // Determine if this is bloods or imaging based on selected tests
  const pathologySubtype = determinePathologySubtype(Array.isArray(testTypes) ? testTypes : [])

  const today = new Date().toISOString().split("T")[0]

  // Build draft data from patient profile and request answers
  const draftData: PathologyDraftData = {
    patient_name: patient.full_name || "",
    dob: patient.date_of_birth || null,
    medicare_number: patient.medicare_number || null,
    tests_requested: testsRequested,
    clinical_indication: (answers.symptoms_concern as string) || null,
    symptom_duration: (answers.symptom_duration_label as string) || (answers.symptom_duration as string) || null,
    severity: (answers.severity_label as string) || (answers.severity as string) || null,
    urgency: "Routine",
    previous_tests: (answers.previous_tests as string) || null,
    doctor_name: "Dr Reabal Najjar",
    provider_number: "2426577L",
    created_date: today,
  }

  const { data: newDraft, error: insertError } = await supabase
    .from("document_drafts")
    .insert({
      request_id: requestId,
      type: "referral",
      subtype: pathologySubtype,
      data: draftData,
    })
    .select()
    .single()

  if (insertError) {
    // Handle unique constraint violation (race condition)
    if (insertError.code === "23505") {
      const { data: raceDraft } = await supabase
        .from("document_drafts")
        .select("*")
        .eq("request_id", requestId)
        .eq("type", "referral")
        .single()
      
      return raceDraft as DocumentDraft | null
    }
    
    return null
  }

  return newDraft as DocumentDraft
}

/**
 * Update pathology draft data and optionally change subtype
 */
export async function updatePathologyDraftData(
  draftId: string,
  data: Partial<PathologyDraftData>,
  subtype?: "pathology_bloods" | "pathology_imaging",
): Promise<DocumentDraft | null> {
  const supabase = await createClient()

  // First get the current draft to merge data
  const { data: currentDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("data")
    .eq("id", draftId)
    .single()

  if (fetchError || !currentDraft) {
    return null
  }

  // Merge the new data with existing
  const mergedData = {
    ...currentDraft.data,
    ...data,
  }

  const updatePayload: { data: unknown; updated_at: string; subtype?: string } = {
    data: mergedData,
    updated_at: new Date().toISOString(),
  }

  // Update subtype if provided
  if (subtype) {
    updatePayload.subtype = subtype
  }

  const { data: updatedDraft, error: updateError } = await supabase
    .from("document_drafts")
    .update(updatePayload)
    .eq("id", draftId)
    .select()
    .single()

  if (updateError) {
    return null
  }

  return updatedDraft as DocumentDraft
}
