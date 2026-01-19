/**
 * SMS Templates for InstantMed
 * 
 * Separated from service.ts to avoid "use server" restrictions
 * (Server Action files can only export async functions)
 */

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
