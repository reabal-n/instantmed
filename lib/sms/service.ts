"use server"

import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("sms-service")

/**
 * SMS notification service for InstantMed
 * 
 * Integrates with Twilio for sending SMS notifications to patients.
 * Best practice from Instant Scripts, Abby Health, Doctors on Demand.
 * 
 * SMS notifications are used for:
 * - Request status updates (approved, declined, needs info)
 * - eScript delivery (clickable link to pharmacy)
 * - Appointment reminders
 * - Prescription refill reminders
 */

interface SendSmsParams {
  to: string // Australian mobile number
  message: string
  requestId?: string // For tracking
}

interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

// SMS Templates
export const SMS_TEMPLATES = {
  REQUEST_APPROVED: (patientName: string, requestType: string) =>
    `Hi ${patientName}, your ${requestType} request has been approved. Check your email for details or view at instantmed.com.au/patient`,

  REQUEST_DECLINED: (patientName: string) =>
    `Hi ${patientName}, we couldn't complete your request this time. A refund has been processed. See email for details or contact support@instantmed.com.au`,

  REQUEST_NEEDS_INFO: (patientName: string) =>
    `Hi ${patientName}, the doctor needs more info before completing your request. Please check your email and respond ASAP.`,

  ESCRIPT_READY: (patientName: string, scriptToken: string) =>
    `Hi ${patientName}, your eScript is ready! Show this code at any pharmacy: ${scriptToken}. Or tap: https://erx.com.au/script/${scriptToken}`,

  PAYMENT_RECEIVED: (patientName: string, amount: string) =>
    `Hi ${patientName}, payment of ${amount} received. Your request is now in the doctor queue. ETA: ~15 mins.`,

  REFILL_REMINDER: (medicationName: string, daysLeft: number) =>
    `Your ${medicationName} script may run out in ${daysLeft} days. Tap to refill: instantmed.com.au/prescriptions/request`,

  DOCTOR_ASSIGNED: (patientName: string, doctorName: string) =>
    `Hi ${patientName}, Dr. ${doctorName} is now reviewing your request. You'll hear back soon!`,
} as const

/**
 * Format Australian mobile number to E.164 format
 */
function formatAustralianMobile(phone: string): string | null {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")

  // Handle different formats
  if (digits.startsWith("61") && digits.length === 11) {
    return `+${digits}`
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+61${digits.slice(1)}`
  }
  if (digits.length === 9 && (digits.startsWith("4") || digits.startsWith("5"))) {
    return `+61${digits}`
  }

  // Invalid format
  return null
}

/**
 * Send SMS via Twilio
 */
export async function sendSms({ to, message, requestId }: SendSmsParams): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  // Check if SMS is configured
  if (!accountSid || !authToken || !fromNumber) {
    logger.warn("SMS not configured - skipping", { requestId })
    return { success: false, error: "SMS not configured" }
  }

  // Format phone number
  const formattedTo = formatAustralianMobile(to)
  if (!formattedTo) {
    logger.warn("Invalid phone number format", { to, requestId })
    return { success: false, error: "Invalid phone number format" }
  }

  try {
    // Use Twilio REST API directly (avoids need for twilio npm package)
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("Twilio API error", { status: response.status, requestId }, new Error(String(error)))
      return { success: false, error: `Twilio error: ${response.status}` }
    }

    const data = await response.json()
    logger.info("SMS sent successfully", { 
      messageId: data.sid, 
      to: formattedTo.slice(0, -4) + "****", // Mask number in logs
      requestId 
    })

    return { success: true, messageId: data.sid }
  } catch (err) {
    logger.error("Failed to send SMS", { requestId }, err instanceof Error ? err : new Error(String(err)))
    return { success: false, error: "Failed to send SMS" }
  }
}

/**
 * Send SMS notification for request status change
 */
export async function notifyPatientViaSms(
  phoneNumber: string,
  patientName: string,
  status: "approved" | "declined" | "needs_info" | "paid",
  requestType: string,
  requestId: string,
  extras?: {
    amount?: string
    scriptToken?: string
    doctorName?: string
  }
): Promise<SmsResult> {
  let message: string

  switch (status) {
    case "approved":
      message = extras?.scriptToken
        ? SMS_TEMPLATES.ESCRIPT_READY(patientName, extras.scriptToken)
        : SMS_TEMPLATES.REQUEST_APPROVED(patientName, requestType)
      break
    case "declined":
      message = SMS_TEMPLATES.REQUEST_DECLINED(patientName)
      break
    case "needs_info":
      message = SMS_TEMPLATES.REQUEST_NEEDS_INFO(patientName)
      break
    case "paid":
      message = SMS_TEMPLATES.PAYMENT_RECEIVED(patientName, extras?.amount || "$29")
      break
    default:
      return { success: false, error: "Unknown status" }
  }

  return sendSms({ to: phoneNumber, message, requestId })
}

/**
 * Validate if a phone number looks like a valid Australian mobile
 */
export async function isValidAustralianMobile(phone: string): Promise<boolean> {
  const formatted = formatAustralianMobile(phone)
  return formatted !== null && formatted.startsWith("+614")
}
