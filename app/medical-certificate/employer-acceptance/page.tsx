import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { Button } from '@/components/ui/button'
import { SectionPill } from '@/components/ui/section-pill'
import {
  ArrowRight,
  Check,
  Shield,
  BadgeCheck,
  FileCheck,
  Building2,
  Scale,
  Star,
} from 'lucide-react'
import { BreadcrumbSchema, FAQSchema } from '@/components/seo/healthcare-schema'

const baseUrl = 'https://instantmed.com.au'

const employerLogos = [
  { name: 'Woolworths', src: '/logos/woolworths.png', width: 90, maxWidth: 90 },
  { name: 'Coles', src: '/logos/coles.png', width: 70, maxWidth: 70 },
  { name: 'Telstra', src: '/logos/telstra.png', width: 80, maxWidth: 80 },
  { name: 'Commonwealth Bank', src: '/logos/commonwealthbank.png', width: 50, maxWidth: 50 },
  { name: 'ANZ', src: '/logos/ANZ.png', width: 60, maxWidth: 60 },
  { name: 'Westpac', src: '/logos/westpac.png', width: 80, maxWidth: 80 },
  { name: 'NAB', src: '/logos/nab.png', width: 60, maxWidth: 60 },
  { name: 'Amazon', src: '/logos/amazon.png', width: 90, maxWidth: 90 },
  { name: 'BHP', src: '/logos/BHP.png', width: 60, maxWidth: 60 },
  { name: 'Bunnings', src: '/logos/bunnings.png', width: 90, maxWidth: 90 },
  { name: 'JB Hi-Fi', src: '/logos/jbhifi.png', width: 70, maxWidth: 70 },
  { name: "McDonald's", src: '/logos/mcdonalds.png', width: 40, maxWidth: 40 },
  { name: 'Sonic Healthcare', src: '/logos/sonichealthcare.png', width: 110, maxWidth: 110 },
]

export const metadata: Metadata = {
  title: "Are Online Medical Certificates Valid? | Employer Acceptance",
  description: "Yes, online medical certificates from AHPRA-registered doctors are legally valid and accepted by all Australian employers. Learn what makes a certificate legitimate.",
  openGraph: {
    title: "Are Online Medical Certificates Valid? | InstantMed",
    description: "Online medical certificates from registered doctors are legally valid for Australian employers.",
    type: 'website',
    url: `${baseUrl}/medical-certificate/employer-acceptance`,
  },
  alternates: {
    canonical: `${baseUrl}/medical-certificate/employer-acceptance`,
  },
}

const faqs = [
  {
    question: "Are online medical certificates legally valid in Australia?",
    answer: "Yes. Medical certificates issued by AHPRA-registered doctors via telehealth are legally equivalent to in-person certificates. The Medical Board of Australia recognises telehealth consultations as a legitimate form of healthcare delivery.",
  },
  {
    question: "What makes a medical certificate valid for employers?",
    answer: "A valid certificate must be issued by a registered medical practitioner and include: the doctor's name, their AHPRA registration or provider number, the dates the patient was unfit for work, and the doctor's signature. InstantMed certificates include all of these.",
  },
  {
    question: "Can my employer refuse an online medical certificate?",
    answer: "Under the Fair Work Act, employers must accept reasonable evidence of illness. A certificate from an AHPRA-registered doctor meets this standard. If an employer has specific policies, they must communicate these in advance.",
  },
  {
    question: "What if my employer questions the certificate?",
    answer: "You can point out that the certificate includes the doctor's AHPRA registration and provider number, which can be verified. Our doctors are all registered with the Australian Health Practitioner Regulation Agency.",
  },
  {
    question: "Is the doctor's provider number on the certificate?",
    answer: "Yes. Every certificate includes the doctor's name, signature, AHPRA registration, and Medicare provider number. This allows employers to verify the certificate if needed.",
  },
]

