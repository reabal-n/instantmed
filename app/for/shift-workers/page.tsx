import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip, MediaMentions } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { ArrowRight, Shield, Zap, Clock, Moon, Star, Smartphone, Sun, Coffee, Hospital, BadgeCheck, Brain, Scale, Briefcase, HeartPulse, Lightbulb } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { PRICING_DISPLAY } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

export const metadata: Metadata = {
  title: "Medical Certificates for Shift Workers",
  description: "Get a medical certificate online — perfect for nurses, hospitality, retail, and anyone working outside 9-5. Valid for all employers. From $19.95.",
  keywords: [
    "medical certificate shift workers",
    "night shift sick certificate",
    "24 hour medical certificate",
    "nurse medical certificate online",
    "hospitality medical certificate",
    "retail worker sick certificate",
  ],
  openGraph: {
    title: "Medical Certificates for Shift Workers | InstantMed",
    description: "Get your med cert online. Perfect for shift workers, nurses, and hospitality. Valid for all employers.",
    url: "https://instantmed.com.au/for/shift-workers",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/shift-workers",
  },
}

export default function ShiftWorkersPage() {
  const allFaqs = [
    {
      q: "What are your hours?",
      a: "Medical certificates are available 24/7 and typically issued in under 30 minutes. Prescriptions and consultations are available 8am-10pm AEST, 7 days a week including public holidays.",
    },
    {
      q: "I work nights — can I get a cert after 10pm?",
      a: "Medical certificates are processed 24/7 — submit anytime and you'll typically have your certificate in under 30 minutes. Prescriptions and consultations submitted after 10pm are processed from 8am the next morning.",
    },
    {
      q: "Will my employer accept this?",
      a: "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers — hospitals, retail chains, agencies, everyone.",
    },
    {
      q: "Can I get a cert for a shift I already missed?",
      a: "We can backdate certificates up to 48 hours if clinically appropriate. Just indicate the dates when you were unwell.",
    },
    {
      q: "What does it cost?",
      a: `Medical certificates from ${PRICING_DISPLAY.MED_CERT} (1 day) or ${PRICING_DISPLAY.MED_CERT_2DAY} (2 days). Scripts from ${PRICING_DISPLAY.REPEAT_SCRIPT}.`,
    },
    {
      q: "Can I get a certificate during a night shift?",
      a: "Yes. Submit your request any time. Our doctors review requests 8am\u201310pm AEST, 7 days. If you submit outside these hours, it\u2019ll be reviewed first thing next morning.",
    },
    {
      q: "I work rotating rosters — how do I prove I was sick on my day?",
      a: "The certificate covers the dates you were unfit for work, regardless of your roster pattern. Shift workers are entitled to the same sick leave as 9-5 workers.",
    },
    {
      q: "What about carer\u2019s leave for shift workers?",
      a: "Same entitlement. If you need time off to care for a sick family member, we can issue a carer\u2019s leave certificate. The Fair Work Act doesn\u2019t distinguish between shift workers and day workers for leave entitlements.",
    },
    {
      q: "Do I need a Medicare card?",
      a: "No. Medicare is not required for medical certificates.",
    },
    {
      q: "Can my employer ask me to see their nominated doctor instead?",
      a: "For standard sick leave, no. Employers can only require you to see a nominated doctor for WorkCover claims. Your personal sick leave, your choice of doctor.",
    },
    {
      q: "Is this service available on public holidays?",
      a: "Yes. We operate 7 days including public holidays. Shift workers often need healthcare when everything else is closed — that\u2019s what we\u2019re here for.",
    },
    {
      q: "What if I\u2019m a casual working irregular shifts?",
      a: "Casual employees don\u2019t accrue paid sick leave but a certificate still protects your working relationship and demonstrates legitimate absence. Long-term regular casuals may have additional rights.",
    },
  ]

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
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
                  <div className="mb-4"><SectionPill>For Shift Workers</SectionPill></div>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Medical Certificates Anytime, Any Shift
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Night shift? Early start? Weekend roster? Get your medical certificate in <strong>under 30 minutes</strong> — available 24/7.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Works around your roster • All employers accept • AHPRA doctors
                  </p>

                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Trust badges */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">8am-10pm, 7 days</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">All employers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Availability Bar */}
          <section className="px-4 py-8 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden border-primary/20 bg-primary/5 dark:bg-primary/5">
                <div className="max-w-4xl mx-auto">
                  <div className="grid gap-4 sm:grid-cols-4 text-center">
                    <div className="flex flex-col items-center">
                      <Sun className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-xs font-medium text-primary">Early mornings</div>
                      <div className="text-xs text-muted-foreground">From 8am</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <Coffee className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-xs font-medium text-primary">Business hours</div>
                      <div className="text-xs text-muted-foreground">9am-5pm</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <Moon className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-xs font-medium text-primary">Evenings</div>
                      <div className="text-xs text-muted-foreground">Until 10pm</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <Star className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-xs font-medium text-primary">Weekends</div>
                      <div className="text-xs text-muted-foreground">Sat & Sun</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Industries */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Popular with shift workers in</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: Hospital, title: "Healthcare", examples: "Nurses, aged care, hospital staff" },
                    { icon: Coffee, title: "Hospitality", examples: "Chefs, waitstaff, hotel workers" },
                    { icon: Clock, title: "Retail", examples: "Supermarkets, shops, warehouse" },
                    { icon: Moon, title: "Security", examples: "Guards, patrol, monitoring" },
                    { icon: Smartphone, title: "Transport", examples: "Drivers, logistics, delivery" },
                    { icon: Sun, title: "Manufacturing", examples: "Factory workers, production" },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/50 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300">
                      <item.icon className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.examples}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Why Shift Workers Use This */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Why shift workers choose InstantMed</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: "GPs don&apos;t work your hours",
                      desc: "Finish a night shift at 6am and can&apos;t see a doctor until Monday? We're available 8am-10pm, 7 days a week.",
                    },
                    {
                      title: "No time to wait",
                      desc: "You're already exhausted from your shift. Skip the waiting room and get your cert in 15 minutes from your phone.",
                    },
                    {
                      title: "Before your next roster",
                      desc: "Need documentation before your manager schedules the next shift? Get sorted same-day.",
                    },
                    {
                      title: "Any employer accepts it",
                      desc: "Hospitals, retail chains, agencies — they all accept our certificates. AHPRA-registered, legally valid.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-xl p-4 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300">
                      <h3 className="text-sm font-semibold mb-1.5">{item.title}</h3>
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
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">What shift workers say</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      name: "Lisa R.",
                      location: "Adelaide",
                      quote: "Finished night shift feeling terrible. Got my cert at 7am before I even tried to sleep.",
                    },
                    {
                      name: "Marcus P.",
                      location: "Melbourne",
                      quote: "My hours don&apos;t line up with clinic hours. Did it from my phone between shifts.",
                    },
                    {
                      name: "Emma T.",
                      location: "Brisbane",
                      quote: "Got sick on a Sunday. Had my cert to HR before Monday morning. No stress.",
                    },
                    {
                      name: "Dave K.",
                      location: "Sydney",
                      quote: "Night shifts make clinic appointments basically impossible. This actually works around my roster.",
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
                        — {item.name}, {item.location}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Individual experiences may vary. All requests are subject to doctor assessment.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">How it works</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      step: "1",
                      title: "Quick questionnaire",
                      desc: "Tell us why you need a certificate. Takes 2 minutes on your phone.",
                      time: "2 min",
                    },
                    {
                      step: "2",
                      title: "Doctor reviews",
                      desc: "An AHPRA-registered GP assesses your request.",
                      time: "~15 min",
                    },
                    {
                      step: "3",
                      title: "Certificate delivered",
                      desc: "Secure PDF sent to your email. Forward to your manager.",
                      time: "Instant",
                    },
                  ].map((item) => (
                    <div key={item.step} className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-xl text-center p-4">
                      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
                        <span className="font-semibold text-lg text-background">{item.step}</span>
                      </div>
                      <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                      <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Guide Section */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                {/* AHPRA badge */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Medically reviewed by AHPRA-registered GPs
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-2">
                  Your guide to sick leave as a shift worker
                </h2>
                <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto mb-8">
                  Your rights, health considerations, and practical advice for managing sick leave on rotating rosters.
                </p>

                <div className="space-y-8 max-w-3xl mx-auto">
                  {/* 1. Shift work and your health */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-2">Shift work and your health</h3>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Shift work disrupts your circadian rhythm — the internal clock that regulates sleep, digestion, hormone production, and mood. Over time, this disruption compounds. Night shift workers are roughly 30% more likely to report poor general health compared to day workers, and the research on long-term effects continues to grow.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Common health issues among shift workers include chronic sleep disorders, persistent fatigue, digestive problems (particularly gastro and reflux), and higher rates of anxiety and depression. These aren&apos;t minor inconveniences — they&apos;re legitimate medical conditions that deserve proper attention and documentation.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          When you do get sick, the last thing you need is a two-week wait for a GP appointment at a clinic that&apos;s only open 9-5. Your health doesn&apos;t operate on business hours, and your healthcare shouldn&apos;t have to either.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Your sick leave rights on rotating rosters */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scale className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-2">Your sick leave rights on rotating rosters</h3>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The Fair Work Act 2009 applies equally to all employees regardless of shift pattern. Full-time shift workers are entitled to 10 days of paid personal/carer&apos;s leave per year, accrued progressively. Part-time employees accrue leave on a pro-rata basis. These entitlements don&apos;t change because your shifts fall on nights, weekends, or public holidays.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Employers can request a medical certificate for any absence — including a single day — but they cannot require you to see a specific doctor for standard sick leave. That&apos;s a right many shift workers don&apos;t know they have. Your enterprise agreement or award may include additional provisions, so it&apos;s worth checking yours if you&apos;re unsure.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Night shift and weekend workers have identical entitlements to Monday-to-Friday workers. The Fair Work Commission has consistently upheld this principle. A certificate from a telehealth doctor carries the same legal weight as one from a walk-in clinic.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Industry-specific considerations */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-2">Nurses, hospitality, retail — industry-specific considerations</h3>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Healthcare workers — nurses, aged care staff, hospital support — may need a clearance certificate before returning to work, especially after gastro-related illness. Your workplace infection control policy likely has specific requirements, and we can issue a clearance certificate once you&apos;ve met the symptom-free period.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Hospitality and food handling workers face additional requirements under food safety regulations. Gastro-related illness typically requires 48 hours symptom-free before returning to food preparation roles. A certificate documenting the appropriate absence period protects both you and your employer.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Retail workers standing for long shifts with back pain, fatigue, or other physical symptoms have a legitimate reason for a medical certificate. Each industry has its own norms and expectations, but the underlying entitlement under the Fair Work Act is the same across all of them.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. After-hours healthcare options */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <HeartPulse className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-2">After-hours healthcare options in Australia</h3>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Beyond InstantMed, your after-hours options include hospital emergency departments for genuine emergencies, after-hours GP clinics (though availability varies significantly by location), and phone advice lines like 13 HEALTH (Queensland) or Nurse on Call (Victoria).
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          InstantMed is designed for non-emergency medical certificates and prescriptions when a GP visit isn&apos;t practical — not a replacement for emergency care. If you&apos;re experiencing a medical emergency, call 000.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 5. Managing your health around shift work */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lightbulb className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-2">Managing your health around shift work</h3>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Practical strategies that actually help: maintain a consistent sleep schedule even on days off (your body can&apos;t reset every 48 hours), manage light exposure deliberately (blackout curtains, blue-light glasses), and eat at regular times even if those times are unconventional. Your body responds to routine, even if that routine starts at 10pm.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Keep your regular GP informed about your shift pattern so they can adjust monitoring for the health risks associated with shift work. Getting proactive healthcare shouldn&apos;t have to wait until your one free weekday lines up with an available appointment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clinical governance link */}
                <div className="mt-8 pt-6 border-t border-border/40 text-center">
                  <p className="text-xs text-muted-foreground">
                    All clinical decisions are made by AHPRA-registered doctors following{" "}
                    <Link href="/clinical-governance" className="text-primary hover:underline">
                      our clinical governance framework
                    </Link>
                    . We never automate clinical decisions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">Quick answers</h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {allFaqs.map((faq, i) => (
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
                    Works around your roster, not the other way around.
                  </p>
                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">{PRICING_DISPLAY.FROM_MED_CERT} • 8am-10pm, 7 days</p>
                </div>
              </div>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/for/tradies" className="text-primary hover:underline">
                  Tradies
                </Link>
                {" • "}
                <Link href="/for/corporate" className="text-primary hover:underline">
                  Corporate Workers
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-primary hover:underline">
                  Prescriptions
                </Link>
              </p>
            </div>
          </section>

          {/* Social Proof */}
          <LiveWaitTime variant="strip" services={['med-cert']} />
          <StatsStrip className="bg-muted/20 border-y border-border/30" />
          <MediaMentions variant="strip" className="bg-muted/30" />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
