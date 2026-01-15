import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, HardHat, Clock, Smartphone, Star, Wrench, Building } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Medical Certificates for Tradies | 15 Min Script | InstantMed",
  description: "Get your medical certificate without leaving the job site. 15-minute turnaround. Valid for all employers. No appointments, no waiting rooms. Built for tradies.",
  keywords: [
    "medical certificate tradies",
    "tradie sick certificate",
    "online medical certificate construction",
    "sick leave certificate tradies",
    "medical certificate for builders",
    "telehealth for tradies",
  ],
  openGraph: {
    title: "Medical Certificates for Tradies | 15 Min | InstantMed",
    description: "Get your med cert without leaving the site. 15-minute turnaround. Valid for all employers.",
    url: "https://instantmed.com.au/for/tradies",
  },
  alternates: {
    canonical: "https://instantmed.com.au/for/tradies",
  },
}

export default function TradiesPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I get a medical certificate on my phone?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Complete the questionnaire on your phone in about 2 minutes. Your certificate is reviewed by a doctor and delivered to your email — typically within 15 minutes. No need to leave the site.",
        },
      },
      {
        "@type": "Question",
        name: "Will my boss accept an online medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers, including construction companies, contractors, and agencies.",
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dawn-500/10 border border-dawn-500/20 mb-4 interactive-pill cursor-default">
                    <HardHat className="w-3.5 h-3.5 text-dawn-600" />
                    <span className="text-xs font-medium text-amber-700">Built for Tradies</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Get Your Med Cert Without Leaving Site
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    Woke up crook? Get your medical certificate on your phone in <strong>15 minutes</strong>. No doctor visits, no time off site, no stuffing around.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Valid for all employers • AHPRA doctors • Done from your phone
                  </p>

                  <Link href="/start?service=med-cert">
                    <Button size="lg" className="bg-dawn-500 hover:bg-dawn-600 text-white text-sm px-6">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Speed badges */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-dawn-500" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Smartphone className="h-3.5 w-3.5 text-dawn-500" />
                      <span className="font-medium text-muted-foreground">100% on your phone</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-dawn-500" />
                      <span className="font-medium text-muted-foreground">Boss-proof</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Speed Stats */}
          <section className="px-4 py-8 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden border-dawn-500/20 bg-amber-50/30 dark:bg-amber-950/10">
                <div className="max-w-4xl mx-auto">
                  <div className="grid gap-4 sm:grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-bold mb-1 text-dawn-600">2 min</div>
                      <div className="text-xs text-muted-foreground">to fill out</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-1 text-dawn-600">15 min</div>
                      <div className="text-xs text-muted-foreground">doctor review</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-1 text-dawn-600">Email</div>
                      <div className="text-xs text-muted-foreground">straight to your inbox</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Tradies Use This */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Why tradies use InstantMed</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: Clock,
                      title: "No time off site",
                      desc: "Do it from the ute, the lunchroom, or your couch. Takes 2 minutes.",
                    },
                    {
                      icon: Zap,
                      title: "Before smoko",
                      desc: "15-minute turnaround. Have your cert before your boss even asks.",
                    },
                    {
                      icon: Building,
                      title: "All employers accept it",
                      desc: "Valid for builders, contractors, agencies — anyone. Legally legit.",
                    },
                    {
                      icon: Smartphone,
                      title: "Works on your phone",
                      desc: "No computer needed. PDF delivered to your email, ready to forward.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <item.icon className="h-5 w-5 text-dawn-500 shrink-0 mt-0.5" />
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
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">What tradies say</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      name: "Jake R.",
                      trade: "Electrician, Newcastle",
                      quote: "Woke up crook, had my cert sorted before smoko. Absolute legend service.",
                    },
                    {
                      name: "Mick S.",
                      trade: "Plumber, Melbourne",
                      quote: "Boss was asking for a cert — got it done on my phone in the car. No dramas.",
                    },
                    {
                      name: "Chris D.",
                      trade: "Carpenter, Gold Coast",
                      quote: "Way easier than trying to get a GP appointment. Sorted in 15 mins flat.",
                    },
                    {
                      name: "Tom B.",
                      trade: "FIFO Worker, Perth",
                      quote: "Works even in remote WA. Had my cert before I could drive to a doctor.",
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
                        — {item.name}, {item.trade}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* What You Can Get */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">What you can get</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { title: "Sick Leave Cert", desc: "For when you&apos;re crook", price: "From $19.95" },
                    { title: "Carer's Leave Cert", desc: "Looking after sick family", price: "From $19.95" },
                    { title: "Repeat Scripts", desc: "Blood pressure, reflux, etc.", price: "From $29.95" },
                  ].map((item) => (
                    <div key={item.title} className="glass-card rounded-xl p-4 text-center">
                      <Wrench className="h-6 w-6 mx-auto mb-2 text-dawn-500" />
                      <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                      <span className="text-xs text-dawn-600 font-medium">{item.price}</span>
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
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Quick answers</h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {[
                    {
                      q: "Will my boss accept this?",
                      a: "Yes. It's a real medical certificate from a real AHPRA-registered doctor. Legally valid for all employers — builders, contractors, agencies, the lot.",
                    },
                    {
                      q: "How fast is it?",
                      a: "Fill out the form in 2 minutes. Doctor reviews it. Most certs are in your inbox within 15 minutes.",
                    },
                    {
                      q: "Can I get a cert for yesterday?",
                      a: "Yeah, we can backdate up to 48 hours if it makes sense clinically. Just say so when you fill it out.",
                    },
                    {
                      q: "What if I need a script too?",
                      a: "We do repeat prescriptions for common stuff — blood pressure meds, reflux, asthma inhalers. Same deal, 15 minutes, sent to your phone.",
                    },
                    {
                      q: "What's it cost?",
                      a: "Med certs from $19.95. Scripts from $29.95. One flat fee, no surprises.",
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-dawn-500/20 bg-amber-50/30 dark:bg-amber-950/10">
                  <h2 className="text-2xl font-bold mb-3">Sorted in 15 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get your cert on your phone. No stuffing around.
                  </p>
                  <Link href="/start?service=med-cert">
                    <Button size="lg" className="bg-dawn-500 hover:bg-dawn-600 text-white text-sm h-12 px-8">
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">From $19.95 • Valid for all employers</p>
                </div>
              </div>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/for/shift-workers" className="text-dawn-500 hover:underline">
                  Shift Workers
                </Link>
                {" • "}
                <Link href="/medical-certificate" className="text-dawn-500 hover:underline">
                  All Medical Certificates
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-dawn-500 hover:underline">
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