export default function EmployerAcceptancePage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: baseUrl },
          { name: 'Medical Certificate', url: `${baseUrl}/medical-certificate` },
          { name: 'Employer Acceptance', url: `${baseUrl}/medical-certificate/employer-acceptance` }
        ]}
      />
      <FAQSchema faqs={faqs} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6">
                <SectionPill>Common Question</SectionPill>
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Yes, your employer will accept this
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Online medical certificates from AHPRA-registered doctors are legally valid
                and accepted by all Australian employers. Here&apos;s why.
              </p>
            </div>
          </section>

          {/* Employer Logos */}
          <section className="px-4 py-12 border-b border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <p className="text-xs font-medium text-muted-foreground/60 text-center mb-8 uppercase tracking-widest">
                Accepted by Australia&apos;s leading employers
              </p>
              <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                {employerLogos.map((logo) => (
                  <div key={logo.name} className="flex items-center justify-center rounded-lg bg-white dark:bg-white/90 border border-border/30 dark:border-transparent px-3 py-2 shadow-sm">
                    <Image
                      src={logo.src}
                      alt={logo.name}
                      width={logo.width}
                      height={32}

                      style={{ maxWidth: logo.maxWidth }}
                      className="h-7 w-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What Makes It Valid */}
          <section className="px-4 py-16 bg-card/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-4">What makes a certificate legitimate</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Our certificates meet all legal requirements for Australian employers.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-xl bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">AHPRA Registered Doctor</h3>
                      <p className="text-sm text-muted-foreground">
                        Every certificate is issued by a doctor registered with the Australian Health Practitioner Regulation Agency. Their registration number is included on the certificate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Medicare Provider Number</h3>
                      <p className="text-sm text-muted-foreground">
                        The doctor&apos;s Medicare provider number is printed on every certificate. This is a unique identifier that can be verified.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Australian-Based Practice</h3>
                      <p className="text-sm text-muted-foreground">
                        Our doctors and operations are 100% based in Australia. We&apos;re not an offshore service or certificate mill.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Doctor&apos;s Signature</h3>
                      <p className="text-sm text-muted-foreground">
                        Each certificate includes the doctor&apos;s digital signature, name, and the date of issue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Fair Work Context */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What the Fair Work Act says</h2>
              <p className="text-center text-muted-foreground mb-10">
                Australian workplace law supports the use of medical certificates from registered practitioners.
              </p>

              <div className="p-6 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-xl border border-border/40 dark:border-white/10">
                <div className="flex items-start gap-4">
                  <Scale className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                  <div className="space-y-4">
                    <p className="text-sm">
                      Under the <strong>Fair Work Act 2009</strong>, employees are entitled to paid personal/carer&apos;s leave.
                      Employers may request evidence of illness, but must accept &quot;reasonable evidence&quot; such as a
                      medical certificate from a registered health practitioner.
                    </p>
                    <p className="text-sm">
                      A certificate from an AHPRA-registered doctor — whether issued in-person or via telehealth —
                      meets this standard. The <strong>Medical Board of Australia</strong> recognises telehealth as a
                      legitimate mode of healthcare delivery.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Note: This is general information, not legal advice. Specific workplace policies may vary.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Certificate Preview */}
          <section className="px-4 py-16 bg-card/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What your certificate includes</h2>
              <p className="text-center text-muted-foreground mb-10">
                Every certificate contains the information employers need.
              </p>

              <div className="bg-card/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-border/50 dark:border-white/10 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Patient&apos;s full name</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Dates the patient was unfit for work</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Doctor&apos;s full name and signature</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">AHPRA registration number</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Medicare provider number</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Date of issue</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Practice contact details</span>
                </div>
              </div>
            </div>
          </section>

          {/* What To Say */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">If your employer questions it</h2>
              <p className="text-center text-muted-foreground mb-10">
                Most employers accept online certificates without issue. If questions arise, here&apos;s what to know.
              </p>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-xl border border-border/40 dark:border-white/10">
                  <h3 className="font-semibold mb-2">Point to the doctor&apos;s credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    The certificate includes the doctor&apos;s AHPRA registration number. Anyone can verify this is a real,
                    registered doctor by searching the AHPRA register at ahpra.gov.au.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-xl border border-border/40 dark:border-white/10">
                  <h3 className="font-semibold mb-2">Telehealth is recognised healthcare</h3>
                  <p className="text-sm text-muted-foreground">
                    The Medical Board of Australia and Medicare both recognise telehealth consultations.
                    Certificates from telehealth are no less valid than those from in-person visits.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-xl border border-border/40 dark:border-white/10">
                  <h3 className="font-semibold mb-2">Check workplace policy timing</h3>
                  <p className="text-sm text-muted-foreground">
                    If an employer has specific requirements about medical certificates, they must communicate
                    these in advance — not after you&apos;ve submitted evidence.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-16 bg-card/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-2">Accepted without question</h2>
              <p className="text-center text-muted-foreground text-sm mb-10">
                What employees say after submitting their InstantMed certificate.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: "Sarah M.", location: "Bondi, NSW", text: "Woke up with gastro at 6am, had my cert by 8:30. HR didn't question it.", rating: 5 },
                  { name: "Tom H.", location: "Carlton, VIC", text: "The doctor asked follow-up questions which made it feel legit. Uni accepted it for special consideration straight away.", rating: 5 },
                  { name: "Nick B.", location: "Pyrmont, NSW", text: "Cert in my inbox by 7am, submitted to work by 7:15. No back and forth, no issues.", rating: 5 },
                  { name: "Michelle T.", location: "Paddington, QLD", text: "Half expected a rubber stamp. It wasn't — the form asked proper questions and my employer accepted it immediately.", rating: 5 },
                ].map((t) => (
                  <div key={t.name} className="p-5 rounded-xl bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10 space-y-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-emerald-50 dark:bg-emerald-950/30">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to get your certificate?</h2>
              <p className="text-muted-foreground mb-8">
                Complete the questionnaire in about 2 minutes. A doctor reviews your request within an hour.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8"
              >
                <Link href="/request?service=med-cert">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">$19.95 • Refund if we can&apos;t help</p>
            </div>
          </section>

          {/* Related Links */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/medical-certificate/work" className="text-emerald-600 hover:underline">
                  Certificates for work
                </Link>
                {' • '}
                <Link href="/medical-certificate/study" className="text-emerald-600 hover:underline">
                  Certificates for study
                </Link>
                {' • '}
                <Link href="/medical-certificate" className="text-emerald-600 hover:underline">
                  All certificate types
                </Link>
              </p>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
