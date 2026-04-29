import { Mail, Phone } from "lucide-react"
import Link from "next/link"

import { StripeBadge } from "@/components/checkout/trust-badges"
import { DoctorSignatureView } from "@/components/marketing/doctor-signature"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { BrandLogo } from "@/components/shared/brand-logo"
import { TrustBadgeRow } from '@/components/shared/trust-badge'
import { MEDICAL_DIRECTOR_SIGNATURE } from "@/lib/brand/doctor-signature"
import { ABN, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants"
import { footerLinks } from "@/lib/marketing/homepage"

interface FooterProps {
  variant?: "marketing" | "minimal"
}

export function Footer({ variant = "marketing" }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const isMarketing = variant === "marketing"

  return (
    <footer className="mt-6 mb-4 px-4 max-w-5xl mx-auto" role="contentinfo">
      {/* Main card */}
      <div className="bg-white dark:bg-card rounded-3xl px-5 sm:px-8 py-7 sm:py-9 border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Brand + Contact */}
          <div className="md:w-[200px] shrink-0">
            <BrandLogo size="md" />
            <p className="text-muted-foreground text-sm mt-3 leading-snug">
              See a doctor from bed. Most requests reviewed within 1–2 hours.
            </p>
            {isMarketing && (
              <div className="flex flex-col gap-1.5 mt-3 text-xs text-muted-foreground">
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="w-3 h-3 shrink-0" />
                  {CONTACT_EMAIL}
                </a>
                <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Phone className="w-3 h-3 shrink-0" />
                  {CONTACT_PHONE}
                </a>
              </div>
            )}
            {!isMarketing && (
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-3 h-3 shrink-0" />
                {CONTACT_PHONE}
              </a>
            )}
            {/* Signature brand device #2 (docs/BRAND.md §6.2). Mark-only on
                marketing surfaces per CLAUDE.md identity rule (no individual
                doctor names on marketing pages). Logo-adjacent placement. */}
            {isMarketing && (
              <div className="mt-5 pt-4 border-t border-border/40">
                <DoctorSignatureView data={MEDICAL_DIRECTOR_SIGNATURE} variant="mark" size="sm" />
                <p className="mt-1.5 text-[10px] text-muted-foreground/80 italic leading-snug">
                  Reviewed by your InstantMed doctor.
                </p>
              </div>
            )}
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-5 md:gap-x-8">
            <nav aria-label="Services">
              <p aria-hidden="true" className="uppercase text-[10px] text-muted-foreground font-semibold tracking-wider mb-2">Services</p>
              <div className="flex flex-col gap-1.5">
                {footerLinks.services.map((link) => (
                  <Link key={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            <nav aria-label="Company">
              <p aria-hidden="true" className="uppercase text-[10px] text-muted-foreground font-semibold tracking-wider mb-2">Company</p>
              <div className="flex flex-col gap-1.5">
                {footerLinks.company.map((link) => (
                  <Link key={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Certifications + trust badges (marketing only) */}
      {isMarketing && (
        <div className="py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mb-3">
            <StripeBadge variant="powered-by" />
            <span className="hidden sm:block h-5 w-px bg-border/50" aria-hidden="true" />
            <LegitScriptSeal size="sm" />
            <span className="hidden sm:block h-5 w-px bg-border/50" aria-hidden="true" />
            <GoogleAdsCert size="sm" />
          </div>
          <TrustBadgeRow preset="footer" className="text-xs" />
        </div>
      )}

      {/* Disclaimer (marketing only) */}
      {isMarketing && (
        <div className="px-1 mb-3 text-[10px] text-muted-foreground">
          <p>
            <strong className="text-muted-foreground/80">Important:</strong> Online assessment is not suitable for medical emergencies.
            If you are experiencing a medical emergency, call <strong className="text-muted-foreground">000</strong> immediately.
          </p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="px-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-[10px] text-muted-foreground">
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
          <p className="whitespace-nowrap">
            &copy; {currentYear} {COMPANY_NAME}. All rights reserved.
          </p>
          <div className="flex flex-row flex-wrap gap-x-2.5 gap-y-1">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-foreground transition-colors">Refund</Link>
            <Link href="/complaints" className="hover:text-foreground transition-colors">Complaints</Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">Trust & Safety</Link>
          </div>
        </div>
        <p className="whitespace-nowrap">ABN: {ABN}</p>
      </div>
    </footer>
  )
}
