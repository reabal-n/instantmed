import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn how InstantMed uses cookies and similar technologies to provide, improve, and protect our telehealth services.",
  alternates: {
    canonical: "https://instantmed.com.au/cookie-policy",
  },
}

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 bg-background">
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p>
              This Cookie Policy explains how InstantMed (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
              technologies when you visit our website at instantmed.com.au or use our telehealth services.
            </p>

            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit
              a website. They help the website remember your preferences and improve your experience.
            </p>

            <h2>Types of Cookies We Use</h2>

            <h3>Essential Cookies</h3>
            <p>
              These cookies are necessary for the website to function properly. They enable core functionality such as
              security, authentication, and accessibility. You cannot opt out of these cookies.
            </p>
            <ul>
              <li><strong>Authentication cookies</strong> — Keep you logged in during your session (Clerk)</li>
              <li><strong>Security cookies</strong> — Help protect against cross-site request forgery (CSRF)</li>
              <li><strong>Session cookies</strong> — Remember your preferences during a single visit</li>
            </ul>

            <h3>Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our website, allowing us to improve our
              services. We use PostHog for privacy-focused analytics.
            </p>
            <ul>
              <li><strong>PostHog</strong> — Tracks page views, feature usage, and helps us improve the user experience</li>
            </ul>

            <h3>Functional Cookies</h3>
            <p>These cookies enable enhanced functionality and personalisation.</p>
            <ul>
              <li><strong>Theme preferences</strong> — Remember your dark/light mode preference</li>
              <li><strong>Cookie consent</strong> — Remember your cookie preferences</li>
            </ul>

            <h3>Payment Cookies</h3>
            <p>
              When you make a payment, our payment processor (Stripe) may set cookies to process your transaction
              securely and prevent fraud.
            </p>

            <h2>Third-Party Cookies</h2>
            <p>We use the following third-party services that may set cookies:</p>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Purpose</th>
                  <th>Privacy Policy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Clerk</td>
                  <td>Authentication</td>
                  <td><a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer">clerk.com/privacy</a></td>
                </tr>
                <tr>
                  <td>PostHog</td>
                  <td>Analytics</td>
                  <td><a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">posthog.com/privacy</a></td>
                </tr>
                <tr>
                  <td>Stripe</td>
                  <td>Payments</td>
                  <td><a href="https://stripe.com/au/privacy" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a></td>
                </tr>
                <tr>
                  <td>Sentry</td>
                  <td>Error tracking</td>
                  <td><a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">sentry.io/privacy</a></td>
                </tr>
              </tbody>
            </table>

            <h2>Managing Your Cookie Preferences</h2>
            <p>
              You can manage your cookie preferences at any time by clicking the &quot;Cookie Settings&quot; link in our website
              footer or by adjusting your browser settings.
            </p>
            <p>
              Most browsers allow you to refuse or delete cookies. The method varies depending on your browser:
            </p>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
            <p>
              Please note that blocking essential cookies may affect the functionality of our website and your ability
              to use our telehealth services.
            </p>

            <h2>Data Retention</h2>
            <p>
              Cookie data is retained for different periods depending on the type:
            </p>
            <ul>
              <li><strong>Session cookies</strong> — Deleted when you close your browser</li>
              <li><strong>Persistent cookies</strong> — Up to 12 months</li>
              <li><strong>Analytics data</strong> — Anonymised after 26 months</li>
            </ul>

            <h2>Australian Privacy Principles</h2>
            <p>
              Our use of cookies complies with the Australian Privacy Principles (APPs) under the Privacy Act 1988.
              For more information about how we handle your personal information, please see our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>

            <h2>Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for legal
              reasons. We will notify you of any material changes by posting the new policy on this page.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us at{" "}
              <a href="mailto:privacy@instantmed.com.au" className="text-primary hover:underline">
                privacy@instantmed.com.au
              </a>
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
