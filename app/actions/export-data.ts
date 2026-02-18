"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { decryptIfNeeded } from "@/lib/security/encryption"
import { createLogger } from "@/lib/observability/logger"
import { sendViaResend } from "@/lib/email/resend"

const logger = createLogger("export-data")

interface ExportDataResult {
  success: boolean
  data?: PatientDataExport
  error?: string
}

interface PatientDataExport {
  exportedAt: string
  profile: {
    id: string
    email: string | null
    fullName: string
    phone: string | null
    dateOfBirth: string | null
    address: {
      line1: string | null
      suburb: string | null
      state: string | null
      postcode: string | null
    }
    medicare: {
      number: string | null
      irn: number | null
      expiry: string | null
    }
    createdAt: string
  }
  requests: Array<{
    id: string
    category: string | null
    subtype: string | null
    status: string
    createdAt: string
    updatedAt: string
    answers: Record<string, unknown>
  }>
  documents: Array<{
    id: string
    type: string | null
    createdAt: string
    intakeId: string | null
  }>
  notifications: Array<{
    id: string
    type: string
    title: string
    message: string | null
    createdAt: string
    read: boolean
  }>
}

/**
 * Export all patient data for GDPR compliance (Article 20 - Right to data portability)
 * Returns a JSON object containing all personal data associated with the patient
 */
export async function exportPatientData(): Promise<ExportDataResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    
    if (!authUser) {
      return { success: false, error: "Please sign in to export your data" }
    }

    const profile = authUser.profile
    const supabase = createServiceRoleClient()

    // Fetch all intakes for this patient
    const { data: intakes, error: intakesError } = await supabase
      .from("intakes")
      .select("id, category, subtype, status, created_at, updated_at, intake_answers:intake_answers(answers)")
      .eq("patient_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10000)

    if (intakesError) {
      logger.error("Failed to fetch intakes for export", { error: intakesError.message })
    }

    // Fetch all certificates for this patient from issued_certificates
    const { data: documents, error: documentsError } = await supabase
      .from("issued_certificates")
      .select("id, certificate_type, created_at, intake_id")
      .eq("patient_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10000)

    if (documentsError) {
      logger.error("Failed to fetch certificates for export", { error: documentsError.message })
    }

    // Fetch all notifications for this patient
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("id, type, title, message, created_at, read")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10000)

    if (notificationsError) {
      logger.error("Failed to fetch notifications for export", { error: notificationsError.message })
    }

    // Decrypt sensitive fields
    const decryptedMedicare = profile.medicare_number 
      ? decryptIfNeeded(profile.medicare_number) 
      : null

    const exportData: PatientDataExport = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: profile.id,
        email: profile.email || null,
        fullName: profile.full_name,
        phone: profile.phone,
        dateOfBirth: profile.date_of_birth,
        address: {
          line1: profile.address_line1,
          suburb: profile.suburb,
          state: profile.state,
          postcode: profile.postcode,
        },
        medicare: {
          number: decryptedMedicare,
          irn: profile.medicare_irn,
          expiry: profile.medicare_expiry,
        },
        createdAt: profile.created_at,
      },
      requests: (intakes || []).map(intake => ({
        id: intake.id,
        category: intake.category,
        subtype: intake.subtype,
        status: intake.status,
        createdAt: intake.created_at,
        updatedAt: intake.updated_at,
        answers: (() => {
          const ia = intake.intake_answers as unknown
          if (Array.isArray(ia)) return (ia as { answers: Record<string, unknown> }[])[0]?.answers || {}
          if (ia && typeof ia === 'object' && 'answers' in ia) return (ia as { answers: Record<string, unknown> }).answers || {}
          return {}
        })(),
      })),
      documents: (documents || []).map(doc => ({
        id: doc.id,
        type: doc.certificate_type,
        createdAt: doc.created_at,
        intakeId: doc.intake_id,
      })),
      notifications: (notifications || []).map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        createdAt: notif.created_at,
        read: notif.read,
      })),
    }

    logger.info("Patient data exported", { 
      patientId: profile.id,
      requestCount: exportData.requests.length,
      documentCount: exportData.documents.length,
    })

    // Send notification email (GDPR best practice)
    if (profile.email) {
      await sendViaResend({
        to: profile.email,
        subject: "Your data export is ready",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111;">Data Export Notification</h2>
            <p>Hi ${profile.full_name || "there"},</p>
            <p>Your personal data export was successfully generated on ${new Date().toLocaleDateString("en-AU", { dateStyle: "long" })} at ${new Date().toLocaleTimeString("en-AU", { timeStyle: "short" })}.</p>
            <p>The export includes:</p>
            <ul>
              <li>Your profile information</li>
              <li>${exportData.requests.length} request${exportData.requests.length !== 1 ? "s" : ""}</li>
              <li>${exportData.documents.length} document${exportData.documents.length !== 1 ? "s" : ""}</li>
              <li>${exportData.notifications.length} notification${exportData.notifications.length !== 1 ? "s" : ""}</li>
            </ul>
            <p style="color: #666; font-size: 14px;">If you did not request this export, please contact us immediately at support@instantmed.com.au</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">InstantMed Australia Pty Ltd</p>
          </body>
          </html>
        `,
        tags: [{ name: "type", value: "data_export_notification" }],
      }).catch((err) => {
        // Don't fail the export if email fails
        logger.warn("Failed to send data export notification email", { error: err })
      })
    }

    return { success: true, data: exportData }
  } catch (error) {
    logger.error("Failed to export patient data", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    })
    return { 
      success: false, 
      error: "Failed to export your data. Please try again or contact support." 
    }
  }
}
