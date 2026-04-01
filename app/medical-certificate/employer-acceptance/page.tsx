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
import { MedicalDisclaimer } from '@/components/seo/medical-disclaimer'

const baseUrl = 'https://instantmed.com.au'

export const metadata: Metadata = {
  title: "Are Online Medical Certificates Valid?",
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
  {
    question: "Can my employer verify this certificate online?",
    answer: "Yes. Every InstantMed certificate includes a unique verification ID. Your employer can verify any certificate at instantmed.com.au/verify — confirming it was genuinely issued by our practice, the dates match, and the issuing doctor is AHPRA-registered. This is actually more robust than paper certificates from traditional clinics.",
  },
  {
    question: "Does the certificate say what I was sick with?",
    answer: "No. Under Australian privacy law, your employer is entitled to know that you were unfit for work and for how long — not your specific diagnosis. Our certificates state 'medical condition' without disclosing details, protecting your privacy.",
  },
  {
    question: "Is a telehealth certificate the same as one from a GP clinic?",
    answer: "Legally, yes. The Medical Board of Australia recognises telehealth as a legitimate mode of healthcare delivery. The same clinical standards apply — the doctor makes the same assessment and the certificate carries the same legal weight. The only difference is the consultation happens online.",
  },
  {
    question: "Can I get a certificate for carer's leave?",
    answer: "Yes. If you need time off to care for an immediate family member or household member who is ill, we can issue a certificate for carer's leave under the Fair Work Act. The same evidentiary standards apply.",
  },
  {
    question: "What about casual employees — do they need certificates?",
    answer: "Casual employees don't accrue paid sick leave, but some employers still request certificates. A medical certificate demonstrates good faith and protects your working relationship. Long-term regular casuals may have additional entitlements under the Fair Work Act.",
  },
  {
    question: "Can I get a certificate backdated?",
    answer: "Certificates can cover absences up to 48 hours prior if clinically appropriate. The doctor determines whether backdating is justified based on your reported symptoms. Just indicate the dates you were unwell when completing the form.",
  },
  {
    question: "How quickly can I get a certificate?",
    answer: "Most certificates are issued in under 30 minutes, 24/7. Once approved, the certificate is available immediately as a PDF — ready to download and forward to your employer.",
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-light border border-success-border/20 mb-6">
                <HelpCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Common Question</span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl mb-4">
                Yes, your employer will accept this
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Online medical certificates from AHPRA-registered doctors are legally valid
                and accepted by all Australian employers. Here&apos;s why.
              </p>
            </div>
          </section>

          {/* What Makes It Valid */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What makes a certificate legitimate</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Our certificates meet all legal requirements for Australian employers.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="h-6 w-6 text-success shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">AHPRA Registered Doctor</h3>
                      <p className="text-sm text-muted-foreground">
                        Every certificate is issued by a doctor registered with the Australian Health Practitioner Regulation Agency. Their registration number is included on the certificate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-6 w-6 text-success shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Medicare Provider Number</h3>
                      <p className="text-sm text-muted-foreground">
                        The doctor&apos;s Medicare provider number is printed on every certificate. This is a unique identifier that can be verified.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-6 w-6 text-success shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Australian-Based Practice</h3>
                      <p className="text-sm text-muted-foreground">
                        Our doctors and operations are 100% based in Australia. We&apos;re not an offshore service or certificate mill.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-success shrink-0 mt-0.5" />
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
              <h2 className="text-2xl font-semibold text-center mb-4">What the Fair Work Act says</h2>
              <p className="text-center text-muted-foreground mb-10">
                Australian workplace law supports the use of medical certificates from registered practitioners.
              </p>

              <div className="p-6 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                <div className="flex items-start gap-4">
                  <Scale className="h-6 w-6 text-success shrink-0 mt-1" />
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
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What your certificate includes</h2>
              <p className="text-center text-muted-foreground mb-10">
                Every certificate contains the information employers need.
              </p>

              <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm shadow-primary/[0.04] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">Patient&apos;s full name</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">Dates the patient was unfit for work</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">Doctor&apos;s full name and signature</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">AHPRA registration number</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">Medicare provider number</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">Date of issue</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="text-sm">Practice contact details</span>
                </div>
              </div>
            </div>
          </section>

          {/* What To Say */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-4">If your employer questions it</h2>
              <p className="text-center text-muted-foreground mb-10">
                Most employers accept online certificates without issue. If questions arise, here&apos;s what to know.
              </p>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <h3 className="font-semibold mb-2">Point to the doctor&apos;s credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    The certificate includes the doctor&apos;s AHPRA registration number. Anyone can verify this is a real,
                    registered doctor by searching the AHPRA register at ahpra.gov.au.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <h3 className="font-semibold mb-2">Telehealth is recognised healthcare</h3>
                  <p className="text-sm text-muted-foreground">
                    The Medical Board of Australia and Medicare both recognise telehealth consultations.
                    Certificates from telehealth are no less valid than those from in-person visits.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                  <h3 className="font-semibold mb-2">Check workplace policy timing</h3>
                  <p className="text-sm text-muted-foreground">
                    If an employer has specific requirements about medical certificates, they must communicate
                    these in advance — not after you&apos;ve submitted evidence.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Long-form E-E-A-T Guide Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              {/* AHPRA Badge */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-success uppercase tracking-wider">Reviewed by AHPRA-registered GPs</span>
              </div>

              <h2 className="text-2xl font-semibold text-center mb-3">
                The complete guide to online medical certificate validity
              </h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Everything you need to know about the legal standing of telehealth certificates in Australian workplaces.
              </p>

              <div className="space-y-8">
                {/* Section 1 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">How telehealth certificates became standard in Australia</h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Telehealth has been part of Australian healthcare for decades, but its widespread adoption accelerated significantly from 2020. The Medical Board of Australia formally recognises telehealth consultations — including those resulting in medical certificates — as a legitimate mode of healthcare delivery. This isn&apos;t a temporary measure or a workaround; it&apos;s now embedded in how Australian healthcare operates.
                    </p>
                    <p>
                      The key principle is straightforward: the mode of consultation doesn&apos;t determine the validity of the clinical outcome. A doctor assessing a patient via telehealth applies the same clinical standards as one seeing the patient face-to-face. If the doctor determines a certificate is clinically appropriate based on the information available, that certificate is as valid as one from any GP clinic in Australia.
                    </p>
                  </div>
                </div>

                {/* Section 2 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">The Fair Work Act and what employers can require</h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      The Fair Work Act 2009 entitles full-time employees to 10 days of paid personal/carer&apos;s leave per year, with part-time employees accruing proportionally. Section 107 allows employers to request &quot;evidence that would satisfy a reasonable person&quot; that the leave was taken for a genuine reason. A medical certificate from an AHPRA-registered doctor is the most common form of this evidence.
                    </p>
                    <p>
                      Critically, the Fair Work Act does not specify the mode of consultation. It doesn&apos;t require an in-person visit, a specific clinic, or a particular doctor. What matters is that the certificate was issued by a registered medical practitioner who exercised genuine clinical judgement. Multiple Fair Work Commission decisions since 2020 have upheld telehealth certificates as meeting this standard.
                    </p>
                    <p>
                      Employers can have internal policies about medical certificates — for example, requiring one from day one rather than day two — but these policies must be communicated in advance and cannot discriminate against the mode of consultation. An employer who accepts certificates from in-person GPs but rejects identical certificates from telehealth doctors would face scrutiny under anti-discrimination principles.
                    </p>
                  </div>
                </div>

                {/* Section 3 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">What a valid certificate must contain</h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      A legally valid medical certificate in Australia must include: the practitioner&apos;s full name, their AHPRA registration number, the date of the clinical assessment, the patient&apos;s name and date of birth, the period the patient is certified as unfit for duties, and the practitioner&apos;s signature. Digital signatures are accepted and carry the same legal weight as handwritten ones.
                    </p>
                    <p>
                      InstantMed certificates include all of these elements, plus a unique verification ID that employers can check at instantmed.com.au/verify. This actually provides a level of verification that most paper certificates from traditional GP clinics don&apos;t offer — there&apos;s no way to verify a handwritten certificate from a suburban clinic short of calling the practice directly.
                    </p>
                  </div>
                </div>

                {/* Section 4 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Privacy — what employers can and can&apos;t ask</h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Under Australian privacy law, employees are not required to disclose their specific diagnosis to their employer. A medical certificate confirms that the employee was assessed by a registered doctor and found unfit for work for a specified period — that&apos;s the extent of what employers are entitled to know. Our certificates state &quot;medical condition&quot; without disclosing the nature of the illness.
                    </p>
                    <p>
                      Employers can ask when you expect to return and whether any adjustments are needed, but they cannot pressure you to reveal your diagnosis, contact your doctor for details (without your written consent), or use your health information for any purpose beyond managing your leave. If you feel your employer is overstepping, the Fair Work Ombudsman and the Office of the Australian Information Commissioner can provide guidance.
                    </p>
                  </div>
                </div>

                {/* Section 5 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">When an in-person certificate is more appropriate</h3>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Telehealth certificates are appropriate for straightforward, self-limiting conditions — cold and flu, gastro, migraine, back pain, mental health days. For extended absences beyond 3–5 days, conditions requiring physical examination (workplace injuries, fractures, surgical recovery), or WorkCover claims, an in-person assessment is more appropriate. WorkCover in particular requires specific forms and employer-nominated examination processes that telehealth can&apos;t satisfy.
                    </p>
                    <p>
                      We&apos;re transparent about this boundary. If a doctor reviewing your request determines that your situation requires in-person assessment, they&apos;ll recommend you see a GP face-to-face and you&apos;ll receive a full refund. This clinical integrity is part of what makes our certificates trustworthy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Clinical governance link */}
              <div className="mt-10 pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground text-center">
                  Learn more about how our doctors operate in our{' '}
                  <Link href="/clinical-governance" className="text-success hover:underline">clinical governance framework</Link>.
                </p>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/5">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-10">Frequently asked questions</h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-success-light/30">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold mb-4">Ready to get your certificate?</h2>
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
                <Link href="/medical-certificate/work" className="text-success hover:underline">
                  Certificates for work
                </Link>
                {' • '}
                <Link href="/medical-certificate/study" className="text-success hover:underline">
                  Certificates for study
                </Link>
                {' • '}
                <Link href="/medical-certificate" className="text-success hover:underline">
                  All certificate types
                </Link>
              </p>
            </div>
          </section>
          {/* Medical Disclaimer */}
          <MedicalDisclaimer reviewedDate="2026-03" />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
