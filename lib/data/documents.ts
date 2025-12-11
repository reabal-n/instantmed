import { createClient } from "@/lib/supabase/server"
import type { DocumentDraft, GeneratedDocument, MedCertDraftData, PathologyDraftData } from "@/types/db"

/**
 * Get or create a medical certificate draft for a request.
 * If a draft already exists, returns it.
 * Otherwise, creates a new draft pre-filled with patient/request data.
 */
export async function getOrCreateMedCertDraftForRequest(requestId: string): Promise<DocumentDraft | null> {
  const supabase = await createClient()

  // Check if draft already exists
  const { data: existingDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("request_id", requestId)
    .eq("type", "med_cert")
    .maybeSingle()

  if (fetchError) {
    console.error("Error fetching draft:", fetchError)
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
    console.error("Error fetching request:", requestError)
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
    console.error("Error creating draft:", insertError)
    return null
  }

  console.log(`[v0] Created new draft for request ${requestId} with subtype: ${subtype}`)

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
    console.error("Error fetching current draft:", fetchError)
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
    console.error("Error updating draft:", updateError)
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
    console.error("Error fetching document:", error)
    return null
  }

  return data as GeneratedDocument | null
}

/**
 * Create a new generated document record
 */
export async function createGeneratedDocument(
  requestId: string,
  type: string,
  subtype: string,
  pdfUrl: string,
): Promise<GeneratedDocument | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("documents")
    .insert({
      request_id: requestId,
      type,
      subtype,
      pdf_url: pdfUrl,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating document:", error)
    return null
  }

  return data as GeneratedDocument
}

/**
 * Get draft by ID
 */
export async function getDraftById(draftId: string): Promise<DocumentDraft | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("document_drafts").select("*").eq("id", draftId).single()

  if (error) {
    console.error("Error fetching draft:", error)
    return null
  }

  return data as DocumentDraft
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
 */
export async function getOrCreatePathologyDraftForRequest(requestId: string): Promise<DocumentDraft | null> {
  const supabase = await createClient()

  // Check if draft already exists
  const { data: existingDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("request_id", requestId)
    .eq("type", "referral")
    .maybeSingle()

  if (fetchError) {
    console.error("Error fetching pathology draft:", fetchError)
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
    console.error("Error fetching request for pathology draft:", requestError)
    return null
  }

  // Verify this is a pathology-imaging referral
  if (request.category !== "referral" || request.subtype !== "pathology-imaging") {
    console.error(
      `Request ${requestId} is not a pathology referral. Category: ${request.category}, Subtype: ${request.subtype}`,
    )
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
    console.error("Error creating pathology draft:", insertError)
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
    console.error("Error fetching current pathology draft:", fetchError)
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
    console.error("Error updating pathology draft:", updateError)
    return null
  }

  console.log(`[v0] Updated pathology draft ${draftId}, subtype: ${updatedDraft.subtype}`)

  return updatedDraft as DocumentDraft
}
