import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  Check, 
  Shield, 
  BadgeCheck,
  FileCheck,
  Building2,
  Scale,
  HelpCircle
} from 'lucide-react'
import { BreadcrumbSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: "Are Online Medical Certificates Valid? | Employer Acceptance | InstantMed",
  description: "Yes, online medical certificates from AHPRA-registered doctors are legally valid and accepted by all Australian employers. Learn what makes a certificate legitimate.",
  openGraph: {
    title: "Are Online Medical Certificates Valid? | InstantMed",
    description: "Online medical certificates from registered doctors are legally valid for Australian employers.",
    type: 'website',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/medical-certificates/employer-acceptance',
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
          { name: 'Home', url: 'https://instantmed.com.au' },
          { name: 'Medical Certificates', url: 'https://instantmed.com.au/medical-certificates' },
          { name: 'Employer Acceptance', url: 'https://instantmed.com.au/medical-certificates/employer-acceptance' }
        ]} 
      />
      <FAQSchema faqs={faqs} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Common Question</span>
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

          {/* What Makes It Valid */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-4">What makes a certificate legitimate</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Our certificates meet all legal requirements for Australian employers.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
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

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
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

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
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

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
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

              <div className="p-6 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
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
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What your certificate includes</h2>
              <p className="text-center text-muted-foreground mb-10">
                Every certificate contains the information employers need.
              </p>

              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-white/50 dark:border-white/10 p-6 space-y-4">
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
                <div className="p-5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
                  <h3 className="font-semibold mb-2">Point to the doctor&apos;s credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    The certificate includes the doctor&apos;s AHPRA registration number. Anyone can verify this is a real, 
                    registered doctor by searching the AHPRA register at ahpra.gov.au.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
                  <h3 className="font-semibold mb-2">Telehealth is recognised healthcare</h3>
                  <p className="text-sm text-muted-foreground">
                    The Medical Board of Australia and Medicare both recognise telehealth consultations. 
                    Certificates from telehealth are no less valid than those from in-person visits.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
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
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-emerald-50 dark:bg-emerald-900/20">
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
                <Link href="/medical-certificates/work" className="text-emerald-600 hover:underline">
                  Certificates for work
                </Link>
                {' • '}
                <Link href="/medical-certificates/study" className="text-emerald-600 hover:underline">
                  Certificates for study
                </Link>
                {' • '}
                <Link href="/medical-certificates" className="text-emerald-600 hover:underline">
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
