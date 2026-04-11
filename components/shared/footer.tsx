import Link from "next/link"
import { BrandLogo } from "@/components/shared/brand-logo"
import { FooterAuth } from "@/components/shared/footer-auth"
import { StripeBadge } from "@/components/checkout/trust-badges"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { MapPin, Mail, Phone } from "lucide-react"
import { TrustBadgeRow } from '@/components/shared/trust-badge'
import { footerLinks } from "@/lib/marketing/homepage"
import { CONTACT_EMAIL, CONTACT_EMAIL_COMPLAINTS, CONTACT_PHONE, COMPANY_NAME, COMPANY_ADDRESS_SHORT, ABN } from "@/lib/constants"

const TapeDecoration = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="95" height="80" viewBox="0 0 95 80" fill="none" className="w-20 h-auto">
    <path d="M1 45L70.282 5L88.282 36.1769L19 76.1769L1 45Z" fill="currentColor" className="text-border/60 dark:text-border/40"/>
    <path d="M69.6829 39.997C74.772 36.9233 80.2799 35.022 85.4464 32.0415C85.5584 31.9769 85.6703 31.912 85.782 31.8468L83.9519 38.6769C80.2833 32.3886 75.7064 26.4975 72.2275 20.0846C70.0007 15.9783 67.7966 11.8425 65.6183 7.69261L72.9746 9.66373C70.566 10.9281 68.1526 12.1837 65.7375 13.4301C59.1543 16.828 52.5477 20.1634 45.9059 23.4675C39.2779 26.7637 32.6138 30.0293 25.946 33.2683C21.417 35.4683 16.8774 37.6611 12.3408 39.8468C10.3494 40.8065 8.36335 41.7623 6.37228 42.7203C4.88674 43.4348 3.40117 44.1492 1.91563 44.8637C1.70897 44.9628 1.48389 45.0108 1.28779 44.994C1.0916 44.977 0.940536 44.8975 0.866099 44.7681C0.791689 44.6386 0.798739 44.4674 0.882816 44.289C0.966978 44.111 1.12195 43.9408 1.31146 43.8119C2.68692 42.8791 4.06239 41.9462 5.43785 41.0134C6.96571 39.9774 8.49068 38.9427 10.0185 37.9078C10.5758 38.2934 11.1526 38.4968 11.9006 38.3019C12.2823 38.2024 12.7844 37.9628 13.0812 37.66C13.3477 37.388 13.4958 37.092 13.6361 36.8103C13.7828 36.5157 13.922 36.236 14.1819 36.0157C14.6227 35.6416 14.9608 35.1461 15.3159 34.6256C15.4451 34.4362 15.5766 34.2432 15.7162 34.0517C17.1755 33.0653 18.6355 32.0797 20.0958 31.0952L69.6829 39.997Z" fill="currentColor" className="text-border/60 dark:text-border/40"/>
  </svg>
)


interface FooterProps {
  variant?: "marketing" | "minimal"
}

export function Footer({ variant = "marketing" }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const isMarketing = variant === "marketing"

  return (
    <footer className="mt-6 mb-4 px-4 max-w-5xl mx-auto" role="contentinfo">
      {/* Main card */}
      <div className="relative bg-white dark:bg-card rounded-3xl px-5 sm:px-8 py-8 sm:py-10 border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none">
        {/* Tape decorations — desktop only */}
        <div className="hidden md:block absolute -top-4 -left-8 scale-75 -rotate-12">
          <TapeDecoration />
        </div>
        <div className="hidden md:block absolute -top-4 -right-8 rotate-78 scale-75">
          <TapeDecoration />
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Brand + Contact */}
          <div className="md:w-[220px] shrink-0">
            <BrandLogo size="md" />
            <p className="text-muted-foreground text-sm mt-3 leading-snug">
              See a doctor from bed. Most requests reviewed within 1–2 hours.
            </p>
            {isMarketing && (
              <div className="flex flex-col gap-1 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{COMPANY_ADDRESS_SHORT}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 shrink-0" />
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground transition-colors">{CONTACT_EMAIL}</a>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 shrink-0" />
                  <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="hover:text-foreground transition-colors">{CONTACT_PHONE}</a>
                </div>
              </div>
            )}
            {!isMarketing && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Phone className="w-3 h-3 shrink-0" />
                <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="hover:text-foreground transition-colors">{CONTACT_PHONE}</a>
              </div>
            )}
          </div>

          {/* Link columns — 2-col on mobile, 4-col on desktop */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 md:gap-x-8">
            <nav aria-label="Services">
              <p aria-hidden="true" className="uppercase text-[10px] text-muted-foreground/70 font-semibold tracking-wider mb-2">Services</p>
              <div className="flex flex-col gap-1.5">
                {footerLinks.services.map((link) => (
                  <Link key={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            <nav aria-label="Company">
              <p aria-hidden="true" className="uppercase text-[10px] text-muted-foreground/70 font-semibold tracking-wider mb-2">Company</p>
              <div className="flex flex-col gap-1.5">
                {footerLinks.company.map((link) => (
                  <Link key={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            {isMarketing && (
              <nav aria-label="Resources">
                <p aria-hidden="true" className="uppercase text-[10px] text-muted-foreground/70 font-semibold tracking-wider mb-2">Resources</p>
                <div className="flex flex-col gap-1.5">
                  {footerLinks.resources.map((link) => (
                    <Link key={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            )}

            {isMarketing && (
              <nav aria-label="Legal">
                <p aria-hidden="true" className="uppercase text-[10px] text-muted-foreground/70 font-semibold tracking-wider mb-2">Legal</p>
                <div className="flex flex-col gap-1.5">
                  {footerLinks.legal.map((link) => (
                    <Link key={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors" href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </div>

        {/* Complaints — below grid, separated */}
        {isMarketing && (
          <div className="mt-5 pt-4 border-t border-border/30 text-xs text-muted-foreground/70">
            Complaints: <a href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`} className="hover:text-foreground transition-colors">{CONTACT_EMAIL_COMPLAINTS}</a>
          </div>
        )}
      </div>

      {/* Trust badges (marketing only) */}
      {isMarketing && (
        <div className="py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-3">
            <StripeBadge variant="powered-by" />
            <div className="hidden sm:block h-6 w-px bg-border/50" aria-hidden="true" />
            <LegitScriptSeal size="sm" />
            <div className="hidden sm:block h-6 w-px bg-border/50" aria-hidden="true" />
            <GoogleAdsCert size="sm" />
          </div>
          <TrustBadgeRow preset="footer" className="text-xs" />
        </div>
      )}

      {/* Disclaimer (marketing only) */}
      {isMarketing && (
        <div className="px-1 mb-3 text-xs text-muted-foreground/70">
          <p>
            <strong className="text-muted-foreground">Important:</strong> Online assessment is not suitable for medical emergencies.
            If you are experiencing a medical emergency, call <strong className="text-foreground">000</strong> immediately.
          </p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="px-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-foreground">
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 items-start sm:items-center">
          <p className="whitespace-nowrap">
            &copy; {currentYear} {COMPANY_NAME}. All rights reserved.
          </p>
          <div className="flex flex-row gap-3">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
            <FooterAuth />
          </div>
        </div>
        <p className="text-muted-foreground/70">
          Operating since 2025 &middot; ABN: {ABN}
        </p>
      </div>
    </footer>
  )
}
