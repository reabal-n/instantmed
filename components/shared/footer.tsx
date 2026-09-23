import { ChevronDown, Mail, Phone } from "lucide-react"
import Link from "next/link"

import { StripeBadge } from "@/components/checkout/trust-badges"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { BrandLogo } from "@/components/shared/brand-logo"
import { ThemeSwitch } from "@/components/shared/navbar/theme-switch"
import { ABN, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/constants"
import { footerLinks } from "@/lib/marketing/homepage"
import { BADGE_REGISTRY } from "@/lib/marketing/trust-badges"

const LEGAL_LINKS = [
  ["Privacy", "/privacy"], ["Terms", "/terms"], ["Refund", "/refund-policy"],
  ["Complaints", "/complaints"], ["Trust & Safety", "/trust"], ["Site map", "/sitemap-html"],
] as const
const linkClass = "inline-flex min-h-12 items-center rounded-md py-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"

export function Footer({ variant = "marketing" }: { variant?: "marketing" | "minimal" }) {
  const isMarketing = variant === "marketing"
  return (
    <footer className="mx-auto mt-8 max-w-5xl px-4 pb-6 sm:px-6" role="contentinfo">
      <div data-nosnippet="" className="rounded-2xl border border-border/50 bg-white px-5 py-6 shadow-sm shadow-primary/[0.04] dark:bg-card dark:shadow-none sm:p-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-6">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <BrandLogo size="md" />
            <p className="mt-3 text-base text-muted-foreground">Telehealth without the small talk.</p>
            <div className="mt-3"><a href={`mailto:${CONTACT_EMAIL}`} className={`${linkClass} max-w-full gap-2 [overflow-wrap:anywhere]`}><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{CONTACT_EMAIL}</a></div>
            <div><a href={`tel:${CONTACT_PHONE_TEL}`} className={`${linkClass} gap-2`}><Phone className="h-4 w-4 shrink-0" aria-hidden="true" />{CONTACT_PHONE}</a></div>
            <p className="text-sm text-muted-foreground">24/7 voice message support</p>
          </div>
          {[{ title: 'Help', label: 'Helpful links', links: footerLinks.help }, { title: 'About', label: 'About InstantMed', links: footerLinks.company }].map(group => (
            <nav key={group.title} aria-label={group.label}>
              <p className="mb-2 text-sm font-semibold text-foreground">{group.title}</p>
              <ul>{group.links.map(link => <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <details className="group mt-6 border-t border-border/50 pt-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-md text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">Explore services<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
          <nav aria-label="Services"><ul className="grid gap-x-6 pb-2 sm:grid-cols-2 lg:grid-cols-3">{footerLinks.services.map(link => <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>)}</ul></nav>
        </details>
      </div>
      {isMarketing && <div data-nosnippet="" className="py-6 sm:py-8">
        <div aria-label="Payments and certifications" className="mx-auto grid max-w-2xl grid-cols-2 items-center justify-items-center gap-x-6 gap-y-4 sm:grid-cols-[1fr_auto_1.5fr] sm:gap-10">
          <StripeBadge variant="powered-by" />
          <LegitScriptSeal size="md" />
          <div className="col-span-2 sm:col-span-1"><GoogleAdsCert size="md" /></div>
        </div>
        <ul aria-label="Service reassurance" className="mt-6 flex flex-col items-center justify-center gap-x-6 gap-y-3 sm:flex-row sm:flex-wrap">
          {(['ahpra', 'refund', 'privacy'] as const).map(id => {
            const badge = BADGE_REGISTRY[id]
            const Icon = badge.icon
            return <li key={id} className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{badge.label}</li>
          })}
        </ul>
      </div>}
      {isMarketing && <p data-nosnippet="" className="border-t border-border/50 py-5 text-sm leading-6 text-muted-foreground"><strong className="font-medium text-foreground">Medical emergency?</strong> Online assessment is not suitable for medical emergencies. If you are experiencing a medical emergency, call <strong>000</strong> immediately.</p>}
      <div data-nosnippet="" className="border-t border-border/50 pt-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-x-4"><nav aria-label="Legal"><ul className="flex flex-wrap gap-x-4">{LEGAL_LINKS.map(([label, href]) => <li key={href}><Link className={linkClass} href={href}>{label}</Link></li>)}</ul></nav><ThemeSwitch /></div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-2"><p>&copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p><p className="whitespace-nowrap">ABN: {ABN}</p></div>
      </div>
    </footer>
  )
}
