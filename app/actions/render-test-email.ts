"use server"

/**
 * Render Test Email Server Action
 *
 * Renders REAL production React email templates to HTML so the admin
 * email test page shows exactly what patients will receive.
 */

import * as React from "react"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
import { requireRoleOrNull } from "@/lib/auth"

// Template registry -- maps template IDs to their React component + subject
const TEMPLATE_REGISTRY: Record<
  string,
  {
    load: () => Promise<{ component: React.FC<Record<string, unknown>>; subject: string }>
  }
> = {
  med_cert_patient: {
    async load() {
      const { MedCertPatientEmail, medCertPatientEmailSubject } = await import(
        "@/components/email/templates/med-cert-patient"
      )
      return { component: MedCertPatientEmail as React.FC<Record<string, unknown>>, subject: medCertPatientEmailSubject }
    },
  },
  med_cert_employer: {
    async load() {
      const { MedCertEmployerEmail, medCertEmployerEmailSubject } = await import(
        "@/components/email/templates/med-cert-employer"
      )
      return { component: MedCertEmployerEmail as React.FC<Record<string, unknown>>, subject: medCertEmployerEmailSubject }
    },
  },
  welcome: {
    async load() {
      const { WelcomeEmail, welcomeEmailSubject } = await import(
        "@/components/email/templates/welcome"
      )
      return { component: WelcomeEmail as React.FC<Record<string, unknown>>, subject: welcomeEmailSubject }
    },
  },
  script_sent: {
    async load() {
      const { ScriptSentEmail, scriptSentEmailSubject } = await import(
        "@/components/email/templates/script-sent"
      )
      return { component: ScriptSentEmail as React.FC<Record<string, unknown>>, subject: scriptSentEmailSubject }
    },
  },
  request_declined: {
    async load() {
      const { RequestDeclinedEmail, requestDeclinedEmailSubject } = await import(
        "@/components/email/templates/request-declined"
      )
      return { component: RequestDeclinedEmail as React.FC<Record<string, unknown>>, subject: requestDeclinedEmailSubject }
    },
  },
  prescription_approved: {
    async load() {
      const { PrescriptionApprovedEmail } = await import(
        "@/components/email/templates/prescription-approved"
      )
      return { component: PrescriptionApprovedEmail as React.FC<Record<string, unknown>>, subject: "Your prescription has been approved" }
    },
  },
  consult_approved: {
    async load() {
      const { ConsultApprovedEmail } = await import(
        "@/components/email/templates/consult-approved"
      )
      return { component: ConsultApprovedEmail as React.FC<Record<string, unknown>>, subject: "Your consultation has been reviewed" }
    },
  },
  ed_approved: {
    async load() {
      const { EdApprovedEmail } = await import(
        "@/components/email/templates/ed-approved"
      )
      return { component: EdApprovedEmail as React.FC<Record<string, unknown>>, subject: "Your ED prescription has been approved" }
    },
  },
  hair_loss_approved: {
    async load() {
      const { HairLossApprovedEmail } = await import(
        "@/components/email/templates/hair-loss-approved"
      )
      return { component: HairLossApprovedEmail as React.FC<Record<string, unknown>>, subject: "Your treatment has been approved" }
    },
  },
  weight_loss_approved: {
    async load() {
      const { WeightLossApprovedEmail } = await import(
        "@/components/email/templates/weight-loss-approved"
      )
      return { component: WeightLossApprovedEmail as React.FC<Record<string, unknown>>, subject: "Your treatment has been approved" }
    },
  },
  womens_health_approved: {
    async load() {
      const { WomensHealthApprovedEmail } = await import(
        "@/components/email/templates/womens-health-approved"
      )
      return { component: WomensHealthApprovedEmail as React.FC<Record<string, unknown>>, subject: "Your treatment has been approved" }
    },
  },
  payment_receipt: {
    async load() {
      const { PaymentReceiptEmail, paymentReceiptEmailSubject } = await import(
        "@/components/email/templates/payment-receipt"
      )
      return { component: PaymentReceiptEmail as React.FC<Record<string, unknown>>, subject: paymentReceiptEmailSubject }
    },
  },
  repeat_rx_reminder: {
    async load() {
      const { RepeatRxReminderEmail } = await import(
        "@/components/email/templates/repeat-rx-reminder"
      )
      return { component: RepeatRxReminderEmail as React.FC<Record<string, unknown>>, subject: "Time to renew your prescription" }
    },
  },
}

export async function renderTestEmailAction(
  templateId: string,
  sampleData: Record<string, string>
): Promise<{ success: boolean; html?: string; subject?: string; error?: string }> {
  // Auth check
  const auth = await requireRoleOrNull(["admin"])
  if (!auth?.profile) {
    return { success: false, error: "Unauthorized" }
  }

  const registry = TEMPLATE_REGISTRY[templateId]
  if (!registry) {
    return { success: false, error: `Unknown template: ${templateId}` }
  }

  try {
    const { component: Component, subject } = await registry.load()

    // Create the React element with sample data
    const element = React.createElement(Component, sampleData)

    // Render to static HTML using the same function as production
    const html = await renderEmailToHtml(element)

    // Inject a test banner at the top of the body
    const bannerHtml = `<div style="background:#dc2626;color:white;padding:8px 16px;text-align:center;font-size:13px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TEST EMAIL — ${templateId.replace(/_/g, " ").toUpperCase()}</div>`
    const htmlWithBanner = html.replace(/<body[^>]*>/, (match) => `${match}${bannerHtml}`)

    return { success: true, html: htmlWithBanner, subject: `[TEST] ${subject}` }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Render failed: ${errorMessage}` }
  }
}

/** List available template IDs for the UI */
export function getAvailableTemplateIds(): string[] {
  return Object.keys(TEMPLATE_REGISTRY)
}
