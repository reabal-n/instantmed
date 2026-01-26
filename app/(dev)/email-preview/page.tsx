/**
 * Email Preview Index Page
 * 
 * Dev-only route for previewing email templates.
 * Lists all available templates with links to individual previews.
 */

import { redirect } from "next/navigation"
import Link from "next/link"

// Guard: Only available in development
export const dynamic = "force-dynamic"

const templates = [
  {
    slug: "welcome",
    name: "Welcome Email",
    description: "Sent to new patients after account creation",
  },
  {
    slug: "med-cert-patient",
    name: "Medical Certificate (Patient)",
    description: "Sent when medical certificate is approved and ready",
  },
  {
    slug: "med-cert-employer",
    name: "Medical Certificate (Employer)",
    description: "Sent to employer with secure download link",
  },
  {
    slug: "script-sent",
    name: "Script Sent",
    description: "Sent when prescription/eScript has been sent",
  },
  {
    slug: "request-declined",
    name: "Request Declined",
    description: "Sent when a request cannot be approved",
  },
]

export default function EmailPreviewIndex() {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-gray-600">
            Preview and test email templates in development mode.
          </p>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ This page is only available in development mode.
          </div>
        </div>

        <div className="space-y-4">
          {templates.map((template) => (
            <Link
              key={template.slug}
              href={`/email-preview/${template.slug}`}
              className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{template.description}</p>
              <span className="mt-3 inline-flex items-center text-sm font-medium text-teal-600">
                Preview template →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-100 rounded-xl">
          <h3 className="font-semibold text-gray-900">Developer Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>• Templates live in <code className="px-1 py-0.5 bg-gray-200 rounded">components/email/templates/</code></li>
            <li>• Base layout in <code className="px-1 py-0.5 bg-gray-200 rounded">components/email/base-email.tsx</code></li>
            <li>• Sending via <code className="px-1 py-0.5 bg-gray-200 rounded">lib/email/send-email.ts</code></li>
            <li>• All sends are logged to <code className="px-1 py-0.5 bg-gray-200 rounded">email_outbox</code> table</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
