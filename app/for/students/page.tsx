import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, GraduationCap, Clock, Smartphone, Star, BookOpen, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Medical Certificates for Uni Students | Special Consideration | InstantMed",
  description: "Get a medical certificate for university special consideration or missed exams. 15-minute turnaround. Accepted by all Australian universities. No GP wait times.",
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
    description: "Get your medical certificate for special consideration in 15 minutes. Accepted by all Australian unis.",
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
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4 interactive-pill cursor-default">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">For Uni & TAFE Students</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Medical Certificates for Special Consideration
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Too sick for that exam or assignment? Get your medical certificate in <strong>15 minutes</strong>. Accepted by all Australian universities and TAFEs.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Valid for special consideration • Deferred exams • Assignment extensions
                  </p>

                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-background text-sm px-6">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Speed badges */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-medium text-muted-foreground">All unis accept</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-indigo-600" />
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
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10">
                <div className="max-w-4xl mx-auto">
                  <div className="grid gap-4 sm:grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-bold mb-1 text-indigo-600">2 min</div>
                      <div className="text-xs text-muted-foreground">questionnaire</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-1 text-indigo-600">15 min</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-1 text-indigo-600">PDF</div>
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
                  <h2 className="text-xl sm:text-2xl font-bold mb-3">Accepted by all Australian universities</h2>
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
                      <span key={uni} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700">
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
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">What you can use it for</h2>
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
                    <div key={item.title} className="glass-card rounded-xl p-4 text-center">
                      <item.icon className="h-6 w-6 mx-auto mb-2 text-indigo-600" />
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
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Why students use InstantMed</h2>
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
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <item.icon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
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
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">What students say</h2>
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
                    <div key={item.name} className="p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-dawn-400 text-dawn-400" />
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

          {/* FAQs */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">FAQ for students</h2>
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
                      a: "Medical certificates start at $19.95 for 1 day, $29.95 for 2 days. If your request isn&apos;t approved, you get a refund minus a small admin fee.",
                    },
                  ].map((faq, i) => (
                    <div key={i} className="p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10">
                  <h2 className="text-2xl font-bold mb-3">Get your certificate in 15 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Don&apos;t miss your special consideration deadline. Get sorted now.
                  </p>
                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-background text-sm h-12 px-8">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">From $19.95 • Accepted by all unis</p>
                </div>
              </div>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/seo/medical-certificate-for-uni" className="text-indigo-600 hover:underline">
                  Uni Med Certs
                </Link>
                {" • "}
                <Link href="/medical-certificate" className="text-indigo-600 hover:underline">
                  All Certificates
                </Link>
                {" • "}
                <Link href="/how-it-works" className="text-indigo-600 hover:underline">
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
