import type { Metadata } from "next"
import type React from "react"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CONTACT_EMAIL, CONTACT_EMAIL_COMPLAINTS, PRICING_DISPLAY } from "@/lib/constants"

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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Refund Policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: March 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-3xl">
            <div className="bg-card/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-border/50 dark:border-white/10 shadow-sm p-8 sm:p-12 divide-y divide-border/40">

              <S n="1" title="Overview">
                <p>
                  InstantMed is committed to fair and transparent pricing. Payment is collected at
                  the time you submit your request. If your request cannot be fulfilled, we provide a
                  full refund. This policy outlines when refunds apply and how they are processed.
                </p>
              </S>

              <S n="2" title="When You Are Eligible for a Refund">
                <ul>
                  <li>
                    <strong>Request declined by a doctor</strong> — If a doctor determines your
                    request is not appropriate for telehealth or requires an in-person examination,
                    you will receive an automatic full refund. This applies to medical certificates
                    (from {PRICING_DISPLAY.MED_CERT}) and prescriptions ({PRICING_DISPLAY.REPEAT_SCRIPT}).
                  </li>
                  <li>
                    <strong>Cancellation before review</strong> — If you cancel your request before a
                    doctor begins reviewing it, you will receive a full refund.
                  </li>
                  <li>
                    <strong>Review not completed within 24 hours</strong> — If a doctor is unable to
                    review your request within 24 hours of submission, you may request a full refund.
                  </li>
                  <li>
                    <strong>Technical issues</strong> — If a system error prevents delivery of your
                    medical certificate, prescription, or consultation outcome, you are entitled to a
                    full refund.
                  </li>
                </ul>
              </S>

              <S n="3" title="When Refunds Do Not Apply">
                <ul>
                  <li>
                    <strong>Approved requests</strong> — Once a doctor has approved your request and
                    delivered your medical certificate or prescription, a refund is not available. The
                    service has been provided.
                  </li>
                  <li>
                    <strong>Consultations</strong> — Telehealth consultations are non-refundable once
                    a doctor has reviewed your information and provided clinical advice, regardless of
                    the clinical outcome.
                  </li>
                  <li>
                    <strong>Inaccurate information</strong> — If a request is declined because you
                    provided inaccurate or incomplete health information, the standard refund policy
                    still applies (you will receive a refund), but repeated misuse may result in
                    account restrictions.
                  </li>
                </ul>
              </S>

              <S n="4" title="How Refunds Are Processed">
                <ul>
                  <li>
                    Eligible refunds are processed automatically when a doctor declines your request.
                    No action is required on your part.
                  </li>
                  <li>
                    Refunds are returned to your original payment method (the card or account used at
                    checkout).
                  </li>
                  <li>
                    Refunds typically appear within <strong>3–5 business days</strong>, though your
                    bank may take longer to process.
                  </li>
                  <li>
                    You will receive an email confirmation when your refund has been issued.
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
                  <li>We aim to respond to refund enquiries within 2 business days.</li>
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
                  . We will respond within 14 business days. You may also contact your bank or
                  payment provider to dispute a charge, or escalate to the relevant state health
                  complaints commissioner.
                </p>
              </S>

              <S n="7" title="Related Policies">
                <ul>
                  <li>
                    <Link href="/terms#fees" className="text-primary hover:underline">
                      Terms of Service — Fees, Payment, and Refunds
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
