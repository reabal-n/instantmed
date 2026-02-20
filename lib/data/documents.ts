import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { DocumentDraft, GeneratedDocument, MedCertDraftData } from "@/types/db"

/**
 * Get today's date in AEST (YYYY-MM-DD).
 * Avoids UTC date which can be wrong for Australian medical certificates.
 */
function todayAEST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Update the data field of a document draft
 */
export async function updateMedCertDraftData(
  draftId: string,
  data: Partial<MedCertDraftData>,
): Promise<DocumentDraft | null> {
  const supabase = createServiceRoleClient()

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
    .select("id, intake_id, type, subtype, data, created_at, updated_at")
    .single()

  if (updateError) {
    return null
  }

  return updatedDraft as DocumentDraft
}

/**
 * Get draft by ID
 */
export async function getDraftById(draftId: string): Promise<DocumentDraft | null> {
  if (!isValidUUID(draftId)) {
    return null
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.from("document_drafts").select("id, intake_id, type, subtype, data, created_at, updated_at").eq("id", draftId).single()

  if (error) {
    return null
  }

  return data as DocumentDraft
}

/**
 * Get or create a medical certificate draft for an intake.
 * Uses intakes table instead of requests.
 *
 * BRIDGE: When creating a new draft, checks for an AI-generated med_cert draft
 * (stored in `content` column via `intake_id`) and seeds document builder fields
 * from the AI's output (dates, symptom summary, clinical notes, flags).
 */
export async function getOrCreateMedCertDraftForIntake(intakeId: string): Promise<DocumentDraft | null> {
  if (!isValidUUID(intakeId)) {
    return null
  }

  const supabase = createServiceRoleClient()

  // Check if a document-builder draft already exists.
  // IMPORTANT: Exclude AI-generated drafts (is_ai_generated=true) which use the
  // `content` column. The document builder uses the `data` column. Mixing them up
  // causes the "missing date information" error on approve.
  const { data: existingDraft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("id, intake_id, type, subtype, data, created_at, updated_at")
    .eq("intake_id", intakeId)
    .eq("type", "med_cert")
    .or("is_ai_generated.is.null,is_ai_generated.eq.false")
    .maybeSingle()

  if (fetchError) {
    return null
  }

  if (existingDraft) {
    return existingDraft as DocumentDraft
  }

  // Fetch intake with patient profile and answers
  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      id, patient_id, service_id, status, category, subtype, created_at, updated_at,
      patient:profiles!patient_id (id, full_name, date_of_birth, email, phone),
      answers:intake_answers (id, answers)
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    return null
  }

  // Supabase returns join relations as arrays — unwrap to single object
  const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
  const answers = intake.answers?.[0]?.answers || {}

  // ─── AI DRAFT BRIDGE ────────────────────────────────────────
  // Check if the AI system has generated a med_cert draft for this intake.
  // AI drafts are stored with `intake_id` + `content` column, while the
  // document builder uses `intake_id` + `data` column. We bridge by
  // seeding the document builder draft with AI-generated intelligence.
  let aiDraftContent: Record<string, unknown> | null = null
  try {
    const { data: aiDraft } = await supabase
      .from("document_drafts")
      .select("content, status")
      .eq("intake_id", intakeId)
      .eq("type", "med_cert")
      .eq("is_ai_generated", true)
      .eq("status", "ready")
      .maybeSingle()

    if (aiDraft?.content) {
      aiDraftContent = aiDraft.content as Record<string, unknown>
    }
  } catch {
    // Non-blocking: if AI draft lookup fails, continue with standard defaults
  }

  // Extract date info from answers (baseline)
  // Intake answers may have: startDate/start_date (YYYY-MM-DD), duration (days count),
  // OR legacy date_needed ("Yesterday", "Last 7 days")
  const today = todayAEST()

  let dateFrom = today
  let dateTo = today

  // Prefer explicit startDate from answers (new intake flow)
  const answerStartDate = (answers.startDate as string) || (answers.start_date as string) || null
  const answerDuration = parseInt((answers.duration as string) || "1", 10) || 1

  if (answerStartDate) {
    dateFrom = answerStartDate
    // Compute endDate from startDate + duration
    const start = new Date(answerStartDate)
    start.setDate(start.getDate() + answerDuration - 1) // duration includes start day
    dateTo = start.toISOString().split("T")[0]
  } else {
    // Legacy: check date_needed field
    const dateNeeded = (answers.date_needed as string) || null
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
  }

  // If AI draft has dates, prefer them (AI extracts from intake answers more intelligently)
  if (aiDraftContent?.startDate && typeof aiDraftContent.startDate === "string") {
    dateFrom = aiDraftContent.startDate
  }
  if (aiDraftContent?.endDate && typeof aiDraftContent.endDate === "string") {
    dateTo = aiDraftContent.endDate
  }

  // Determine subtype from service or answers
  const certType = (answers.cert_type as string) ||
    (aiDraftContent?.certificateType as string) || "work"
  let defaultCapacity = "Unable to work"
  if (certType === "uni") {
    defaultCapacity = "Unable to attend classes or complete assessments"
  } else if (certType === "carer") {
    defaultCapacity = "Required to care for a family member"
  }

  // Use AI symptom summary as reason if available, otherwise leave for doctor
  const aiReason = aiDraftContent?.symptomsSummary as string | undefined
  // Use AI clinical notes as doctor notes if available
  const aiNotes = aiDraftContent?.clinicalNotes as string | undefined

  const initialData: MedCertDraftData = {
    patient_name: patient.full_name || "",
    dob: patient.date_of_birth || null,
    reason: aiReason || null,
    date_from: dateFrom,
    date_to: dateTo,
    work_capacity: defaultCapacity,
    notes: aiNotes || null,
    doctor_name: "",
    provider_number: "",
    created_date: today,
    certificate_type: certType as "work" | "uni" | "carer",
    // Store AI reason summary in the dedicated field too
    reason_summary: aiReason || null,
  }

  // Insert draft
  // NOTE: Production DB has request_id NOT NULL (legacy column from old requests table).
  // We bridge by setting request_id = intakeId. Also explicitly set is_ai_generated = false
  // since this is a document-builder draft, not an AI draft. The content and status columns
  // have NOT NULL defaults ('{}' and 'pending') so they auto-fill.
  const { data: newDraft, error: insertError } = await supabase
    .from("document_drafts")
    .insert({
      request_id: intakeId,  // Bridge: legacy NOT NULL column
      intake_id: intakeId,
      type: "med_cert",
      data: initialData,
      is_ai_generated: false,
    })
    .select("id, intake_id, type, subtype, data, created_at, updated_at")
    .single()

  if (insertError) {
    // Handle race condition - another process may have created the draft
    if (insertError.code === "23505") {
      const { data: raceDraft } = await supabase
        .from("document_drafts")
        .select("id, intake_id, type, subtype, data, created_at, updated_at")
        .eq("intake_id", intakeId)
        .eq("type", "med_cert")
        .single()
      return raceDraft as DocumentDraft | null
    }
    return null
  }

  return newDraft as DocumentDraft
}

/**
 * Fetch AI-generated drafts for an intake (clinical note + med cert).
 * Used by the document builder to display AI clinical intelligence alongside
 * the editable form. Returns null if no AI drafts exist.
 */
export async function getAIDraftsForIntake(intakeId: string): Promise<{
  clinicalNote: Record<string, unknown> | null
  medCert: Record<string, unknown> | null
  flags: { requiresReview: boolean; flagReason: string | null } | null
} | null> {
  if (!isValidUUID(intakeId)) {
    return null
  }

  const supabase = createServiceRoleClient()

  const { data: aiDrafts, error } = await supabase
    .from("document_drafts")
    .select("type, content, status")
    .eq("intake_id", intakeId)
    .eq("is_ai_generated", true)
    .eq("status", "ready")
    .in("type", ["clinical_note", "med_cert"])

  if (error || !aiDrafts || aiDrafts.length === 0) {
    return null
  }

  let clinicalNote: Record<string, unknown> | null = null
  let medCert: Record<string, unknown> | null = null
  let flags: { requiresReview: boolean; flagReason: string | null } | null = null

  for (const draft of aiDrafts) {
    const content = draft.content as Record<string, unknown>
    if (draft.type === "clinical_note") {
      clinicalNote = content
      // Clinical note flags
      const noteFlags = content?.flags as { requiresReview?: boolean; flagReason?: string | null } | undefined
      if (noteFlags?.requiresReview) {
        flags = { requiresReview: true, flagReason: noteFlags.flagReason || null }
      }
    } else if (draft.type === "med_cert") {
      medCert = content
      // Med cert flags (takes precedence over clinical note flags)
      const certFlags = content?.flags as { requiresReview?: boolean; flagReason?: string | null } | undefined
      if (certFlags?.requiresReview) {
        flags = { requiresReview: true, flagReason: certFlags.flagReason || null }
      }
    }
  }

  return { clinicalNote, medCert, flags }
}

/**
 * Get the latest generated document for an intake.
 * The documents table now only has `intake_id` (request_id was dropped).
 */
export async function getLatestDocumentForIntake(intakeId: string): Promise<GeneratedDocument | null> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from("documents")
    .select("id, intake_id, type, subtype, pdf_url, verification_code, created_at, updated_at")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as GeneratedDocument) || null
}

/**
 * Get med cert certificate for an intake from issued_certificates (canonical table).
 */
export async function getMedCertCertificateForIntake(intakeId: string): Promise<GeneratedDocument | null> {
  if (!isValidUUID(intakeId)) {
    return null
  }

  const supabase = createServiceRoleClient()

  const { data: certificate, error } = await supabase
    .from("issued_certificates")
    .select("id, certificate_type, storage_path, verification_code, created_at, updated_at")
    .eq("intake_id", intakeId)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !certificate) {
    return null
  }

  return {
    id: certificate.id,
    intake_id: intakeId,
    type: "med_cert",
    subtype: certificate.certificate_type,
    pdf_url: certificate.storage_path,
    verification_code: certificate.verification_code,
    created_at: certificate.created_at,
    updated_at: certificate.updated_at,
  } as GeneratedDocument
}
