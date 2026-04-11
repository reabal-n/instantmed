import type { Metadata } from "next"
import type React from "react"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CONTACT_EMAIL_PRIVACY } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Learn how InstantMed uses cookies and similar technologies to provide, improve, and protect our telehealth services.",
  alternates: { canonical: "https://instantmed.com.au/cookie-policy" },
  openGraph: {
    title: "Cookie Policy | InstantMed",
    description:
      "Learn how InstantMed uses cookies and similar technologies to provide, improve, and protect our telehealth services.",
    url: "https://instantmed.com.au/cookie-policy",
  },
}

export const revalidate = 86400

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-10 px-4">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Cookie Policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-3xl">
            <div className="bg-white dark:bg-card rounded-2xl border border-border/50 shadow-md shadow-primary/[0.06] p-8 sm:p-12 divide-y divide-border/40">

              <S n="1" title="What Are Cookies?">
                <p>
                  Cookies are small text files stored on your device (computer, tablet, or mobile)
                  when you visit a website. They help the website remember your preferences and
                  improve your experience.
                </p>
                <p>
                  This Cookie Policy explains how InstantMed uses cookies and similar technologies
                  when you visit instantmed.com.au or use our telehealth services.
                </p>
              </S>

              <S n="2" title="Types of Cookies We Use">
                <p className="font-medium text-foreground/80">Essential Cookies</p>
                <p>
                  These cookies are necessary for the website to function properly. They enable core
                  functionality such as security, authentication, and accessibility. You cannot opt
                  out of these cookies.
                </p>
                <ul>
                  <li><strong>Authentication cookies</strong> - Keep you logged in during your session (Supabase Auth)</li>
                  <li><strong>Security cookies</strong> - Help protect against cross-site request forgery (CSRF)</li>
                  <li><strong>Session cookies</strong> - Remember your preferences during a single visit</li>
                </ul>

                <p className="font-medium text-foreground/80 !mt-5">Analytics Cookies</p>
                <p>
                  These cookies help us understand how visitors interact with our website. We use
                  PostHog for privacy-focused analytics.
                </p>
                <ul>
                  <li>
                    <strong>PostHog</strong> - Tracks page views and feature usage to help us improve
                    the experience
                  </li>
                </ul>

                <p className="font-medium text-foreground/80 !mt-5">Functional Cookies</p>
                <p>These cookies enable enhanced functionality and personalisation.</p>
                <ul>
                  <li><strong>Theme preferences</strong> - Remember your dark/light mode preference</li>
                  <li><strong>Cookie consent</strong> - Remember your cookie preferences</li>
                </ul>

                <p className="font-medium text-foreground/80 !mt-5">Payment Cookies</p>
                <p>
                  When you make a payment, our payment processor (Stripe) may set cookies to process
                  your transaction securely and prevent fraud.
                </p>
              </S>

              <S n="3" title="Third-Party Services">
                <p>We use the following third-party services that may set cookies:</p>
                <div className="overflow-x-auto !mt-3">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="text-left py-2 pr-4 font-medium text-foreground/80">Service</th>
                        <th className="text-left py-2 pr-4 font-medium text-foreground/80">Purpose</th>
                        <th className="text-left py-2 font-medium text-foreground/80">Privacy Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {[
                        { name: "Supabase", purpose: "Authentication", url: "https://supabase.com/privacy", label: "supabase.com/privacy" },
                        { name: "PostHog", purpose: "Analytics", url: "https://posthog.com/privacy", label: "posthog.com/privacy" },
                        { name: "Stripe", purpose: "Payments", url: "https://stripe.com/au/privacy", label: "stripe.com/privacy" },
                        { name: "Sentry", purpose: "Error tracking", url: "https://sentry.io/privacy/", label: "sentry.io/privacy" },
                      ].map((row) => (
                        <tr key={row.name}>
                          <td className="py-2 pr-4">{row.name}</td>
                          <td className="py-2 pr-4">{row.purpose}</td>
                          <td className="py-2">
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {row.label}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </S>

              <S n="4" title="Managing Your Cookie Preferences">
                <p>
                  You can manage your cookie preferences at any time by clicking the &quot;Cookie
                  Settings&quot; link in our website footer, or by adjusting your browser settings.
                </p>
                <p>Most browsers allow you to refuse or delete cookies:</p>
                <ul>
                  <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li><strong>Firefox:</strong> Options → Privacy &amp; Security → Cookies</li>
                  <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
                </ul>
                <p>
                  Blocking essential cookies may affect the functionality of our website and your
                  ability to use our services.
                </p>
              </S>

              <S n="5" title="Data Retention">
                <p>Cookie data is retained for different periods depending on the type:</p>
                <ul>
                  <li><strong>Session cookies</strong> - Deleted when you close your browser</li>
                  <li><strong>Persistent cookies</strong> - Up to 12 months</li>
                  <li><strong>Analytics data</strong> - Anonymised after 26 months</li>
                </ul>
              </S>

              <S n="6" title="Australian Privacy Principles">
                <p>
                  Our use of cookies complies with the Australian Privacy Principles (APPs) under the
                  Privacy Act 1988. For more information about how we handle your personal
                  information, see our{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </S>

              <S n="7" title="Updates to This Policy">
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in our
                  practices or for legal reasons. Material changes will be posted on this page.
                </p>
              </S>

              <S n="8" title="Contact Us">
                <p>
                  If you have questions about our use of cookies, please contact us at{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL_PRIVACY}`}
                    className="text-primary hover:underline"
                  >
                    {CONTACT_EMAIL_PRIVACY}
                  </a>
                  .
                </p>
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
