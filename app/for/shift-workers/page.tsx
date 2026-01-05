import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, Clock, Moon, Star, Smartphone, Sun, Coffee, Hospital } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Medical Certificates for Shift Workers | 24/7 Available | InstantMed",
  description: "Get a medical certificate any time of day or night. 15-minute turnaround. Perfect for nurses, hospitality, retail, and anyone working outside 9-5. Valid for all employers.",
  keywords: [
    "medical certificate shift workers",
    "night shift sick certificate",
    "24 hour medical certificate",
    "nurse medical certificate online",
    "hospitality medical certificate",
    "retail worker sick certificate",
  ],
  openGraph: {
    title: "Medical Certificates for Shift Workers | 24/7 | InstantMed",
    description: "Get your med cert any time. 15-minute turnaround. Perfect for shift workers.",
    url: "https://instantmed.com.au/for/shift-workers",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/shift-workers",
  },
}

export default function ShiftWorkersPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I get a medical certificate outside normal business hours?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Our service operates 8am-10pm AEST, 7 days a week. Most certificates are issued within 15 minutes during these hours — perfect for shift workers who need documentation outside typical GP hours.",
        },
      },
      {
        "@type": "Question",
        name: "Will my employer accept an online medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers, including hospitals, retail, hospitality, and warehouses.",
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
          <section className="px-4 py-12 sm:py-20 bg-linear-to-b from-purple-500/10 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 text-sm mb-6">
                <Moon className="h-4 w-4" />
                For Shift Workers
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Medical Certificates When GPs Are Closed
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-4">
                Night shift? Early start? Weekend roster? Get your medical certificate in <strong>15 minutes</strong> — anytime between 8am-10pm, 7 days a week.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Works around your roster • All employers accept • AHPRA doctors
              </p>

              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white text-base px-8">
                  Get Certificate Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">8am-10pm, 7 days</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span>15 min turnaround</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span>All employers</span>
                </div>
              </div>
            </div>
          </section>

          {/* Availability Bar */}
          <section className="px-4 py-8 bg-purple-600 text-white">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 sm:grid-cols-4 text-center">
                <div className="flex flex-col items-center">
                  <Sun className="h-6 w-6 mb-2" />
                  <div className="text-sm font-medium">Early mornings</div>
                  <div className="text-xs text-white/70">From 8am</div>
                </div>
                <div className="flex flex-col items-center">
                  <Coffee className="h-6 w-6 mb-2" />
                  <div className="text-sm font-medium">Business hours</div>
                  <div className="text-xs text-white/70">9am-5pm</div>
                </div>
                <div className="flex flex-col items-center">
                  <Moon className="h-6 w-6 mb-2" />
                  <div className="text-sm font-medium">Evenings</div>
                  <div className="text-xs text-white/70">Until 10pm</div>
                </div>
                <div className="flex flex-col items-center">
                  <Star className="h-6 w-6 mb-2" />
                  <div className="text-sm font-medium">Weekends</div>
                  <div className="text-xs text-white/70">Sat & Sun</div>
                </div>
              </div>
            </div>
          </section>

          {/* Industries */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-8 text-center">Popular with shift workers in</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { icon: Hospital, title: "Healthcare", examples: "Nurses, aged care, hospital staff" },
                  { icon: Coffee, title: "Hospitality", examples: "Chefs, waitstaff, hotel workers" },
                  { icon: Clock, title: "Retail", examples: "Supermarkets, shops, warehouse" },
                  { icon: Moon, title: "Security", examples: "Guards, patrol, monitoring" },
                  { icon: Smartphone, title: "Transport", examples: "Drivers, logistics, delivery" },
                  { icon: Sun, title: "Manufacturing", examples: "Factory workers, production" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-muted/30">
                    <item.icon className="h-6 w-6 text-purple-600 shrink-0" />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.examples}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why Shift Workers Use This */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-8 text-center">Why shift workers choose InstantMed</h2>
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
                  <div key={item.title} className="p-5 rounded-xl bg-background">
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold text-center mb-8">What shift workers say</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    name: "Lisa R.",
                    role: "Nurse, Adelaide",
                    quote: "Finished night shift feeling terrible. Got my cert at 7am before I even tried to sleep. Sorted.",
                  },
                  {
                    name: "Marcus P.",
                    role: "Chef, Melbourne",
                    quote: "Hospitality hours mean I can&apos;t see a GP during the week. This saved me so much hassle.",
                  },
                  {
                    name: "Emma T.",
                    role: "Retail Manager, Brisbane",
                    quote: "Got sick on a Sunday. Had my cert to HR before Monday morning. No stress.",
                  },
                  {
                    name: "Dave K.",
                    role: "Security, Sydney",
                    quote: "Night shift life makes doctor appointments impossible. This is exactly what I needed.",
                  },
                ].map((item) => (
                  <div key={item.name} className="p-5 rounded-xl bg-muted/30">
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm mb-3">&quot;{item.quote}&quot;</p>
                    <p className="text-xs text-muted-foreground">
                      — {item.name}, {item.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-8 text-center">How it works</h2>
              <div className="grid gap-6 sm:grid-cols-3">
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
                  <div key={item.step} className="text-center p-4 bg-background rounded-xl">
                    <div className="h-12 w-12 rounded-full bg-purple-600/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-xl text-purple-600">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.desc}</p>
                    <span className="inline-block text-xs bg-purple-600/10 text-purple-600 px-2 py-0.5 rounded-full">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-xl font-bold text-center mb-8">Quick answers</h2>
              <div className="space-y-4">
                {[
                  {
                    q: "What are your hours?",
                    a: "We're available 8am-10pm AEST, 7 days a week including public holidays. Most certificates are issued within 15 minutes during these hours.",
                  },
                  {
                    q: "I work nights — can I get a cert after 10pm?",
                    a: "Submissions received after 10pm will be processed from 8am the next morning. You can submit anytime, but review happens during operating hours.",
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
                    a: "Medical certificates are $19.95. One flat fee, no hidden costs. Scripts from $29.95.",
                  },
                ].map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-muted/30">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16 bg-muted/30">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Get your certificate in 15 minutes</h2>
              <p className="text-muted-foreground mb-6">
                Works around your roster, not the other way around.
              </p>
              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Get Certificate Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="mt-4 text-xs text-muted-foreground">$19.95 • 8am-10pm, 7 days</p>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/for/tradies" className="text-purple-600 hover:underline">
                  Tradies
                </Link>
                {" • "}
                <Link href="/for/corporate" className="text-purple-600 hover:underline">
                  Corporate Workers
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-purple-600 hover:underline">
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
