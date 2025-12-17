import Link from "next/link"
import type { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, Briefcase, Heart, Calendar, Zap, HelpCircle } from "lucide-react"
import { ContextualSocialProof, ServiceStats } from "@/components/shared/contextual-social-proof"
import { DoctorsOnline, CompletionTime } from "@/components/shared/urgency-indicators"

export const metadata: Metadata = {
  title: "Online Medical Certificate Australia | Same Day Sick Note | InstantMed",
  description:
    "Get an online medical certificate in under an hour. Valid for work, uni, or carer's leave. From $19.95. No phone calls, no video. AHPRA-registered Australian doctors.",
  keywords: [
    "online medical certificate",
    "sick certificate online",
    "medical certificate for work",
    "doctor certificate online",
    "same day medical certificate",
    "medical certificate australia",
  ],
  openGraph: {
    title: "Online Medical Certificate | Under 1 Hour | InstantMed",
    description: "Need a sickie cert? Sorted in under an hour. Valid for work, uni or carer's leave. From $19.95.",
    url: "https://instantmed.com.au/medical-certificate",
  },
}

const CERT_TYPES = [
  {
    id: "personal",
    title: "Personal Sick Leave",
    subtitle: "1-2 days off work or uni",
    price: "$19.95",
    time: "~45 min",
    icon: Briefcase,
    description: "For when you're unwell and need a day or two to recover.",
    popular: true,
    href: "/medical-certificate/request?type=personal",
  },
  {
    id: "carer",
    title: "Carer's Leave",
    subtitle: "Looking after someone",
    price: "$19.95",
    time: "~45 min",
    icon: Heart,
    description: "For when you need to care for a sick family member.",
    popular: false,
    href: "/medical-certificate/request?type=carer",
  },
  {
    id: "extended",
    title: "Multi-day or Backdated",
    subtitle: "3+ days or past dates",
    price: "$29.95",
    time: "~1 hour",
    icon: Calendar,
    description: "May require a brief phone consult with the doctor.",
    popular: false,
    href: "/medical-certificate/request?type=extended",
  },
]

const FAQS = [
  {
    q: "Will my employer accept this?",
    a: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers and universities.",
  },
  {
    q: "Can you backdate a certificate?",
    a: "Sometimes. If clinically appropriate, a doctor may issue a certificate for recent dates. This requires the $29.95 extended consultation.",
  },
  {
    q: "What if I'm actually quite sick?",
    a: "Then you definitely should get a certificate. If we identify any red flags, we'll let you know if you should seek in-person care.",
  },
  {
    q: "How do I receive my certificate?",
    a: "Once approved, your certificate is emailed to you as a PDF. You can also download it from your patient dashboard.",
  },
]

export default function MedicalCertificatePage() {
  return (
    <div className="flex min-h-screen flex-col bg-premium-mesh">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 py-20 sm:py-28 overflow-hidden">
          {/* Premium gradient orbs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" style={{ background: 'radial-gradient(circle, rgba(0,226,181,0.12) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="flex items-center justify-center gap-3 mb-6 animate-slide-up">
              <DoctorsOnline />
              <div className="glass px-4 py-1.5 rounded-full flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground/80">Usually under 1 hour</span>
              </div>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 animate-slide-up-delay-1">
              Need a sickie cert? <span className="text-gradient">Sorted.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6 animate-slide-up-delay-2">
              Get a valid medical certificate for work or uni. Reviewed by real Australian GPs. No phone calls, no video
              chats. Just fill in the form and go back to bed.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm mb-10 animate-slide-up-delay-2">
              <ServiceStats service="medical-certificate" />
              <span className="text-border">•</span>
              <CompletionTime />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-slide-up-delay-3">
              <Button asChild size="lg" className="btn-liquid px-10 h-14 text-base">
                <Link href="/medical-certificate/request">
                  Get my certificate
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">From $19.95 · Valid for all employers</span>
            </div>

            <div>
              <ContextualSocialProof service="medical-certificate" variant="inline" />
            </div>
          </div>
        </section>

        {/* Certificate Type Cards */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {CERT_TYPES.map((cert) => (
                <Link
                  key={cert.id}
                  href={cert.href}
                  className="group block"
                >
                  <div className="glass-card relative rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2" style={{ boxShadow: '0 4px 24px rgba(0,226,181,0.08)' }}>
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg, transparent, #00E2B5, transparent)' }} />
                    
                    {cert.popular && (
                      <span className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg" style={{ boxShadow: '0 4px 12px rgba(0,226,181,0.3)' }}>
                        ✨ Most popular
                      </span>
                    )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <cert.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {cert.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{cert.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{cert.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-foreground">{cert.price}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {cert.time}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Get started <ArrowRight className="w-4 h-4" />
                  </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick CTA for unsure users */}
            <div className="mt-6 text-center">
              <Link href="/medical-certificate/request">
                <Button size="lg" className="rounded-full px-8">
                  Not sure? Start here
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works mini-timeline */}
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-semibold text-center mb-8">How it works</h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              {[
                { step: 1, title: "Answer a few questions", time: "2 min" },
                { step: 2, title: "GP reviews your request", time: "~45 min" },
                { step: 3, title: "Certificate emailed to you", time: "Instant" },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-4 sm:flex-col sm:text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.time}</p>
                  </div>
                  {i < 2 && <ArrowRight className="hidden sm:block w-5 h-5 text-muted-foreground/50 mx-auto" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-xl font-semibold text-center mb-8 flex items-center justify-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Common questions
            </h2>

            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-medium text-foreground mb-1">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
