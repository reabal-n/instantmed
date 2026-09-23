"use client"

import Link from "next/link"

import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { InformationalPageShell } from "@/components/marketing/shared/informational-page-shell"
import { FAQSection } from "@/components/sections/faq-section"
import { Heading } from "@/components/ui/heading"
import { commercialCertificateLinks, commercialComparisonLinks,commercialPrescriptionLinks } from "@/lib/seo/commercial-links"

interface HowItWorksContentProps {
  faqs: Array<{ question: string; answer: string }>
  processSteps: Array<{ title: string; description: string }>
}

export function HowItWorksContent({ faqs, processSteps }: HowItWorksContentProps) {
  return <InformationalPageShell config={{ analyticsId: "how-it-works", sticky: false }}>
    {() => <>
      <header className="mx-auto max-w-5xl px-4 pt-28 pb-6 sm:px-6 sm:pt-36">
        <Heading level="h1">From your form to your next step.</Heading>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">Choose a service, tell us what you need and receive your outcome online. For adults in Australia. No appointment to book.</p>
      </header>
      <HowItWorksInline heading="How InstantMed works" subheading="Every service starts with a secure form. What happens next depends on your request."
        steps={processSteps.map((step, i) => ({ ...step, step: i + 1, sticker: "checklist", time: ["Start online", "Timing varies", "Digital delivery"][i] }))}
        ctaHref="/request" ctaText="Choose a service" revealInstant />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Heading level="h2">What you receive</Heading>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {[
            { title: "Medical certificates", href: "/medical-certificate", text: "If approved, an email links to your downloadable PDF certificate. It confirms your absence dates without listing your diagnosis." },
            { title: "Repeat prescriptions", href: "/prescriptions", text: "If the doctor prescribes, your eScript is sent by SMS. Take the token to your preferred pharmacy. Medication costs are separate." },
            { title: "Specialty assessments", href: "/consult", text: "A doctor reviews your form and may contact you for more information. You receive an outcome and an eScript if prescribed, or guidance on more suitable care." },
          ].map(item => <div key={item.href} className="border-t border-border/60 pt-5"><h3 className="text-xl font-semibold">{item.title}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{item.text}</p><Link href={item.href} className="mt-3 inline-flex min-h-12 items-center text-primary hover:underline">View {item.title.toLowerCase()}</Link></div>)}
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="max-w-2xl border-l-2 border-primary/30 pl-5"><Heading level="h2">When online care isn’t the right fit</Heading><p className="mt-3 leading-relaxed text-muted-foreground">These are focused, one-off services. Urgent symptoms, a physical examination and complex ongoing care need an appropriate in-person service. A request does not guarantee a certificate or prescription.</p><Link href="/what-we-wont-do" className="mt-2 inline-flex min-h-12 items-center text-primary hover:underline">Read our service boundaries</Link></div>
      </section>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <details className="border-y border-border/60 py-2">
          <summary className="flex min-h-12 cursor-pointer items-center text-base font-medium">More service guidance and comparisons</summary>
          <nav aria-label="Service guidance" className="grid gap-6 py-4 sm:grid-cols-3">
            {[{ title: "Certificates", links: commercialCertificateLinks }, { title: "Prescriptions", links: commercialPrescriptionLinks }, { title: "Compare your options", links: commercialComparisonLinks }].map(group => <div key={group.title}><h2 className="mb-2 font-semibold">{group.title}</h2><ul>{group.links.map(link => <li key={link.href}><Link href={link.href} className="inline-flex min-h-12 items-center text-sm text-muted-foreground hover:text-primary">{link.label}</Link></li>)}</ul></div>)}
          </nav>
        </details>
      </div>
      <FAQSection title="Questions before you start" items={faqs} />
    </>}
  </InformationalPageShell>
}
