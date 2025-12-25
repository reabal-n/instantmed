"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { sendMedCertReadyEmail } from "@/lib/email/resend"
import { logger } from "@/lib/logger"

const RESEND_LIMIT = 3 // Max resends per 24 hours
const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

interface ResendResult {
  success: boolean
  error?: string
  remainingResends?: number
  lastSentAt?: string
}

/**
 * Resend the medical certificate email to the patient.
 * Rate limited to 3 resends per 24 hours per certificate.
 */
export async function resendCertificateEmailAction(requestId: string): Promise<ResendResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return { success: false, error: "Profile not found" }
    }

    // Get the request and verify ownership
    const { data: request } = await supabase
      .from("requests")
      .select(`
        id,
        status,
        patient_id,
        category,
        subtype,
        patient:profiles!patient_id (
          id,
          full_name
        )
      `)
      .eq("id", requestId)
      .single()

    if (!request) {
      return { success: false, error: "Request not found" }
    }

    // Verify the user owns this request
    if (request.patient_id !== profile.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Verify request is approved
    if (request.status !== "approved") {
      return { success: false, error: "Certificate not yet approved" }
    }

    // Get the document
    const { data: document } = await supabase
      .from("documents")
      .select("id, pdf_url, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!document || !document.pdf_url) {
      return { success: false, error: "Certificate document not found" }
    }

    // Check rate limit - get recent email sends for this document
    const windowStart = new Date(Date.now() - RESEND_WINDOW_MS).toISOString()
    
    const { data: recentSends, count } = await supabase
      .from("email_logs")
      .select("id, created_at", { count: "exact" })
      .eq("request_id", requestId)
      .eq("template_type", "request_approved")
      .gte("created_at", windowStart)

    const sendCount = count || 0

    if (sendCount >= RESEND_LIMIT) {
      const oldestSend = recentSends?.[0]?.created_at
      const resetTime = oldestSend 
        ? new Date(new Date(oldestSend).getTime() + RESEND_WINDOW_MS)
        : new Date(Date.now() + RESEND_WINDOW_MS)
      
      return { 
        success: false, 
        error: `Rate limit reached. You can resend again after ${resetTime.toLocaleTimeString()}.`,
        remainingResends: 0,
      }
    }

    // Send the email
    const patientData = request.patient as unknown as { id: string; full_name: string } | null
    const result = await sendMedCertReadyEmail({
      to: user.email!,
      patientName: patientData?.full_name || "there",
      pdfUrl: document.pdf_url,
      requestId,
      certType: request.subtype || "work",
    })

    if (!result.success) {
      return { success: false, error: result.error || "Failed to send email" }
    }

    // Log the email send
    await supabase.from("email_logs").insert({
      request_id: requestId,
      recipient_email: user.email,
      template_type: "request_approved",
      subject: "Your Medical Certificate (Resent)",
      metadata: { resend: true, documentId: document.id },
    })

    // Revalidate the patient request page
    revalidatePath(`/patient/requests/${requestId}`)

    return { 
      success: true, 
      remainingResends: RESEND_LIMIT - sendCount - 1,
      lastSentAt: new Date().toISOString(),
    }

  } catch (error) {
    logger.error("[resendCertificateEmailAction] Error: " + String(error), { error })
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Get the resend status for a certificate (remaining resends, last sent time)
 */
export async function getResendStatusAction(requestId: string): Promise<{
  canResend: boolean
  remainingResends: number
  lastSentAt?: string
}> {
  try {
    const supabase = await createClient()

    const windowStart = new Date(Date.now() - RESEND_WINDOW_MS).toISOString()
    
    const { data: recentSends, count } = await supabase
      .from("email_logs")
      .select("id, created_at", { count: "exact" })
      .eq("request_id", requestId)
      .eq("template_type", "request_approved")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })

    const sendCount = count || 0
    const lastSent = recentSends?.[0]?.created_at

    return {
      canResend: sendCount < RESEND_LIMIT,
      remainingResends: Math.max(0, RESEND_LIMIT - sendCount),
      lastSentAt: lastSent,
    }
  } catch (error) {
    logger.error("[getResendStatusAction] Error: " + String(error), { error })
    return { canResend: false, remainingResends: 0 }
  }
}
