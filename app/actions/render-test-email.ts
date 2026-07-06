"use server"

/**
 * Render Test Email Server Action
 *
 * Renders REAL production React email templates to HTML so the admin
 * email test page shows exactly what patients will receive.
 */

import * as React from "react"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"

// Subject can be a plain string or a function that takes a name/label arg
type SubjectValue = string | ((...args: string[]) => string)

/**
 * Email template components accept various prop shapes but the test renderer
 * passes Record<string, unknown> sample data. This type bridges between the
 * specific prop types (MedCertPatientEmailProps, etc.) and the generic renderer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmailComponent = React.FC<any>

// Template registry -- maps template IDs to their React component + subject
const TEMPLATE_REGISTRY: Record<
  string,
  {
    load: () => Promise<{ component: EmailComponent; subject: SubjectValue }>
  }
> = {
  med_cert_patient: {
    async load() {
      const { MedCertPatientEmail, medCertPatientEmailSubject } = await import(
        "@/lib/email/components/templates/med-cert-patient"
      )
      return { component: MedCertPatientEmail as EmailComponent, subject: medCertPatientEmailSubject() }
    },
  },
  med_cert_employer: {
    async load() {
      const { MedCertEmployerEmail, medCertEmployerEmailSubject } = await import(
        "@/lib/email/components/templates/med-cert-employer"
      )
      return { component: MedCertEmployerEmail as EmailComponent, subject: medCertEmployerEmailSubject }
    },
  },
  script_sent: {
    async load() {
      const { ScriptSentEmail, scriptSentEmailSubject } = await import(
        "@/lib/email/components/templates/script-sent"
      )
      return { component: ScriptSentEmail as EmailComponent, subject: scriptSentEmailSubject() }
    },
  },
  request_declined: {
    async load() {
      const { RequestDeclinedEmail, requestDeclinedEmailSubject } = await import(
        "@/lib/email/components/templates/request-declined"
      )
      return { component: RequestDeclinedEmail as EmailComponent, subject: requestDeclinedEmailSubject }
    },
  },
  consult_approved: {
    async load() {
      const { ConsultApprovedEmail } = await import(
        "@/lib/email/components/templates/consult-approved"
      )
      return { component: ConsultApprovedEmail as EmailComponent, subject: "Your consultation has been reviewed" }
    },
  },
  payment_confirmed: {
    async load() {
      const { PaymentConfirmedEmail } = await import(
        "@/lib/email/components/templates/payment-confirmed"
      )
      return { component: PaymentConfirmedEmail as EmailComponent, subject: "Payment confirmed" }
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
    const { component: Component, subject: rawSubject } = await registry.load()

    // Resolve subject -- some templates export a function (e.g. (name) => `...`)
    const subject = typeof rawSubject === "function" ? rawSubject(sampleData.patientName ?? "Test Patient") : rawSubject

    // Create the React element with sample data
    const element = React.createElement(Component, sampleData)

    // Render to static HTML using the same function as production
    const html = await renderEmailToHtml(element)

    // Inject a test banner at the top of the body
    const bannerHtml = `<div style="background:#dc2626;color:white;padding:8px 16px;text-align:center;font-size:13px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TEST EMAIL - ${templateId.replace(/_/g, " ").toUpperCase()}</div>`
    const htmlWithBanner = html.replace(/<body[^>]*>/, (match) => `${match}${bannerHtml}`)

    return { success: true, html: htmlWithBanner, subject: `[TEST] ${subject}` }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Render failed: ${errorMessage}` }
  }
}

/** List available template IDs for the UI */
export async function getAvailableTemplateIds(): Promise<string[]> {
  return Object.keys(TEMPLATE_REGISTRY)
}
