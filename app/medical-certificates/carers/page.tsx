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
  Heart,
  FileCheck,
  Stethoscope,
  Users
} from 'lucide-react'
import { BreadcrumbSchema, MedicalServiceSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: "Carer's Leave Certificate | Family Member Illness | InstantMed",
  description: "Get a medical certificate for carer's leave when caring for a sick family member. Reviewed by AHPRA-registered doctors. Most requests sorted in under an hour.",
  openGraph: {
    title: "Carer's Leave Certificate | InstantMed",
    description: "Documentation for carer's leave. Reviewed by a doctor, delivered to your email.",
    type: 'website',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/medical-certificates/carers',
  },
}

const faqs = [
  {
    question: 'What is a carer&apos;s leave certificate?',
    answer: 'A carer&apos;s leave certificate is medical documentation stating that you need to provide care for an immediate family member or household member who is ill or has an unexpected emergency. It&apos;s different from a personal sick note.',
  },
  {
    question: 'Will my employer accept this for carer&apos;s leave?',
    answer: 'Yes. Under the Fair Work Act, employers can request evidence for carer&apos;s leave. Our certificates are issued by AHPRA-registered doctors and meet the requirements for medical evidence.',
  },
  {
    question: 'Who can I take carer&apos;s leave for?',
    answer: 'Immediate family members (spouse, child, parent, grandparent, grandchild, sibling) or household members. The certificate will state you are required to provide care for a family member.',
  },
  {
    question: 'Does the certificate name the person I&apos;m caring for?',
    answer: 'By default, the certificate states that you are required to provide care for an immediate family member. Specific names or diagnoses are not included to protect privacy.',
  },
  {
    question: 'How quickly can I get the certificate?',
    answer: 'Most requests are reviewed within an hour during business hours. The certificate is delivered as a PDF to your email.',
  },
]

export default function CarersMedCertPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: 'Home', url: 'https://instantmed.com.au' },
          { name: 'Medical Certificates', url: 'https://instantmed.com.au/medical-certificates' },
          { name: 'Carer&apos;s Leave', url: 'https://instantmed.com.au/medical-certificates/carers' }
        ]} 
      />
      <MedicalServiceSchema 
        name="Carer&apos;s Leave Certificate"
        description="Medical certificate for carer&apos;s leave when caring for a sick family member."
        price="19.95"
      />
      <FAQSchema faqs={faqs} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 mb-6">
                <Heart className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Carer&apos;s Leave</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Certificate for carer&apos;s leave
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Need to care for a sick family member? Get documentation for your employer 
                in under an hour. Valid for carer&apos;s leave under the Fair Work Act.
              </p>

              <Button 
                as={Link}
                href="/request?service=med-cert"
                size="lg" 
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-8"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-rose-600" />
                  <span>Under 1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-rose-600" />
                  <span>AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-rose-600" />
                  <span>Employer accepted</span>
                </div>
              </div>
            </div>
          </section>

          {/* Who This Is For */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-4">Who qualifies for carer&apos;s leave</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Carer&apos;s leave covers care for immediate family or household members.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Sick child</h3>
                      <p className="text-sm text-muted-foreground">
                        Your child is unwell and needs you to stay home to care for them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Elderly parent</h3>
                      <p className="text-sm text-muted-foreground">
                        A parent needs care due to illness or a medical appointment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Partner or spouse</h3>
                      <p className="text-sm text-muted-foreground">
                        Your partner is unwell and needs assistance at home.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Household member</h3>
                      <p className="text-sm text-muted-foreground">
                        Someone who lives with you and depends on your care.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What The Certificate Says */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What the certificate says</h2>
              <p className="text-center text-muted-foreground mb-10">
                The certificate provides what your employer needs while protecting privacy.
              </p>

              <div className="p-6 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        <strong>States:</strong> &quot;[Your name] is required to provide care for an immediate family member due to illness.&quot;
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        <strong>Privacy:</strong> Does not name the family member or specify their diagnosis.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <BadgeCheck className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        <strong>Includes:</strong> Doctor&apos;s name, signature, AHPRA registration, and provider number.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What Doctors Review */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-4">What the doctor reviews</h2>
              <p className="text-center text-muted-foreground mb-10">
                The doctor assesses whether carer&apos;s leave documentation is appropriate.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <Users className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Relationship</h3>
                    <p className="text-sm text-muted-foreground">
                      That the person you&apos;re caring for is an immediate family or household member.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <Stethoscope className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Care requirement</h3>
                    <p className="text-sm text-muted-foreground">
                      That the family member&apos;s condition requires your care or support.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                  <Clock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Duration</h3>
                    <p className="text-sm text-muted-foreground">
                      The appropriate duration for the certificate based on the situation.
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
                      <span>Immediate family member is acutely unwell</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>Short-term care needed (1-3 days)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>Same-day or recent need (within 48 hours)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>Child, parent, spouse, or household member</span>
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
                      <span>Long-term or ongoing care arrangements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>More than 48 hours ago</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Non-family member (friend, neighbour)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Complex care coordination needs</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                If we can&apos;t help, you&apos;ll receive a full refund (minus $4.95 admin fee) and an explanation.
              </p>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-16 bg-white/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10">
                    <h3 className="font-semibold mb-2">{faq.question.replace(/&apos;/g, "'")}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer.replace(/&apos;/g, "'")}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-rose-50 dark:bg-rose-900/20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to get your certificate?</h2>
              <p className="text-muted-foreground mb-8">
                Complete the questionnaire in about 2 minutes. A doctor reviews your request within an hour.
              </p>
              <Button 
                as={Link}
                href="/request?service=med-cert"
                size="lg" 
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-8"
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
                <Link href="/medical-certificates/work" className="text-rose-600 hover:underline">
                  Certificates for work
                </Link>
                {' • '}
                <Link href="/medical-certificates/study" className="text-rose-600 hover:underline">
                  Certificates for study
                </Link>
                {' • '}
                <Link href="/medical-certificates" className="text-rose-600 hover:underline">
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
