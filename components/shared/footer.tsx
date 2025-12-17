import Link from "next/link"
import { FileText, Pill, Mail, Zap, Heart, Shield, Scale } from "lucide-react"
import { RotatingReviews } from "@/components/homepage/dynamic-social-proof"

export function Footer() {
  return (
    <footer className="border-t bg-muted/30" role="contentinfo">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="space-y-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="InstantMed home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-base font-semibold">InstantMed</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Medical certificates & prescriptions — handled online, no phone call needed.
            </p>
            <div className="pt-3">
              <RotatingReviews />
            </div>
          </div>

          {/* Services */}
          <nav className="space-y-3" aria-label="Services">
            <h3 className="text-sm font-semibold">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/medical-certificate/request"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Medical Certificates
                </Link>
              </li>
              <li>
                <Link
                  href="/prescriptions/request"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pill className="h-4 w-4" aria-hidden="true" />
                  Prescriptions
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="space-y-3" aria-label="Health Programs">
            <h3 className="text-sm font-semibold">Health Programs</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/womens-health"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Heart className="h-4 w-4 text-pink-500" aria-hidden="true" />
                  Women's Health
                </Link>
              </li>
              <li>
                <Link
                  href="/mens-health"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Shield className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  Men's Health
                </Link>
              </li>
              <li>
                <Link
                  href="/weight-loss"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Scale className="h-4 w-4 text-[#00E2B5]" aria-hidden="true" />
                  Weight Loss
                </Link>
              </li>
            </ul>
          </nav>

          {/* Company */}
          <nav className="space-y-3" aria-label="Company">
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Why Trust Us
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} InstantMed. All rights reserved.
            </p>
            <Link
              href="/admin"
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Admin
            </Link>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right max-w-sm">
            Reviewed by AHPRA-registered Australian doctors. Medicare card required.
          </p>
        </div>
      </div>
    </footer>
  )
}
