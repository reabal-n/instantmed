import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, Building2, Clock, Star, Briefcase, Mail, Lock } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Medical Certificates for Corporate Workers | 15 Min | InstantMed",
  description: "Get a medical certificate before HR asks. 15-minute turnaround, delivered to your inbox. Professional, discreet, valid for all employers. No time off work needed.",
  keywords: [
    "medical certificate corporate",
    "office worker sick certificate",
    "professional medical certificate online",
    "HR medical certificate",
    "sick leave certificate online",
    "work from home medical certificate",
  ],
  openGraph: {
    title: "Medical Certificates for Corporate Workers | InstantMed",
    description: "Get your medical certificate in 15 minutes. Professional, discreet, HR-approved.",
    url: "https://instantmed.com.au/for/corporate",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/corporate",
  },
}

export default function CorporatePage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Will HR accept an online medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers, including corporate offices, banks, consulting firms, and government agencies.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly can I get my certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most certificates are issued within 15 minutes during business hours (8am-10pm AEST). You'll receive a professional PDF via email that you can forward directly to HR.",
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 mb-4 interactive-pill cursor-default">
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-medium text-slate-700">For Corporate Professionals</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Medical Certificate Before HR Asks
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Unwell and working from home? Get your medical certificate in <strong>15 minutes</strong>. Professional PDF delivered to your inbox — ready to forward to HR.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    All employers accept • Discreet • No time off work needed
                  </p>

                  <Link href="/start?service=med-cert">
                    <Button size="lg" className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-6">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Trust badges */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-slate-600" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                      <span className="font-medium text-muted-foreground">PDF to email</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-slate-600" />
                      <span className="font-medium text-muted-foreground">HR-approved</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Speed Stats */}
          <section className="px-4 py-8 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden border-slate-500/20 bg-slate-50/30 dark:bg-slate-950/10">
                <div className="max-w-4xl mx-auto">
                  <div className="grid gap-4 sm:grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-bold mb-1 text-slate-600">2 min</div>
                      <div className="text-xs text-muted-foreground">questionnaire</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-1 text-slate-600">15 min</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-1 text-slate-600">Instant</div>
                      <div className="text-xs text-muted-foreground">email delivery</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Corporate Workers Use This */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Why professionals choose InstantMed</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: Clock,
                      title: "No time off work",
                      desc: "Complete the questionnaire from home in 2 minutes. No need to visit a clinic or take more time off.",
                    },
                    {
                      icon: Zap,
                      title: "Before your manager asks",
                      desc: "15-minute turnaround. Have your certificate ready before anyone follows up.",
                    },
                    {
                      icon: Lock,
                      title: "Discreet and private",
                      desc: "Certificate shows 'medical condition' — no specific diagnosis shared. Your privacy protected.",
                    },
                    {
                      icon: Briefcase,
                      title: "Professional format",
                      desc: "Clean PDF with doctor's name, provider number, and digital signature. Ready for HR systems.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <item.icon className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
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

          {/* Common Scenarios */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Common scenarios we help with</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: "WFH sick day", desc: "Too unwell to work but not sick enough for A&E" },
                    { title: "Mental health day", desc: "Stress, anxiety, or burnout affecting your work" },
                    { title: "Migraine day", desc: "Can't look at screens or concentrate" },
                    { title: "Gastro", desc: "Need to stay near the bathroom" },
                    { title: "Cold or flu", desc: "Don't want to spread it at the office" },
                    { title: "Carer's leave", desc: "Looking after a sick child or family member" },
                  ].map((item) => (
                    <div key={item.title} className="glass-card rounded-xl p-4">
                      <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
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
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">What professionals say</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      name: "Sarah M.",
                      role: "Marketing Manager, Sydney",
                      quote: "Had a migraine and couldn&apos;t look at screens. Got my cert from bed, forwarded to HR, done.",
                    },
                    {
                      name: "David K.",
                      role: "Consultant, Melbourne",
                      quote: "So much easier than trying to find a GP appointment between client meetings.",
                    },
                    {
                      name: "Rachel T.",
                      role: "Finance Analyst, Brisbane",
                      quote: "Professional certificate, quick turnaround. HR didn't bat an eye.",
                    },
                    {
                      name: "James L.",
                      role: "Software Engineer, Perth",
                      quote: "WFH with a cold. Got my cert in 10 minutes while still in my pyjamas.",
                    },
                  ].map((item) => (
                    <div key={item.name} className="p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs mb-2">&quot;{item.quote}&quot;</p>
                      <p className="text-xs text-muted-foreground">
                        — {item.name}, {item.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Other Services */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Other services for busy professionals</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { title: "Repeat Scripts", desc: "Blood pressure, reflux, contraceptive", price: "From $29.95", href: "/prescriptions" },
                    { title: "Hair Loss", desc: "Discreet treatment options", price: "From $29.95", href: "/hair-loss" },
                    { title: "Weight Management", desc: "Doctor-guided programs", price: "From $49.95", href: "/weight-management" },
                  ].map((item) => (
                    <Link key={item.title} href={item.href}>
                      <div className="glass-card rounded-xl p-4 h-full hover:border-slate-500/30 transition-all">
                        <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                        <span className="text-xs text-slate-600 font-medium">{item.price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Questions HR might ask (answered)</h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {[
                    {
                      q: "Is an online medical certificate valid?",
                      a: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid. They include the doctor's name, provider number, and digital signature — everything HR needs.",
                    },
                    {
                      q: "Will it look different from a normal cert?",
                      a: "The format is professional and includes all legally required information. Many HR systems now expect digital certificates. You'll receive a clean PDF that&apos;s easy to submit.",
                    },
                    {
                      q: "Does it say what I was sick with?",
                      a: "By default, certificates say 'medical condition' — protecting your privacy. Specific diagnoses are only included if you request it or if legally required.",
                    },
                    {
                      q: "Can I get a certificate for mental health?",
                      a: "Yes. Mental health conditions (stress, anxiety, burnout) are valid medical reasons for sick leave. The certificate won&apos;t specify 'mental health' unless you want it to.",
                    },
                    {
                      q: "What if I need a certificate for carer's leave?",
                      a: "We provide carer's certificates for looking after sick family members. Same process, same 15-minute turnaround.",
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-slate-500/20 bg-slate-50/30 dark:bg-slate-950/10">
                  <h2 className="text-2xl font-bold mb-3">Certificate in 15 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Professional, discreet, and ready for HR. Get sorted now.
                  </p>
                  <Link href="/start?service=med-cert">
                    <Button size="lg" className="bg-slate-800 hover:bg-slate-900 text-white text-sm h-12 px-8">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">$19.95 • Valid for all employers</p>
                </div>
              </div>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/for/shift-workers" className="text-slate-600 hover:underline">
                  Shift Workers
                </Link>
                {" • "}
                <Link href="/seo/medical-certificate-for-work" className="text-slate-600 hover:underline">
                  Work Med Certs
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-slate-600 hover:underline">
                  Prescriptions
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
