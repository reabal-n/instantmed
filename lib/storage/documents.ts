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
 */
function getPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL")
  }
  
  // Public bucket URL format
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`
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
 * @param documentType - The type of document (med_cert, referral, etc.)
 * @param subtype - The subtype (work, uni, carer, etc.)
 * @returns The permanent Supabase Storage URL
 */
export async function uploadPdfBuffer(
  pdfBuffer: Buffer,
  requestId: string,
  documentType: string,
  subtype: string
): Promise<UploadDocumentResult> {
  console.log("[DocumentStorage] Uploading PDF buffer:", {
    requestId,
    documentType,
    subtype,
    size: pdfBuffer.length,
    sizeKB: Math.round(pdfBuffer.length / 1024),
  })

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
      console.error("[DocumentStorage] Buffer is not a valid PDF")
      return { success: false, error: "Buffer is not a valid PDF" }
    }

    const storagePath = generateStoragePath(requestId, documentType, subtype)
    const supabase = getStorageClient()

    console.log("[DocumentStorage] Uploading to Supabase Storage:", { storagePath })

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000",
        upsert: false,
      })

    if (uploadError) {
      console.error("[DocumentStorage] Upload failed:", uploadError)
      
      if (uploadError.message?.includes("already exists")) {
        // Retry with new timestamp
        const retryPath = generateStoragePath(requestId, documentType, subtype)
        const { error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(retryPath, pdfBuffer, {
            contentType: "application/pdf",
            cacheControl: "public, max-age=31536000",
            upsert: false,
          })

        if (retryError) {
          return { success: false, error: `Upload failed: ${retryError.message}` }
        }

        const permanentUrl = getPublicUrl(retryPath)
        return { success: true, permanentUrl, storagePath: retryPath }
      }

      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    const permanentUrl = getPublicUrl(storagePath)

    console.log("[DocumentStorage] Upload successful:", {
      storagePath,
      permanentUrl,
      sizeKB: Math.round(pdfBuffer.length / 1024),
    })

    return { success: true, permanentUrl, storagePath }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[DocumentStorage] Unexpected error:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Download a PDF from a URL and upload to permanent Supabase Storage.
 * @deprecated Use uploadPdfBuffer instead for new code
 */
export async function uploadDocumentFromUrl(
  temporaryUrl: string,
  requestId: string,
  documentType: string,
  subtype: string
): Promise<UploadDocumentResult> {
  console.log("[DocumentStorage] Starting upload:", {
    requestId,
    documentType,
    subtype,
    sourceUrl: temporaryUrl.substring(0, 50) + "...",
  })

  try {
    // Step 1: Validate inputs
    if (!temporaryUrl || !temporaryUrl.startsWith("http")) {
      return { success: false, error: "Invalid source URL" }
    }

    if (!requestId) {
      return { success: false, error: "Missing request ID" }
    }

    // Step 2: Download the PDF from the temporary URL
    console.log("[DocumentStorage] Downloading PDF from temporary URL...")
    
    const downloadResponse = await fetch(temporaryUrl, {
      method: "GET",
      headers: {
        "Accept": "application/pdf",
      },
    })

    if (!downloadResponse.ok) {
      console.error("[DocumentStorage] Failed to download PDF:", {
        status: downloadResponse.status,
        statusText: downloadResponse.statusText,
      })
      return { 
        success: false, 
        error: `Failed to download PDF: ${downloadResponse.status} ${downloadResponse.statusText}` 
      }
    }

    // Step 3: Get the PDF as a buffer
    const pdfBuffer = await downloadResponse.arrayBuffer()
    const pdfSize = pdfBuffer.byteLength

    console.log("[DocumentStorage] Downloaded PDF:", { 
      size: pdfSize,
      sizeKB: Math.round(pdfSize / 1024),
    })

    // Validate PDF size (max 5MB as per bucket config)
    if (pdfSize > 5 * 1024 * 1024) {
      return { success: false, error: "PDF exceeds maximum size of 5MB" }
    }

    // Validate it's actually a PDF (check magic bytes)
    const uint8Array = new Uint8Array(pdfBuffer)
    const pdfMagic = String.fromCharCode(...uint8Array.slice(0, 5))
    if (pdfMagic !== "%PDF-") {
      console.error("[DocumentStorage] Downloaded file is not a valid PDF")
      return { success: false, error: "Downloaded file is not a valid PDF" }
    }

    // Step 4: Upload to Supabase Storage
    const storagePath = generateStoragePath(requestId, documentType, subtype)
    const supabase = getStorageClient()

    console.log("[DocumentStorage] Uploading to Supabase Storage:", { storagePath })

    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000", // Cache for 1 year (immutable)
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error("[DocumentStorage] Upload failed:", uploadError)
      
      // Check if it's a duplicate (file already exists)
      if (uploadError.message?.includes("already exists")) {
        // Generate a new path with different timestamp and retry
        const retryPath = generateStoragePath(requestId, documentType, subtype)
        
        const { data: retryData, error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(retryPath, pdfBuffer, {
            contentType: "application/pdf",
            cacheControl: "public, max-age=31536000",
            upsert: false,
          })

        if (retryError) {
          return { success: false, error: `Upload failed: ${retryError.message}` }
        }

        const permanentUrl = getPublicUrl(retryPath)
        console.log("[DocumentStorage] Retry upload successful:", { 
          storagePath: retryPath, 
          permanentUrl 
        })

        return { success: true, permanentUrl, storagePath: retryPath }
      }

      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Step 5: Generate the permanent public URL
    const permanentUrl = getPublicUrl(storagePath)

    console.log("[DocumentStorage] Upload successful:", {
      storagePath,
      permanentUrl,
      sizeKB: Math.round(pdfSize / 1024),
    })

    return { success: true, permanentUrl, storagePath }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[DocumentStorage] Unexpected error:", errorMessage)
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
      console.error("[DocumentStorage] Error checking existence:", error)
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

  } catch (error) {
    console.error("[DocumentStorage] Error in documentExistsInStorage:", error)
    return false
  }
}

/**
 * List all documents for a request.
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
      console.error("[DocumentStorage] Error listing documents:", error)
      return []
    }

    return data.map(file => ({
      name: file.name,
      url: getPublicUrl(`${requestId}/${file.name}`),
      createdAt: file.created_at || new Date().toISOString(),
    }))

  } catch (error) {
    console.error("[DocumentStorage] Error in listDocumentsForRequest:", error)
    return []
  }
}

/**
 * Verify a URL is a permanent Supabase Storage URL (not temporary external)
 */
export function isPermanentStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  
  // Check if URL starts with our Supabase storage URL
  return url.startsWith(`${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`)
}

/**
 * Extract request ID from a storage URL
 */
export function extractRequestIdFromUrl(url: string): string | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  
  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`
  if (!url.startsWith(prefix)) return null
  
  const path = url.substring(prefix.length)
  const parts = path.split("/")
  return parts[0] || null
}
