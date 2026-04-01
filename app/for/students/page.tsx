import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { ArrowRight, Shield, Zap, GraduationCap, Clock, Smartphone, Star, BookOpen, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { PRICING_DISPLAY } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

export const metadata: Metadata = {
  title: "Medical Certificates for Uni Students",
  description: "Get a medical certificate for university special consideration or missed exams. Accepted by all Australian universities. Reviewed by AHPRA-registered doctors.",
  keywords: [
    "medical certificate uni student",
    "special consideration medical certificate",
    "university medical certificate online",
    "missed exam medical certificate",
    "TAFE medical certificate",
    "student sick certificate online",
  ],
  openGraph: {
    title: "Medical Certificates for Uni Students | InstantMed",
    description: "Get your medical certificate for special consideration in under 30 minutes, 24/7. Accepted by all Australian unis.",
    url: "https://instantmed.com.au/for/students",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/students",
  },
}

export default function StudentsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Will my university accept an online medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are accepted by all Australian universities for special consideration, deferred exams, and assignment extensions.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use this for a missed exam?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The certificate states the dates you were unfit to attend class or sit exams. This is what universities require for deferred exam applications.",
        },
      },
      {
        "@type": "Question",
        name: "Does the certificate say what I was sick with?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "By default, certificates say 'medical condition' without specific details — protecting your privacy. If your uni requires more detail, let us know.",
        },
      },
      {
        "@type": "Question",
        name: "How long can the certificate cover?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most student certificates cover 1-3 days for acute illness. The doctor will determine appropriate duration based on your symptoms.",
        },
      },
      {
        "@type": "Question",
        name: "What does it cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Medical certificates start at $19.95 for 1 day, $29.95 for 2 days. If your request isn't approved, you get a refund minus a small admin fee.",
        },
      },
      {
        "@type": "Question",
        name: "Can I get a certificate for a mental health day?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Mental health is a valid medical reason. The doctor assesses whether a period of rest is clinically appropriate. Your certificate won't specify the nature of your condition — just that you were assessed and found unfit for study.",
        },
      },
      {
        "@type": "Question",
        name: "What if my special consideration application is rejected?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "That's a university process issue, not a certificate issue. Our certificates meet all legal requirements. If rejected, check your uni's specific submission requirements (some require the Professional Practitioner Certificate form rather than a standard cert).",
        },
      },
      {
        "@type": "Question",
        name: "Do I need a Medicare card?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Medicare is not required for medical certificates. International students can use this service too. The fee covers the doctor's assessment.",
        },
      },
      {
        "@type": "Question",
        name: "Is this a real doctor consultation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. An AHPRA-registered Australian GP reviews your information and makes a clinical judgement. If they can't issue a certificate based on what you've described, they won't — and you'll get a refund.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use this for TAFE, VET, or private colleges?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Our certificates are valid for any Australian educational institution, including TAFEs, registered training organisations (RTOs), and private colleges.",
        },
      },
      {
        "@type": "Question",
        name: "What about international students on student visas?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "International students can absolutely use this service. You don't need a Medicare card. The certificate is the same standard used for all Australian students.",
        },
      },
      {
        "@type": "Question",
        name: "How do I submit the certificate to my university?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Download the PDF from your email or patient dashboard. Most universities accept it uploaded through their special consideration portal. Some require you to submit it to your faculty office. Check your uni's specific process.",
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center">
                  <div className="mb-4"><SectionPill>For Uni & TAFE Students</SectionPill></div>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Medical Certificates for Special Consideration
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Too sick for that exam or assignment? Get your medical certificate in <strong>under 30 minutes</strong>, 24/7. Accepted by all Australian universities and TAFEs.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Valid for special consideration • Deferred exams • Assignment extensions
                  </p>

                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Speed badges */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">All unis accept</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">AHPRA doctors</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Speed Stats */}
          <section className="px-4 py-8 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden border-primary/20 bg-primary/5 dark:bg-primary/5">
                <div className="max-w-4xl mx-auto">
                  <div className="grid gap-4 sm:grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-semibold mb-1 text-primary">2 min</div>
                      <div className="text-xs text-muted-foreground">questionnaire</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold mb-1 text-primary">15 min</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold mb-1 text-primary">PDF</div>
                      <div className="text-xs text-muted-foreground">straight to email</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Universities */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-3">Accepted by all Australian universities</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Our certificates meet the requirements for special consideration at every Australian university and TAFE.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    {[
                      "University of Sydney",
                      "University of Melbourne",
                      "UNSW",
                      "Monash University",
                      "UQ",
                      "UWA",
                      "ANU",
                      "RMIT",
                      "UTS",
                      "QUT",
                      "All TAFEs",
                    ].map((uni) => (
                      <span key={uni} className="px-2.5 py-1 bg-primary/10 dark:bg-primary/10 border border-primary/20 dark:border-primary/20 rounded-full text-primary dark:text-primary">
                        {uni}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">What you can use it for</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      icon: FileText,
                      title: "Special Consideration",
                      desc: "When illness messes with exams, assignments, or attendance",
                    },
                    {
                      icon: Calendar,
                      title: "Deferred Exams",
                      desc: "Documentation for deferred exams and supplementary assessments",
                    },
                    {
                      icon: BookOpen,
                      title: "Assignment Extensions",
                      desc: "So you can submit late without getting penalised",
                    },
                  ].map((item) => (
                    <div key={item.title} className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-xl p-4 text-center hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300">
                      <item.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Why Students Use This */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Why students use InstantMed</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: Clock,
                      title: "No GP waitlists",
                      desc: "Skip the 2-week wait for a bulk-billing appointment. Sorted in 15 minutes.",
                    },
                    {
                      icon: Zap,
                      title: "Before the deadline",
                      desc: "Special consideration deadlines are tight. We get you sorted same-day.",
                    },
                    {
                      icon: Smartphone,
                      title: "From your phone",
                      desc: "Do it from bed when you&apos;re too sick to leave the house. PDF to your email.",
                    },
                    {
                      icon: Shield,
                      title: "Legit certificate",
                      desc: "AHPRA-registered doctors. Includes provider number. Universities accept it.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/50 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300">
                      <item.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">What students say</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      name: "Sophie L.",
                      uni: "UNSW",
                      quote: "Had a migraine on exam day. Got my cert submitted to special con before 5pm cutoff.",
                    },
                    {
                      name: "James W.",
                      uni: "University of Melbourne",
                      quote: "Way better than waiting 3 weeks for a GP. My assignment extension was approved same day.",
                    },
                    {
                      name: "Priya K.",
                      uni: "UQ",
                      quote: "Was too sick to leave bed. Did the whole thing on my phone. Lifesaver.",
                    },
                    {
                      name: "Marcus T.",
                      uni: "UTS",
                      quote: "Uni accepted it no questions asked. Doctor's name and provider number all there.",
                    },
                  ].map((item) => (
                    <div key={item.name} className="p-4 rounded-xl bg-white dark:bg-card border border-border/50">
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs mb-2">&quot;{item.quote}&quot;</p>
                      <p className="text-xs text-muted-foreground">
                        — {item.name}, {item.uni}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Guide */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Reviewed by AHPRA-registered GPs</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-8">Your guide to medical certificates for university</h2>

                <div className="max-w-2xl mx-auto space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Special consideration — what it is and how it works</h3>
                    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        Every Australian university has a special consideration process for students who are unwell during assessments. It&apos;s not the same as an extension — it&apos;s a formal process where the university reviews whether your academic performance was affected by circumstances beyond your control. Illness is the most common reason, and a medical certificate is the most common supporting document.
                      </p>
                      <p>
                        Each university sets its own deadlines for submitting special consideration applications, but most require you to apply within 3-5 business days of the affected assessment. Some are stricter. This means timing matters — if you&apos;re unwell during exam week and can&apos;t get into a GP, those days count. Having a way to get a certificate without leaving the house can be the difference between a successful application and a missed deadline.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">What your university actually needs from a medical certificate</h3>
                    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        Universities need a few specific things from a medical certificate: the doctor&apos;s name and AHPRA registration number, the date you were assessed, the period you were unfit for study, and the doctor&apos;s signature. Most universities do not require a specific diagnosis — just confirmation that you were medically assessed and found unfit for your normal academic activities during the relevant period.
                      </p>
                      <p>
                        Some universities — notably USyd and UNSW — have their own Professional Practitioner Certificate (PPC) forms. If yours does, our standard certificates still satisfy the core clinical requirements, but it&apos;s worth checking whether your faculty specifically requires their own form. When in doubt, your student services office can tell you exactly what they accept.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Mental health, burnout, and academic pressure</h3>
                    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        University is genuinely stressful, and mental health conditions are valid medical reasons for special consideration. You don&apos;t need to be physically ill — anxiety, depression, panic attacks, and acute stress responses all qualify. A doctor can assess whether your mental state is affecting your ability to study or sit exams, and issue a certificate accordingly.
                      </p>
                      <p>
                        If you&apos;re struggling consistently — not just around assessment time — we&apos;d recommend connecting with your university&apos;s counselling service alongside getting a certificate. Most universities offer free sessions, and having ongoing support is genuinely more useful than a certificate in the long run. The certificate handles the immediate academic problem; counselling helps with the underlying one.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">The difference between a medical certificate and a statutory declaration</h3>
                    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        Some universities accept either a medical certificate or a statutory declaration as supporting evidence. A medical certificate is issued by a registered doctor after a clinical assessment. A statutory declaration is a legal statement you write yourself and have witnessed by an authorised person — a JP, pharmacist, or similar. Both are legally valid documents, but they carry different weight.
                      </p>
                      <p>
                        Medical certificates are stronger because they involve a clinical judgement from a qualified practitioner. For serious applications — deferred exams, academic standing appeals, or anything where the stakes are high — a medical certificate is always the better option.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Tips for international students</h3>
                    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        You don&apos;t need Medicare or an Australian health insurance card to use InstantMed. The service fee covers the doctor&apos;s assessment directly — no insurance claim required. If you have OSHC (Overseas Student Health Cover), it&apos;s worth checking whether your provider reimburses telehealth consultations, as some do.
                      </p>
                      <p>
                        Our certificates meet the same standards as those from university health services or local GPs, and are accepted by all Australian universities regardless of your visa status. The certificate itself doesn&apos;t reference your nationality or visa — it&apos;s the same document issued to all patients.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/30">
                  <p className="text-xs text-muted-foreground text-center">
                    Read more about our <Link href="/clinical-governance" className="text-primary hover:underline">clinical governance framework</Link>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">FAQ for students</h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {[
                    {
                      q: "Will my uni actually accept this?",
                      a: "Yes. Issued by AHPRA-registered doctors with all the details unis want: doctor's name, provider number, dates of illness, signature. Every Australian uni accepts them.",
                    },
                    {
                      q: "Can I get a certificate for an exam I already missed?",
                      a: "Yes, we can backdate certificates up to 48 hours if clinically appropriate. Just indicate the dates you were unwell when completing the questionnaire.",
                    },
                    {
                      q: "Does it say what I was sick with?",
                      a: "By default, certificates say 'medical condition' without specific details — protecting your privacy. If your uni requires more detail, let us know.",
                    },
                    {
                      q: "How long can the certificate cover?",
                      a: "Most student certificates cover 1-3 days for acute illness. The doctor will determine appropriate duration based on your symptoms.",
                    },
                    {
                      q: "What does it cost?",
                      a: `Medical certificates start at ${PRICING_DISPLAY.MED_CERT} for 1 day, ${PRICING_DISPLAY.MED_CERT_2DAY} for 2 days. If your request isn't approved, you get a refund minus a small admin fee.`,
                    },
                    {
                      q: "Can I get a certificate for a mental health day?",
                      a: "Yes. Mental health is a valid medical reason. The doctor assesses whether a period of rest is clinically appropriate. Your certificate won't specify the nature of your condition — just that you were assessed and found unfit for study.",
                    },
                    {
                      q: "What if my special consideration application is rejected?",
                      a: "That's a university process issue, not a certificate issue. Our certificates meet all legal requirements. If rejected, check your uni's specific submission requirements (some require the Professional Practitioner Certificate form rather than a standard cert).",
                    },
                    {
                      q: "Do I need a Medicare card?",
                      a: "No. Medicare is not required for medical certificates. International students can use this service too. The fee covers the doctor's assessment.",
                    },
                    {
                      q: "Is this a real doctor consultation?",
                      a: "Yes. An AHPRA-registered Australian GP reviews your information and makes a clinical judgement. If they can't issue a certificate based on what you've described, they won't — and you'll get a refund.",
                    },
                    {
                      q: "Can I use this for TAFE, VET, or private colleges?",
                      a: "Yes. Our certificates are valid for any Australian educational institution, including TAFEs, registered training organisations (RTOs), and private colleges.",
                    },
                    {
                      q: "What about international students on student visas?",
                      a: "International students can absolutely use this service. You don't need a Medicare card. The certificate is the same standard used for all Australian students.",
                    },
                    {
                      q: "How do I submit the certificate to my university?",
                      a: "Download the PDF from your email or patient dashboard. Most universities accept it uploaded through their special consideration portal. Some require you to submit it to your faculty office. Check your uni's specific process.",
                    },
                  ].map((faq, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white dark:bg-card border border-border/50">
                      <h3 className="text-sm font-semibold mb-1.5">{faq.q}</h3>
                      <p className="text-xs text-muted-foreground">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-xl mx-auto text-center">
                <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-6 lg:p-8 relative overflow-hidden border-primary/20 bg-primary/5 dark:bg-primary/5">
                  <h2 className="text-2xl font-semibold mb-3">Get your certificate in under 30 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Don&apos;t miss your special consideration deadline. Get sorted now.
                  </p>
                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">{PRICING_DISPLAY.FROM_MED_CERT} • Accepted by all unis</p>
                </div>
              </div>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/medical-certificate" className="text-primary hover:underline">
                  Uni Med Certs
                </Link>
                {" • "}
                <Link href="/medical-certificate" className="text-primary hover:underline">
                  All Certificates
                </Link>
                {" • "}
                <Link href="/how-it-works" className="text-primary hover:underline">
                  How It Works
                </Link>
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
