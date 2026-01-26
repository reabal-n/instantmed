import "server-only"
import { createClient } from "@supabase/supabase-js"

const BUCKET_NAME = "documents"

/**
 * Get a service role client for storage operations.
 * This bypasses RLS for server-side document uploads.
 */
function getStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY - required for document storage")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Generate a storage path for a document.
 * Format: {request_id}/{type}_{subtype}_{timestamp}.pdf
 */
function generateStoragePath(
  requestId: string,
  documentType: string,
  subtype: string
): string {
  const timestamp = Date.now()
  const safeName = `${documentType}_${subtype}_${timestamp}.pdf`
  return `${requestId}/${safeName}`
}

/**
 * Get the public URL for a document in storage.
 * @deprecated Use getSignedUrl for secure access - this function is kept only for URL validation
 */
function _getPublicUrlBase(): string {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL")
  }
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`
}

/**
 * P1 FIX: Generate a signed URL for secure document access
 * Signed URLs expire after the specified duration (default 24 hours)
 * 
 * PHI EXPOSURE REDUCTION: Reduced from 7 days to 24 hours to minimize
 * window of exposure if URL is leaked. Patients can always generate
 * a fresh URL from their dashboard.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 24 * 60 * 60 // 24 hours default (reduced from 7 days)
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = getStorageClient()
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds)

    if (error || !data?.signedUrl) {
      return { success: false, error: error?.message || "Failed to create signed URL" }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

export interface UploadDocumentResult {
  success: boolean
  permanentUrl?: string
  storagePath?: string
  error?: string
}

/**
 * Upload a PDF buffer directly to Supabase Storage.
 * 
 * @param pdfBuffer - The PDF as a Buffer
 * @param requestId - The request ID to organize the document under
 * @param documentType - The type of document (med_cert, pathology, etc.)
 * @param subtype - The subtype (work, uni, carer, etc.)
 * @returns The permanent Supabase Storage URL
 */
export async function uploadPdfBuffer(
  pdfBuffer: Buffer,
  requestId: string,
  documentType: string,
  subtype: string
): Promise<UploadDocumentResult> {
  try {
    if (!requestId) {
      return { success: false, error: "Missing request ID" }
    }

    // Validate PDF size (max 5MB)
    if (pdfBuffer.length > 5 * 1024 * 1024) {
      return { success: false, error: "PDF exceeds maximum size of 5MB" }
    }

    // Validate it's actually a PDF (check magic bytes)
    const pdfMagic = pdfBuffer.slice(0, 5).toString()
    if (pdfMagic !== "%PDF-") {
      return { success: false, error: "Buffer is not a valid PDF" }
    }

    const storagePath = generateStoragePath(requestId, documentType, subtype)
    const supabase = getStorageClient()

    // P1 FIX: Use private cache-control for access-controlled documents
    // Documents are served via signed URLs, so shouldn't be cached publicly
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "private, max-age=3600",
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message?.includes("already exists")) {
        // Retry with new timestamp
        const retryPath = generateStoragePath(requestId, documentType, subtype)
        const { error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(retryPath, pdfBuffer, {
            contentType: "application/pdf",
            cacheControl: "private, max-age=3600",
            upsert: false,
          })

        if (retryError) {
          return { success: false, error: `Upload failed: ${retryError.message}` }
        }

        // Use signed URL for secure access
        const signedResult = await getSignedUrl(retryPath)
        if (!signedResult.success) {
          return { success: false, error: `Upload succeeded but signed URL failed: ${signedResult.error}` }
        }
        return { success: true, permanentUrl: signedResult.url!, storagePath: retryPath }
      }

      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Use signed URL for secure access - never fall back to public URL
    const signedResult = await getSignedUrl(storagePath)
    if (!signedResult.success) {
      return { success: false, error: `Upload succeeded but signed URL failed: ${signedResult.error}` }
    }
    return { success: true, permanentUrl: signedResult.url!, storagePath }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}


/**
 * Check if a document exists in storage for a given request.
 */
export async function documentExistsInStorage(
  requestId: string,
  documentType?: string
): Promise<boolean> {
  try {
    const supabase = getStorageClient()
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(requestId)

    if (error) {
      return false
    }

    if (!data || data.length === 0) {
      return false
    }

    // If documentType specified, check for matching files
    if (documentType) {
      return data.some(file => file.name.startsWith(`${documentType}_`))
    }

    return true

  } catch {
    return false
  }
}

/**
 * List all documents for a request with secure signed URLs.
 */
export async function listDocumentsForRequest(
  requestId: string
): Promise<{ name: string; url: string; createdAt: string }[]> {
  try {
    const supabase = getStorageClient()
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(requestId, {
        sortBy: { column: "created_at", order: "desc" },
      })

    if (error || !data) {
      return []
    }

    // Generate signed URLs for each document
    const documentsWithSignedUrls = await Promise.all(
      data.map(async (file) => {
        const storagePath = `${requestId}/${file.name}`
        const signedResult = await getSignedUrl(storagePath)
        return {
          name: file.name,
          url: signedResult.success ? signedResult.url! : "", // Empty URL if signing fails
          createdAt: file.created_at || new Date().toISOString(),
        }
      })
    )

    // Filter out documents where signing failed
    return documentsWithSignedUrls.filter(doc => doc.url !== "")

  } catch {
    return []
  }
}

/**
 * Verify a URL is a permanent Supabase Storage URL (not temporary external)
 */
export function isPermanentStorageUrl(url: string): boolean {
  try {
    const baseUrl = _getPublicUrlBase()
    return url.startsWith(baseUrl)
  } catch {
    return false
  }
}

/**
 * Extract request ID from a storage URL
 */
export function extractRequestIdFromUrl(url: string): string | null {
  try {
    const prefix = _getPublicUrlBase()
    if (!url.startsWith(prefix)) return null
    
    const path = url.substring(prefix.length)
    const parts = path.split("/")
    return parts[0] || null
  } catch {
    return null
  }
}
