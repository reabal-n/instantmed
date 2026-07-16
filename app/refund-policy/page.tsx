import type { Metadata } from "next"
import Link from "next/link"
import type React from "react"

import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { Navbar } from "@/components/shared/navbar"
import { CONTACT_EMAIL, CONTACT_EMAIL_COMPLAINTS } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "InstantMed's refund policy for medical certificates, prescriptions, and telehealth consultations.",
  alternates: { canonical: "https://instantmed.com.au/refund-policy" },
  openGraph: {
    title: "Refund Policy | InstantMed",
    description:
      "InstantMed's refund policy for medical certificates, prescriptions, and telehealth consultations.",
    url: "https://instantmed.com.au/refund-policy",
  },
}

export const revalidate = 86400

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-10 px-4">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Refund Policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-3xl">
            <div className="bg-white dark:bg-card rounded-2xl border border-border/50 shadow-md shadow-primary/[0.06] p-8 sm:p-12 divide-y divide-border/40">

              <S n="1" title="Overview">
                <p>
                  {REFUND_PAYMENT_PROCESS} This policy explains when that guarantee applies, how
                  other refund requests are assessed, and what happens after a refund starts.
                </p>
              </S>

              <S n="2" title="When You Are Eligible for a Refund">
                <ul>
                  <li>
                    <strong>Clinical decline</strong> - If a doctor declines your medical certificate,
                    prescription, or specialty request, the full request fee and any priority fee are
                    automatically refunded.
                  </li>
                  <li>
                    <strong>In-person care recommended</strong> - A recorded decline because online
                    care is not suitable receives the same automatic full refund.
                  </li>
                  <li>
                    <strong>Duplicate or incorrect charge</strong> - Contact support so we can verify
                    the payment and return any amount charged in error.
                  </li>
                  <li>
                    <strong>Confirmed service failure</strong> - If a technical problem prevents us
                    from providing an approved outcome and we cannot correct it, support will arrange
                    the appropriate refund.
                  </li>
                </ul>
              </S>

              <S n="3" title="When Refunds Do Not Apply">
                <ul>
                  <li>
                    <strong>Completed service</strong> - Once an approved certificate, eScript, or
                    clinical outcome has been delivered, a change-of-mind refund is generally not
                    available. Your rights under Australian Consumer Law are not excluded.
                  </li>
                  <li>
                    <strong>Change of mind after review begins</strong> - Contact support as soon as
                    possible. Eligibility depends on whether clinical work or delivery has already
                    occurred.
                  </li>
                  <li>
                    <strong>Inaccurate information</strong> - If a request is declined because you
                    provided inaccurate or incomplete health information, the standard refund policy
                    still applies (you will receive a refund), but repeated misuse may result in
                    account restrictions.
                  </li>
                </ul>
              </S>

              <S n="4" title="How Refunds Are Processed">
                <ul>
                  <li>
                    A recorded clinical decline starts the full refund automatically. No separate
                    refund form is required.
                  </li>
                  <li>
                    Refunds are returned to your original payment method (the card or account used at
                    checkout).
                  </li>
                  <li>
                    Your bank or card issuer controls when the credit appears on your statement, so
                    timing varies after the refund is started.
                  </li>
                  <li>
                    Support can verify the refund status if a confirmation message is delayed or missing.
                  </li>
                </ul>
              </S>

              <S n="5" title="Requesting a Refund">
                <p>
                  Most refunds are issued automatically. If you believe you are entitled to a refund
                  that has not been processed, or if you have questions about a charge, please contact
                  us:
                </p>
                <ul>
                  <li>
                    Email:{" "}
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="text-primary hover:underline"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </li>
                  <li>Include your name, email address, and the date of your request.</li>
                  <li>We will verify the payment record and tell you what happens next.</li>
                </ul>
              </S>

              <S n="6" title="Disputes">
                <p>
                  If you are not satisfied with the outcome of a refund request, you may lodge a
                  formal complaint at{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`}
                    className="text-primary hover:underline"
                  >
                    {CONTACT_EMAIL_COMPLAINTS}
                  </a>
                  . {COMPLAINTS_TIMING} You may also contact your bank or payment provider to dispute
                  a charge, or escalate to the relevant state health complaints body.
                </p>
              </S>

              <S n="7" title="Related Policies">
                <ul>
                  <li>
                    <Link href="/guarantee" className="text-primary hover:underline">
                      Refund-on-decline guarantee
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms#fees" className="text-primary hover:underline">
                      Terms of Service - Fees, Payment, and Refunds
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/cookie-policy" className="text-primary hover:underline">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </S>

            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}

function S({
  n,
  title,
  children,
}: {
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="pt-8 first:pt-0">
      <h2 className="text-base font-semibold mb-3 text-foreground">
        {n}. {title}
      </h2>
      <div className="text-sm sm:text-[0.9375rem] text-muted-foreground leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mt-2 [&_strong]:text-foreground/80 [&_strong]:font-medium">
        {children}
      </div>
    </section>
  )
}
