import { ArrowRight, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { MarketingFooter } from "@/components/marketing"
import { AccordionSection } from "@/components/sections"
import { BreadcrumbSchema, FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { PRICING_DISPLAY } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Telehealth for Your Industry",
  description: "Find out how InstantMed works for your profession. Medical certificates, prescriptions, and consultations tailored for students, nurses, tradies, shift workers, and more.",
  openGraph: {
    title: "Telehealth for Your Industry | InstantMed",
    description: "Medical certificates and consultations tailored for your profession.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for",
  },
}

const audiences = [
  { slug: "students", name: "Students", description: "Medical certificates for uni, TAFE, and school absences" },
  { slug: "tradies", name: "Tradies", description: "Certs and scripts that fit around early starts and site work" },
  { slug: "corporate", name: "Corporate", description: "Telehealth for office professionals and corporate teams" },
  { slug: "shift-workers", name: "Shift Workers", description: "Healthcare access outside standard clinic hours" },
  { slug: "nurses", name: "Nurses & Healthcare", description: "Quick certs and scripts between shifts" },
  { slug: "teachers", name: "Teachers", description: "Medical certificates for school and education staff" },
  { slug: "hospitality", name: "Hospitality", description: "Telehealth for restaurant, bar, and hotel workers" },
  { slug: "retail", name: "Retail Workers", description: "Medical certificates that meet retail award requirements" },
  { slug: "office-workers", name: "Office Workers", description: "Telehealth from your desk - no need to leave the office" },
  { slug: "parents", name: "Parents & Carers", description: "Medical certificates for carer's leave and family responsibilities" },
  { slug: "remote-workers", name: "Remote Workers", description: "Healthcare access from anywhere in Australia" },
  { slug: "gig-workers", name: "Gig Workers", description: "Flexible telehealth for freelancers and contractors" },
  { slug: "employers", name: "Employers", description: "How InstantMed certificates meet workplace requirements" },
]

const audienceFaqs = [
  {
    question: "Do you offer different services for different industries?",
    answer: "The core service is the same for everyone - doctor-reviewed medical certificates, prescriptions, and consultations. What differs is how it fits into your work life. A shift worker and a university student have different schedules and requirements, so we explain what's relevant for each.",
  },
  {
    question: "Can employers use these certificates as sick-leave evidence?",
    answer: "Our medical certificates are issued by AHPRA-registered doctors and include the usual details employers look for. Employer policies can vary, so check your workplace requirements.",
  },
  {
    question: "Is there a discount for students?",
    answer: `Our prices are the same for everyone, starting at ${PRICING_DISPLAY.MED_CERT} for a one-day medical certificate. We keep prices low across the board rather than adding surcharges for some groups and discounts for others.`,
  },
  {
    question: "Can my employer verify my certificate?",
    answer: "Every certificate includes a unique verification ID and the issuing doctor's details. Employers can confirm its authenticity if needed. We take certificate integrity seriously - it protects both you and us.",
  },
  {
    question: "Do you cover carer's leave certificates?",
    answer: "Yes. If you need time off to care for a family member or dependent, an AHPRA-registered doctor can issue a medical certificate for carer's leave where clinically appropriate. This applies to parents, carers, and anyone with caring responsibilities.",
  },
  {
    question: "Is the service available outside business hours?",
    answer: "Medical certificates are available 24/7 - submit at any hour and receive your certificate after doctor approval. Prescriptions and consultations are available 8am–10pm AEST, 7 days including public holidays.",
  },
  {
    question: "Can my company set up a corporate account?",
    answer: "We're working on corporate partnerships for businesses that want streamlined telehealth access for their teams. Get in touch at support@instantmed.com.au if you're interested.",
  },
  {
    question: "Do I need Medicare to use InstantMed?",
    answer: "Medicare isn't required for medical certificates. For prescriptions and consultations, you'll need a valid Medicare card. We don't bulk bill - our service sits outside the Medicare system.",
  },
]

export default function ForPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "For Your Industry", url: "https://instantmed.com.au/for" },
      ]} />
      <FAQSchema faqs={audienceFaqs} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <section className="px-4 py-12 sm:py-16">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                  <Users className="h-4 w-4" />
                  Tailored for your profession
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                  Telehealth for Every Industry
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Whether you work shifts, sit at a desk, or run your own business - InstantMed fits around your schedule.
                  Same doctors, same service, tailored to how you work.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {audiences.map((audience) => (
                  <Link
                    key={audience.slug}
                    href={`/for/${audience.slug}`}
                    className="group p-5 rounded-xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none hover:border-primary/30 transition-[border-color,box-shadow]"
                  >
                    <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {audience.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">{audience.description}</p>
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      Learn more <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>

              {/* FAQ Section */}
              <div className="mt-16">
                <AccordionSection
                  groups={[{ items: audienceFaqs }]}
                  title="Common Questions"
                  subtitle="What people ask before getting started"
                />
              </div>

              <div className="mt-12 text-center">
                <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground">
                  Same service for everyone - from {PRICING_DISPLAY.MED_CERT}
                </p>
              </div>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
