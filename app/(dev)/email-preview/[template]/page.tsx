/**
 * Individual Email Template Preview
 * 
 * Renders a specific email template with mock props.
 * Dev-only route.
 */

import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import * as React from "react"
import { renderEmailToHtml } from "@/lib/email/render-template"

import { WelcomeEmail } from "@/components/email/templates/welcome"
import { MedCertPatientEmail } from "@/components/email/templates/med-cert-patient"
import { MedCertEmployerEmail } from "@/components/email/templates/med-cert-employer"
import { ScriptSentEmail } from "@/components/email/templates/script-sent"
import { RequestDeclinedEmail } from "@/components/email/templates/request-declined"

export const dynamic = "force-dynamic"

// Mock data for previews
const mockData = {
  appUrl: "http://localhost:3000",
  patientName: "Sarah Johnson",
  dashboardUrl: "http://localhost:3000/patient/intakes/abc-123",
  verificationCode: "MC-ABC123-XYZ",
  requestId: "abc-123",
  escriptReference: "ES-2024-001234",
  employerName: "John Smith",
  companyName: "Acme Corporation",
  downloadUrl: "http://localhost:3000/api/download/secure-token-xyz",
  certStartDate: "26 January 2026",
  certEndDate: "28 January 2026",
  patientNote: "Please find my medical certificate attached. Let me know if you need anything else.",
  declineReason: "After reviewing your request, a telehealth consultation alone is not suitable for your situation. We recommend you see your regular GP in person for a proper examination.",
}

// Template registry
const templates: Record<string, {
  name: string
  subject: string
  render: () => React.ReactElement
}> = {
  "welcome": {
    name: "Welcome Email",
    subject: "Welcome to InstantMed",
    render: () => (
      <WelcomeEmail
        patientName={mockData.patientName}
        appUrl={mockData.appUrl}
      />
    ),
  },
  "med-cert-patient": {
    name: "Medical Certificate (Patient)",
    subject: "Your medical certificate is ready",
    render: () => (
      <MedCertPatientEmail
        patientName={mockData.patientName}
        dashboardUrl={mockData.dashboardUrl}
        verificationCode={mockData.verificationCode}
        certType="work"
        appUrl={mockData.appUrl}
      />
    ),
  },
  "med-cert-employer": {
    name: "Medical Certificate (Employer)",
    subject: `Medical Certificate for ${mockData.patientName}`,
    render: () => (
      <MedCertEmployerEmail
        employerName={mockData.employerName}
        companyName={mockData.companyName}
        patientName={mockData.patientName}
        downloadUrl={mockData.downloadUrl}
        expiresInDays={7}
        verificationCode={mockData.verificationCode}
        patientNote={mockData.patientNote}
        certStartDate={mockData.certStartDate}
        certEndDate={mockData.certEndDate}
        appUrl={mockData.appUrl}
      />
    ),
  },
  "script-sent": {
    name: "Script Sent",
    subject: "Your eScript has been sent",
    render: () => (
      <ScriptSentEmail
        patientName={mockData.patientName}
        requestId={mockData.requestId}
        escriptReference={mockData.escriptReference}
        appUrl={mockData.appUrl}
      />
    ),
  },
  "request-declined": {
    name: "Request Declined",
    subject: "Update on your Medical Certificate request",
    render: () => (
      <RequestDeclinedEmail
        patientName={mockData.patientName}
        requestType="Medical Certificate"
        requestId={mockData.requestId}
        reason={mockData.declineReason}
        appUrl={mockData.appUrl}
      />
    ),
  },
}

interface PageProps {
  params: Promise<{ template: string }>
}

export default async function EmailPreviewPage({ params }: PageProps) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    redirect("/")
  }

  const { template: templateSlug } = await params
  const template = templates[templateSlug]
  
  if (!template) {
    notFound()
  }

  // Render the template to HTML
  const element = template.render()
  const html = await renderEmailToHtml(element)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/email-preview"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back to templates
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="font-semibold text-gray-900">{template.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Subject: <span className="font-medium text-gray-700">{template.subject}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview area */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Info bar */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center justify-between">
            <span>📧 Preview with mock data — actual emails will use real patient information</span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Dev Only
            </span>
          </div>

          {/* Email frame */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Fake email header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-16 text-gray-500">From:</span>
                  <span className="text-gray-900">InstantMed &lt;noreply@instantmed.com.au&gt;</span>
                </div>
                <div className="flex">
                  <span className="w-16 text-gray-500">To:</span>
                  <span className="text-gray-900">{mockData.patientName} &lt;patient@example.com&gt;</span>
                </div>
                <div className="flex">
                  <span className="w-16 text-gray-500">Subject:</span>
                  <span className="text-gray-900 font-medium">{template.subject}</span>
                </div>
              </div>
            </div>

            {/* Email content iframe */}
            <iframe
              srcDoc={html}
              className="w-full border-0"
              style={{ height: "800px" }}
              title="Email preview"
            />
          </div>

          {/* Raw HTML toggle */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              View raw HTML
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
              {html}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
