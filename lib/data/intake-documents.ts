import { createClient } from "@/lib/supabase/server"
import type { IntakeDocument } from "@/types/db"

/**
 * Get the latest document for an intake from the intake_documents table.
 * This is used for the new PDF storage system (P0 fix).
 */
export async function getIntakeDocument(
  intakeId: string,
  documentType?: string
): Promise<IntakeDocument | null> {
  const supabase = await createClient()

  let query = supabase
    .from("intake_documents")
    .select("*")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (documentType) {
    query = query.eq("document_type", documentType)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return null
  }

  return data as IntakeDocument
}

/**
 * Get all documents for an intake.
 */
export async function getIntakeDocuments(intakeId: string): Promise<IntakeDocument[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("intake_documents")
    .select("*")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data as IntakeDocument[]
}

/**
 * Get the public URL for a document stored in Supabase Storage.
 */
export function getDocumentPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }
  return `${supabaseUrl}/storage/v1/object/public/documents/${storagePath}`
}
