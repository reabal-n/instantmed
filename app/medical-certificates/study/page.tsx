import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { Button } from '@/components/ui/button'
import { SafeHtml } from '@/components/ui/safe-html'
import { 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Clock, 
  Shield, 
  BadgeCheck,
  GraduationCap,
  FileCheck,
  Stethoscope,
  MessageCircle,
  Calendar,
  BookOpen
} from 'lucide-react'
import { BreadcrumbSchema, MedicalServiceSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: 'Medical Certificate for University | Special Consideration',
  description: 'Get a medical certificate for special consideration, deferred exams, or assignment extensions. Accepted by all Australian universities and TAFEs. Most requests sorted in under an hour.',
  openGraph: {
    title: 'Medical Certificate for University | InstantMed',
    description: 'Valid certificate for special consideration. Reviewed by a doctor, delivered to your email.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/medical-certificates/study',
  },
}

const faqs = [
  {
    question: 'Will my university accept an online medical certificate?',
    answer: 'Yes. Our certificates are issued by AHPRA-registered Australian doctors and include all required details: doctor&apos;s name, provider number, dates of illness, and signature. They are accepted by all Australian universities and TAFEs for special consideration.',
  },
  {
    question: 'Can I get a certificate for an exam I already missed?',
    answer: 'Yes. We can issue certificates for absences up to 48 hours ago if clinically appropriate. Just indicate the dates you were unwell when completing the questionnaire.',
  },
  {
    question: 'Does it say what I was sick with?',
    answer: 'By default, certificates state &quot;medical condition&quot; without specific diagnosis details, protecting your privacy. If your university requires more detail for special consideration, let us know.',
  },
  {
    question: 'How long can a certificate cover?',
    answer: 'Most student certificates cover 1-3 days for acute illness. The doctor determines the appropriate duration based on your symptoms.',
  },
  {
    question: 'What does it cost?',
    answer: 'Medical certificates are $19.95 — one flat fee. If your request isn&apos;t approved, you receive a refund minus a small admin fee.',
  },
]

export default function StudyMedCertPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: 'Home', url: 'https://instantmed.com.au' },
          { name: 'Medical Certificates', url: 'https://instantmed.com.au/medical-certificates' },
          { name: 'Study', url: 'https://instantmed.com.au/medical-certificates/study' }
        ]} 
      />
      <MedicalServiceSchema 
        name="Medical Certificate for University"
        description="Valid medical certificate for special consideration, reviewed by AHPRA-registered Australian doctors."
        price="19.95"
      />
      <FAQSchema faqs={faqs} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">University &amp; TAFE</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Medical certificate for special consideration
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Too sick for that exam or assignment? Get your certificate in under an hour. 
                Accepted by all Australian universities and TAFEs.
              </p>

              <Button
                asChild
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
              >
                <Link href="/request?service=med-cert">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>Under 1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-indigo-600" />
                  <span>AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  <span>All unis accept</span>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-10">What you can use it for</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 text-center">
                  <FileCheck className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Special Consideration</h3>
                  <p className="text-sm text-muted-foreground">
                    For exams, assignments, or class attendance affected by illness.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 text-center">
                  <Calendar className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Deferred Exams</h3>
                  <p className="text-sm text-muted-foreground">
                    Medical evidence for exam deferrals and supplementary assessments.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 text-center">
                  <BookOpen className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Assignment Extensions</h3>
                  <p className="text-sm text-muted-foreground">
                    Documentation for late submission without penalty.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* University Acceptance */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold mb-4">Accepted by all Australian universities</h2>
              <p className="text-muted-foreground mb-8">
                Our certificates meet the requirements for special consideration at every Australian university and TAFE.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                {[
                  'University of Sydney',
                  'University of Melbourne',
                  'UNSW',
                  'Monash University',
                  'UQ',
                  'UWA',
                  'ANU',
                  'RMIT',
                  'UTS',
                  'QUT',
                  'All TAFEs',
                ].map((uni) => (
                  <span key={uni} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300">
                    {uni}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* What Happens */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-4">What happens</h2>
              <p className="text-center text-muted-foreground mb-10">
                Three steps. Done from your phone.
              </p>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Answer a few questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your symptoms and the dates you need covered. Takes about 2 minutes.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Doctor reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    An AHPRA-registered GP reviews your request. They may message you if clarification is needed.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Certificate delivered</h3>
                  <p className="text-sm text-muted-foreground">
                    If approved, your certificate is sent as a secure PDF to your email. Ready to submit.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What Doctors Review */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What the doctor reviews</h2>
              <p className="text-center text-muted-foreground mb-10">
                Every request is reviewed by a real doctor. Here&apos;s what they consider.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
                  <Stethoscope className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Your symptoms</h3>
                    <p className="text-sm text-muted-foreground">
                      The doctor assesses whether your symptoms prevented you from attending class or completing assessments.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
                  <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Duration requested</h3>
                    <p className="text-sm text-muted-foreground">
                      They determine if the certificate duration is appropriate for your condition.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
                  <MessageCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
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
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
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
                      <span>Ongoing mental health concerns (see your GP)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Absence more than 48 hours ago</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Long-term certificate needs (chronic conditions)</span>
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

          {/* What Certificate Includes */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What your certificate includes</h2>
              <p className="text-center text-muted-foreground mb-10">
                Everything universities require for special consideration.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/5">
                  <BadgeCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Doctor&apos;s Details</h3>
                    <p className="text-xs text-muted-foreground">Name, signature, and AHPRA registration</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/5">
                  <FileCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Provider Number</h3>
                    <p className="text-xs text-muted-foreground">Medicare provider number on every certificate</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/5">
                  <Calendar className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Dates of Illness</h3>
                    <p className="text-xs text-muted-foreground">Clear statement of when you were unfit to attend</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/5">
                  <Shield className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Privacy Protected</h3>
                    <p className="text-xs text-muted-foreground">No specific diagnosis unless you request it</p>
                  </div>
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
                    <SafeHtml html={faq.answer} className="text-sm text-muted-foreground" as="p" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-indigo-50 dark:bg-indigo-900/20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold mb-4">Get your certificate in under an hour</h2>
              <p className="text-muted-foreground mb-8">
                Don&apos;t miss your special consideration deadline. Get sorted now.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
              >
                <Link href="/request?service=med-cert">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">$19.95 • Accepted by all unis</p>
            </div>
          </section>

          {/* Related Links */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/medical-certificates/work" className="text-indigo-600 hover:underline">
                  Certificates for work
                </Link>
                {' • '}
                <Link href="/medical-certificates/carers" className="text-indigo-600 hover:underline">
                  Carer&apos;s leave
                </Link>
                {' • '}
                <Link href="/medical-certificates" className="text-indigo-600 hover:underline">
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
