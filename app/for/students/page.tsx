import { ArrowRight, BookOpen, Calendar, Clock, FileText, GraduationCap, Shield, Smartphone, Zap } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

export const metadata: Metadata = {
  title: "Medical Certificates for Uni Students | InstantMed",
  description: "Get a doctor-reviewed medical certificate for study absence documentation. 15-minute turnaround. Institution policies vary.",
  keywords: [
    "medical certificate uni student",
    "student medical certificate",
    "university medical certificate online",
    "study absence medical certificate",
    "TAFE medical certificate",
    "student sick certificate online",
  ],
  openGraph: {
    title: "Medical Certificates for Uni Students | InstantMed",
    description: "Get a doctor-reviewed medical certificate for study absence documentation in 15 minutes.",
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
        name: "Can I use this certificate for study absence documentation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our certificates are issued by AHPRA-registered Australian doctors and include standard details such as the doctor, dates of unfitness, and verification code. Your institution decides how it assesses supporting documents.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use this for a missed exam?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The certificate can state the dates you were clinically assessed as unfit, if the doctor considers it appropriate. Check your institution's policy and submit it through the required channel.",
        },
      },
    ],
  }

  return (
    <>
      <script id="faq-schema" type="application/ld+json"
        suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center">
                  <div className="mb-4">
                    <SectionPill>For Uni & TAFE Students</SectionPill>
                  </div>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Medical Certificates for Students
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Too unwell for class or study? Get your medical certificate in <strong>15 minutes</strong>. Institution policies vary.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Study absence documentation • Doctor-reviewed • Verification code included
                  </p>

                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm px-6">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Speed badges */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">Institution-ready details</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
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
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden border-primary/20 bg-blue-50/30 dark:bg-blue-950/10">
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
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-3">Built for student documentation</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Certificates include standard doctor, date, and verification details. Your school, TAFE, or university decides how it applies its policy.
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
                      "TAFE",
                    ].map((uni) => (
                      <span key={uni} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-full text-blue-700 dark:text-blue-300">
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
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Common student situations</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      icon: FileText,
                      title: "Study Absence",
                      desc: "When illness affects classes, placement, or study commitments",
                    },
                    {
                      icon: Calendar,
                      title: "Missed Assessment",
                      desc: "Documentation for the dates you were clinically unfit",
                    },
                    {
                      icon: BookOpen,
                      title: "Coursework Absence",
                      desc: "Supporting evidence for your institution to assess",
                    },
                  ].map((item) => (
                    <div key={item.title} className="glass-card rounded-xl p-4 text-center">
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
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
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
                      desc: "Student documentation deadlines can be tight. We help you submit promptly.",
                    },
                    {
                      icon: Smartphone,
                      title: "From your phone",
                      desc: "Do it from bed when you&apos;re too sick to leave the house. PDF to your email.",
                    },
                    {
                      icon: Shield,
                      title: "Legit certificate",
                      desc: "AHPRA-registered doctors. Includes doctor details and a verification code.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-sm border border-border/50">
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

          {/* FAQs */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">FAQ for students</h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {[
                    {
                      q: "Will my uni accept this?",
                      a: "Most institutions assess certificates from AHPRA-registered doctors, but each institution sets its own policy. Submit it through your required portal and check your deadlines.",
                    },
                    {
                      q: "Can I get a certificate for an exam I already missed?",
                      a: "Yes, we can backdate certificates up to 48 hours if clinically appropriate. Just indicate the dates you were unwell when completing the questionnaire.",
                    },
                    {
                      q: "Does it say what I was sick with?",
                      a: "By default, certificates say 'medical condition' without specific details - protecting your privacy. If your uni requires more detail, let us know.",
                    },
                    {
                      q: "How long can the certificate cover?",
                      a: "Most student certificates cover 1-3 days for acute illness. The doctor will determine appropriate duration based on your symptoms.",
                    },
                    {
                      q: "What does it cost?",
                      a: `Medical certificates start at ${PRICING_DISPLAY.MED_CERT} for 1 day, ${PRICING_DISPLAY.MED_CERT_2DAY} for 2 days. If your request isn't approved, you get a refund minus a small admin fee.`,
                    },
                  ].map((faq, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-sm border border-border/50">
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-primary/20 bg-blue-50/30 dark:bg-blue-950/10">
                  <h2 className="text-2xl font-semibold mb-3">Get your certificate in 15 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get your certificate before your documentation deadline.
                  </p>
                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm h-12 px-8">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">{PRICING_DISPLAY.FROM_MED_CERT} • Institution policies vary</p>
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
