import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { Button } from '@heroui/react'
import { 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Clock, 
  Shield, 
  BadgeCheck,
  Briefcase,
  FileCheck,
  Stethoscope,
  MessageCircle,
  Building2,
} from 'lucide-react'
import { BreadcrumbSchema, MedicalServiceSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: 'Medical Certificate for Work | Sick Note',
  description: 'Valid medical certificate for work absence from AHPRA-registered doctors. Accepted by all Australian employers. Sorted in under an hour.',
  openGraph: {
    title: 'Medical Certificate for Work | InstantMed',
    description: 'Valid sick certificate for your employer. Reviewed by a doctor, delivered to your email.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/medical-certificates/work',
  },
}

const faqs = [
  {
    question: 'Will my employer accept an online medical certificate?',
    answer: 'Yes. Our certificates are issued by AHPRA-registered Australian doctors and include all required details: doctor\'s name, provider number, dates of illness, and signature. They are legally valid and accepted by all Australian employers.',
  },
  {
    question: 'Can I get a certificate for a day I\'ve already missed?',
    answer: 'Yes. We can issue certificates for absences up to 48 hours ago if clinically appropriate. Just indicate the dates you were unwell when completing the questionnaire.',
  },
  {
    question: 'Does the certificate say what I was sick with?',
    answer: 'By default, certificates state "medical condition" without specific diagnosis details, protecting your privacy. If your employer requires more detail, let us know.',
  },
  {
    question: 'How long can a certificate cover?',
    answer: 'Most work certificates cover 1-3 days for acute illness. The doctor determines the appropriate duration based on your symptoms.',
  },
  {
    question: 'What if I need to extend my certificate?',
    answer: 'If you\'re still unwell after your initial certificate period, submit a new request. Mention you\'re extending a previous certificate.',
  },
]

export default function WorkMedCertPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: 'Home', url: 'https://instantmed.com.au' },
          { name: 'Medical Certificates', url: 'https://instantmed.com.au/medical-certificates' },
          { name: 'Work', url: 'https://instantmed.com.au/medical-certificates/work' }
        ]} 
      />
      <MedicalServiceSchema 
        name="Medical Certificate for Work"
        description="Valid medical certificate for work absence, reviewed by AHPRA-registered Australian doctors."
        price="19.95"
      />
      <FAQSchema faqs={faqs} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Work Absence</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Medical certificate for work
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Valid certificate for your employer. Reviewed by a doctor, not an algorithm. 
                Most requests sorted in under an hour.
              </p>

              <Button 
                as={Link}
                href="/request?service=med-cert"
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Under 1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  <span>AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>Employer accepted</span>
                </div>
              </div>
            </div>
          </section>

          {/* Who This Is For */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-4">Is this right for you?</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Work certificates are suitable for most short-term illnesses. Here&apos;s what to know.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Short-term illness</h3>
                      <p className="text-sm text-muted-foreground">
                        Cold, flu, gastro, migraine, or other acute conditions that prevent you from working.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Called in sick today</h3>
                      <p className="text-sm text-muted-foreground">
                        Need documentation for today&apos;s absence or the past 48 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Backdating limits</h3>
                      <p className="text-sm text-muted-foreground">
                        Certificates can cover absences up to 48 hours ago. Beyond that, see your GP.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Not for WorkCover</h3>
                      <p className="text-sm text-muted-foreground">
                        Workplace injury claims (WorkCover) or certificates for legal proceedings require in-person assessment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What Happens */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-4">What happens</h2>
              <p className="text-center text-muted-foreground mb-10">
                Three steps. Done from your phone.
              </p>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Answer a few questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your symptoms and the dates you need covered. Takes about 2 minutes.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Doctor reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    An AHPRA-registered GP reviews your request. They may message you if clarification is needed.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Certificate delivered</h3>
                  <p className="text-sm text-muted-foreground">
                    If approved, your certificate is sent as a secure PDF to your email. Ready for your employer.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What Doctors Review */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What the doctor reviews</h2>
              <p className="text-center text-muted-foreground mb-10">
                Every request is reviewed by a real doctor. Here&apos;s what they consider.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <Stethoscope className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Your symptoms</h3>
                    <p className="text-sm text-muted-foreground">
                      The doctor assesses whether your symptoms are consistent with needing time off work.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <Clock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Duration requested</h3>
                    <p className="text-sm text-muted-foreground">
                      They determine if the certificate duration is appropriate for your condition.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Telehealth appropriateness</h3>
                    <p className="text-sm text-muted-foreground">
                      Some conditions require in-person examination. The doctor will let you know if that&apos;s the case.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Approval vs Decline */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-10">What results in approval vs decline</h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-4 flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    We can usually help if...
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>Short-term illness (cold, flu, gastro, migraine)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>Same-day or recent absence (within 48 hours)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>Symptoms that don&apos;t require physical examination</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>1-3 day certificate duration</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    We&apos;ll refer you elsewhere if...
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>WorkCover or workplace injury claim</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Certificate for legal proceedings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Absence more than 48 hours ago</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Symptoms requiring physical examination</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                If we can&apos;t help, you&apos;ll receive a full refund (minus $4.95 admin fee) and an explanation.
              </p>
            </div>
          </section>

          {/* Employer Acceptance */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">Your employer will accept this</h2>
              <p className="text-center text-muted-foreground mb-10">
                Our certificates meet all requirements for Australian employers.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/80 dark:bg-white/5">
                  <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">AHPRA Registered</h3>
                    <p className="text-xs text-muted-foreground">All doctors registered with Australian Health Practitioner Regulation Agency</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/80 dark:bg-white/5">
                  <FileCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Provider Number Included</h3>
                    <p className="text-xs text-muted-foreground">Doctor&apos;s Medicare provider number on every certificate</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/80 dark:bg-white/5">
                  <Building2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Australian-Based</h3>
                    <p className="text-xs text-muted-foreground">Our doctors and team are 100% based in Australia</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/80 dark:bg-white/5">
                  <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Legally Valid</h3>
                    <p className="text-xs text-muted-foreground">Meets Fair Work Act requirements for medical evidence</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
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
                as={Link}
                href="/request?service=med-cert"
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">$19.95 • Refund if we can&apos;t help</p>
            </div>
          </section>

          {/* Related Links */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/medical-certificates/study" className="text-emerald-600 hover:underline">
                  Certificates for study
                </Link>
                {' • '}
                <Link href="/medical-certificates/carers" className="text-emerald-600 hover:underline">
                  Carer&apos;s leave
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
