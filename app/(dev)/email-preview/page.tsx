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
  // ── Core Patient Lifecycle ──
  {
    slug: "welcome",
    name: "Welcome Email",
    description: "Sent to new patients after account creation",
    category: "lifecycle",
  },
  {
    slug: "guest-complete-account",
    name: "Guest Complete Account",
    description: "Sent to guest checkout patients to set up their account",
    category: "lifecycle",
  },
  {
    slug: "verification-code",
    name: "Verification Code",
    description: "One-time verification code for identity confirmation",
    category: "lifecycle",
  },

  // ── Request Flow ──
  {
    slug: "intake-submitted",
    name: "Intake Submitted",
    description: "Confirmation that a request has been submitted for review",
    category: "request",
  },
  {
    slug: "request-received",
    name: "Request Received (Payment Confirmed)",
    description: "Sent after payment — request is with the doctor",
    category: "request",
  },
  {
    slug: "still-reviewing",
    name: "Still Reviewing",
    description: "Sent at 45 minutes if the request is still being reviewed",
    category: "request",
  },
  {
    slug: "needs-more-info",
    name: "Needs More Info",
    description: "Doctor needs additional information from the patient",
    category: "request",
  },

  // ── Approvals ──
  {
    slug: "med-cert-patient",
    name: "Medical Certificate (Patient)",
    description: "Sent when medical certificate is approved and ready",
    category: "approval",
  },
  {
    slug: "med-cert-employer",
    name: "Medical Certificate (Employer)",
    description: "Sent to employer with secure download link",
    category: "approval",
  },
  {
    slug: "consult-approved",
    name: "Consultation Approved",
    description: "Sent when a general consultation is completed",
    category: "approval",
  },
  {
    slug: "prescription-approved",
    name: "Prescription Approved",
    description: "Sent when a repeat prescription request is approved",
    category: "approval",
  },
  {
    slug: "script-sent",
    name: "Script Sent",
    description: "Sent when the eScript has been dispatched",
    category: "approval",
  },
  {
    slug: "ed-approved",
    name: "ED Consultation Approved",
    description: "Sent when an ED consultation is completed with medication guidance",
    category: "approval",
  },
  {
    slug: "hair-loss-approved",
    name: "Hair Loss Approved",
    description: "Sent when hair loss treatment is approved with medication details",
    category: "approval",
  },
  {
    slug: "weight-loss-approved",
    name: "Weight Loss Approved",
    description: "Sent when weight loss treatment is approved with medication details",
    category: "approval",
  },
  {
    slug: "womens-health-approved",
    name: "Women's Health Approved",
    description: "Sent when women's health treatment is approved",
    category: "approval",
  },
  {
    slug: "request-declined",
    name: "Request Declined",
    description: "Sent when a request cannot be approved",
    category: "approval",
  },

  // ── Payments ──
  {
    slug: "payment-confirmed",
    name: "Payment Confirmed",
    description: "Payment confirmation with receipt details",
    category: "payment",
  },
  {
    slug: "payment-receipt",
    name: "Payment Receipt",
    description: "Detailed payment receipt with service breakdown",
    category: "payment",
  },
  {
    slug: "payment-failed",
    name: "Payment Failed",
    description: "Notification that a payment attempt failed",
    category: "payment",
  },
  {
    slug: "payment-retry",
    name: "Payment Retry",
    description: "Prompt to retry a failed payment",
    category: "payment",
  },
  {
    slug: "refund-issued",
    name: "Refund Issued",
    description: "Notification that a refund has been processed",
    category: "payment",
  },

  // ── Engagement & Retention ──
  {
    slug: "abandoned-checkout",
    name: "Abandoned Checkout",
    description: "Reminder for patients who left during checkout",
    category: "engagement",
  },
  {
    slug: "repeat-rx-reminder",
    name: "Repeat Rx Reminder",
    description: "Reminder to reorder a repeat prescription",
    category: "engagement",
  },
  {
    slug: "referral-credit",
    name: "Referral Credit",
    description: "Notification of earned referral credit",
    category: "engagement",
  },
  {
    slug: "abandoned-checkout-followup",
    name: "Abandoned Checkout Followup (24h)",
    description: "Last-call email sent 24h after abandoned checkout with social proof",
    category: "engagement",
  },
  {
    slug: "review-request",
    name: "Review Request (Day 2)",
    description: "Warm Google review ask sent 2 days after approval",
    category: "engagement",
  },
  {
    slug: "review-followup",
    name: "Review Followup (Day 7)",
    description: "Gentle review nudge sent 7 days after approval (last ask)",
    category: "engagement",
  },
  {
    slug: "subscription-nudge",
    name: "Subscription Nudge (Day 30)",
    description: "Repeat Rx subscription upsell sent 30 days after approval",
    category: "engagement",
  },
  {
    slug: "decline-reengagement",
    name: "Decline Re-Engagement",
    description: "Sent ~2h after decline suggesting alternative services",
    category: "engagement",
  },
  {
    slug: "follow-up-reminder",
    name: "Follow-Up Reminder (Day 3)",
    description: "Gentle check-in sent 3 days after med cert approval",
    category: "engagement",
  },
  {
    slug: "treatment-followup",
    name: "Treatment Follow-Up",
    description: "Treatment milestone check-in for followup tracker",
    category: "engagement",
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  lifecycle: "Patient Lifecycle",
  request: "Request Flow",
  approval: "Approvals & Outcomes",
  payment: "Payments",
  engagement: "Engagement & Retention",
}

const CATEGORY_ORDER = ["lifecycle", "request", "approval", "payment", "engagement"]

export default function EmailPreviewIndex() {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    redirect("/")
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    items: templates.filter((t) => t.category === cat),
  }))

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-gray-600">
            Preview and test all {templates.length} email templates in development mode.
          </p>
          <div className="mt-4 p-3 bg-warning-light border border-warning-border rounded-lg text-sm text-warning">
            This page is only available in development mode.
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.category} className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.label}
            </h2>
            <div className="space-y-3">
              {group.items.map((template) => (
                <Link
                  key={template.slug}
                  href={`/email-preview/${template.slug}`}
                  className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <h3 className="text-base font-semibold text-gray-900">{template.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                  <span className="mt-2 inline-flex items-center text-sm font-medium text-primary">
                    Preview template →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-12 p-6 bg-gray-100 rounded-xl">
          <h3 className="font-semibold text-gray-900">Developer Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>Templates live in <code className="px-1 py-0.5 bg-gray-200 rounded">components/email/templates/</code></li>
            <li>Base layout in <code className="px-1 py-0.5 bg-gray-200 rounded">components/email/base-email.tsx</code></li>
            <li>Sending via <code className="px-1 py-0.5 bg-gray-200 rounded">lib/email/send-email.ts</code></li>
            <li>All sends are logged to <code className="px-1 py-0.5 bg-gray-200 rounded">email_outbox</code> table</li>
            <li>All templates use React Email components</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
