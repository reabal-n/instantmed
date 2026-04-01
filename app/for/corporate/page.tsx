import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, LiveWaitTime, StatsStrip, MediaMentions } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { ArrowRight, Shield, Zap, Clock, Star, Briefcase, Mail, Lock, Scale, BadgeCheck, Monitor, Brain, Building2 } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { PRICING_DISPLAY } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

export const metadata: Metadata = {
  title: "Medical Certificates for Corporate Workers",
  description: "Get a medical certificate delivered to your inbox. Professional, discreet, valid for all employers. No time off work needed. From $19.95.",
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
    description: "Get your medical certificate in under 30 minutes, 24/7. Professional, discreet, HR-approved.",
    url: "https://instantmed.com.au/for/corporate",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/corporate",
  },
}

export default function CorporatePage() {
  const faqs = [
    {
      q: "Is an online medical certificate valid?",
      a: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid. They include the doctor's name, provider number, and digital signature — everything HR needs.",
    },
    {
      q: "Will it look different from a normal cert?",
      a: "The format is professional and includes all legally required information. Many HR systems now expect digital certificates. You'll receive a clean PDF that's easy to submit.",
    },
    {
      q: "Does it say what I was sick with?",
      a: "By default, certificates say 'medical condition' — protecting your privacy. Specific diagnoses are only included if you request it or if legally required.",
    },
    {
      q: "Can I get a certificate for mental health?",
      a: "Yes. Mental health conditions (stress, anxiety, burnout) are valid medical reasons for sick leave. The certificate won't specify 'mental health' unless you want it to.",
    },
    {
      q: "What if I need a certificate for carer's leave?",
      a: "We provide carer's certificates for looking after sick family members. Same process, same 15-minute turnaround.",
    },
    {
      q: "Does my employer see what I was sick with?",
      a: "No. Medical certificates state 'medical condition' without disclosing your diagnosis. Under Australian privacy law, your employer is entitled to know you were unfit for work and for how long — nothing more.",
    },
    {
      q: "Can I get a certificate while working from home?",
      a: "Yes. If you're too unwell to work — even from home — you're entitled to sick leave. Working from home doesn't change your leave entitlements. A doctor assesses whether you're fit for duties, regardless of location.",
    },
    {
      q: "What about mental health days?",
      a: "Mental health is a valid medical reason for sick leave. Burnout, anxiety, and acute stress are all conditions a doctor can assess. Corporate environments can be particularly demanding, and taking a day when you need one is both responsible and protected by law.",
    },
    {
      q: "Is this suitable for senior or executive roles?",
      a: "Yes. The process is the same regardless of your role level. Discreet, professional, and doesn't require informing anyone beyond your standard HR absence notification.",
    },
    {
      q: "Do I need a Medicare card?",
      a: "No. The consultation fee covers the doctor's assessment directly. Medicare is not involved.",
    },
    {
      q: "Can I use this for a sick child/dependent?",
      a: "Yes. Carer's leave certificates are available for when you need to care for an immediate family member or household member who is ill. Same process, same price.",
    },
    {
      q: "What if my company has its own medical certificate form?",
      a: "Most companies accept standard medical certificates. If your employer requires a specific form, let us know — in many cases, our certificate satisfies the same requirements. The key elements (doctor details, AHPRA registration, dates, signature) are universal.",
    },
  ]

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
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
                  <div className="mb-4"><SectionPill>For Corporate Professionals</SectionPill></div>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Medical Certificate Before HR Asks
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Unwell and working from home? Get your medical certificate in <strong>under 30 minutes</strong>, 24/7. Professional PDF delivered to your inbox — ready to forward to HR.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    All employers accept • Discreet • No time off work needed
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
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">PDF to email</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card px-3 py-1.5 rounded-full border border-border/50">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
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
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden border-border bg-muted/30 dark:bg-white/5">
                <div className="max-w-4xl mx-auto">
                  <div className="grid gap-4 sm:grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-semibold mb-1 text-muted-foreground">2 min</div>
                      <div className="text-xs text-muted-foreground">questionnaire</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold mb-1 text-muted-foreground">15 min</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold mb-1 text-muted-foreground">Instant</div>
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
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Why professionals choose InstantMed</h2>
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
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/50 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300">
                      <item.icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
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
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Common scenarios we help with</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: "WFH sick day", desc: "Too unwell to work but not sick enough for A&E" },
                    { title: "Mental health day", desc: "Stress, anxiety, or burnout affecting your work" },
                    { title: "Migraine day", desc: "Can't look at screens or concentrate" },
                    { title: "Gastro", desc: "Need to stay near the bathroom" },
                    { title: "Cold or flu", desc: "Don't want to spread it at the office" },
                    { title: "Carer's leave", desc: "Looking after a sick child or family member" },
                  ].map((item) => (
                    <div key={item.title} className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-xl p-4 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300">
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
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">What professionals say</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      name: "Sarah M.",
                      location: "Sydney",
                      quote: "Had a migraine and couldn&apos;t look at screens. Got my cert from bed, forwarded to HR, done.",
                    },
                    {
                      name: "David K.",
                      location: "Melbourne",
                      quote: "Didn&apos;t have to rearrange my whole day to get a cert. Did it between meetings.",
                    },
                    {
                      name: "Rachel T.",
                      location: "Brisbane",
                      quote: "Professional certificate, doctor was thorough. HR accepted it straight away.",
                    },
                    {
                      name: "James L.",
                      location: "Perth",
                      quote: "Working from home with a cold. Did it from the couch, cert came through same morning.",
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

          {/* Other Services */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Other services for busy professionals</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { title: "Repeat Scripts", desc: "Blood pressure, reflux, contraceptive", price: PRICING_DISPLAY.FROM_SCRIPT, href: "/prescriptions" },
                    { title: "Hair Loss", desc: "Discreet treatment options", price: `From ${PRICING_DISPLAY.REPEAT_SCRIPT}`, href: "/hair-loss" },
                    { title: "Weight Management", desc: "Doctor-guided programs", price: PRICING_DISPLAY.FROM_CONSULT, href: "/weight-management" },
                  ].map((item) => (
                    <Link key={item.title} href={item.href}>
                      <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-xl p-4 h-full hover:border-border transition-all">
                        <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                        <span className="text-xs text-muted-foreground font-medium">{item.price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Guide Section */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Reviewed by AHPRA-registered doctors
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2">Your guide to sick leave in the corporate world</h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Your entitlements, how online certificates work, and why digital healthcare makes sense for professionals.
                  </p>
                </div>

                {/* Guide content */}
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* 1. Corporate sick leave policies */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-2">Corporate sick leave policies and the Fair Work Act</h3>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The National Employment Standards provide 10 days of paid personal/carer&apos;s leave per year for full-time employees. However, many corporate employers offer more generous policies — some provide 15 to 20 days, and enterprise agreements may include additional categories like mental health days, wellness days, or extended personal leave. It&apos;s worth checking your employment contract or enterprise agreement to understand what you&apos;re entitled to beyond the legislative minimum.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Regardless of your employer&apos;s internal policy, the evidentiary requirement is the same. A medical certificate from an AHPRA-registered doctor satisfies the Fair Work Act&apos;s requirement for evidence of illness. The Act does not distinguish between certificates issued via telehealth and those from in-person consultations — both carry the same legal weight, a position confirmed by the Fair Work Commission in multiple decisions since 2020.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Discreet digital healthcare */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-2">The case for discreet, digital healthcare</h3>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Nobody wants to explain their illness to a receptionist within earshot of colleagues. And finding a GP near the office — one that isn&apos;t booked out for the next three days — is its own kind of ordeal. Online healthcare removes the awkwardness entirely. No waiting room full of people who might recognise you, no need to explain why you&apos;re leaving the office for a &quot;doctor&apos;s appointment,&quot; no need to sit in a car park filling out paperwork on your phone.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          It&apos;s handled from your phone or laptop, wherever you are. The certificate arrives in your email — a clean, professional PDF ready to forward to HR or upload to your leave management system. The entire process respects your time and your privacy, which is exactly what you&apos;d expect from a service designed for working professionals.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Mental health in corporate environments */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-2">Mental health in corporate environments</h3>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Despite growing awareness, many professionals still feel uncomfortable taking mental health days. The stigma is quieter now, but it hasn&apos;t disappeared — especially in high-performance corporate environments where &quot;pushing through&quot; is treated as a virtue. The reality: burnout, anxiety, and workplace stress are legitimate medical conditions that a doctor can assess and certify.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your certificate doesn&apos;t mention &quot;mental health&quot; — it simply confirms you were assessed and found unfit for duties. No different from a certificate for a migraine or the flu. Taking a day when you need one is both clinically appropriate and legally protected. It also prevents longer absences down the track. A single day of rest now is far less disruptive than a week of leave later because you didn&apos;t stop when you should have.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Navigating HR processes */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-2">Navigating HR processes</h3>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Most HR systems accept PDF medical certificates uploaded through their standard leave portal. Whether your company uses Workday, BambooHR, SAP SuccessFactors, or a simple email-based process, our PDF certificates are compatible. The key information — doctor&apos;s name, AHPRA number, dates, and signature — satisfies the requirements that HR teams and payroll departments look for.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Some companies have a 24-hour or same-day notification requirement for sick leave. Our turnaround means you can have your certificate ready before HR opens in the morning. No need to send a &quot;certificate to follow&quot; email and then spend half your sick day chasing one down.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 5. Beyond sick days */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Monitor className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-2">When corporate telehealth makes sense beyond sick days</h3>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Repeat prescriptions for ongoing medication — blood pressure, cholesterol, contraceptives — without rearranging your calendar for a lunchtime GP appointment. General health concerns you&apos;ve been putting off because back-to-back meetings don&apos;t leave room for a clinic visit. Follow-up on conditions your regular GP is managing, when the appointment is really just a check-in and a script renewal.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Professional healthcare that respects your time without compromising on quality. The same AHPRA-registered doctors, the same clinical standards — just without the 45-minute wait and the commute.
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
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">Questions HR might ask (answered)</h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {faqs.map((faq, i) => (
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
                <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-3xl p-6 lg:p-8 relative overflow-hidden border-border bg-muted/30 dark:bg-white/5">
                  <h2 className="text-2xl font-semibold mb-3">Certificate in under 30 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Professional, discreet, and ready for HR. Get sorted now.
                  </p>
                  <Link href="/request?service=med-cert">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-background text-sm h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">{PRICING_DISPLAY.FROM_MED_CERT} • Valid for all employers</p>
                </div>
              </div>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/for/shift-workers" className="text-muted-foreground hover:underline">
                  Shift Workers
                </Link>
                {" • "}
                <Link href="/medical-certificate" className="text-muted-foreground hover:underline">
                  Work Med Certs
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-muted-foreground hover:underline">
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
