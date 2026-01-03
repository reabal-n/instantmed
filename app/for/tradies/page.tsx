import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, HardHat, Clock, Smartphone, Star, Wrench, Building } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey issues during build
export const dynamic = "force-dynamic"

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
          <section className="px-4 py-12 sm:py-20 bg-linear-to-b from-amber-500/10 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-sm mb-6">
                <HardHat className="h-4 w-4" />
                Built for Tradies
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Get Your Med Cert Without Leaving Site
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-4">
                Woke up crook? Get your medical certificate on your phone in <strong>15 minutes</strong>. No doctor visits, no time off site, no stuffing around.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Valid for all employers • AHPRA doctors • Done from your phone
              </p>

              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white text-base px-8">
                  Get Certificate Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              {/* Speed badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">15 min turnaround</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Smartphone className="h-4 w-4 text-amber-500" />
                  <span>100% on your phone</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span>Boss-proof</span>
                </div>
              </div>
            </div>
          </section>

          {/* Speed Stats */}
          <section className="px-4 py-8 bg-amber-500 text-white">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 sm:grid-cols-3 text-center">
                <div>
                  <div className="text-3xl font-bold mb-1">2 min</div>
                  <div className="text-sm text-white/80">to fill out</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">15 min</div>
                  <div className="text-sm text-white/80">doctor review</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">Email</div>
                  <div className="text-sm text-white/80">straight to your inbox</div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Tradies Use This */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-8 text-center">Why tradies use InstantMed</h2>
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
                  <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-muted/30">
                    <item.icon className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold text-center mb-8">What tradies say</h2>
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
                  <div key={item.name} className="p-5 rounded-xl bg-background">
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm mb-3">&quot;{item.quote}&quot;</p>
                    <p className="text-xs text-muted-foreground">
                      — {item.name}, {item.trade}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What You Can Get */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">What you can get</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: "Sick Leave Cert", desc: "For when you&apos;re crook", price: "From $19.95" },
                  { title: "Carer's Leave Cert", desc: "Looking after sick family", price: "From $19.95" },
                  { title: "Repeat Scripts", desc: "Blood pressure, reflux, etc.", price: "From $29.95" },
                ].map((item) => (
                  <div key={item.title} className="p-5 rounded-xl border bg-card text-center">
                    <Wrench className="h-8 w-8 mx-auto mb-3 text-amber-500" />
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.desc}</p>
                    <span className="text-xs text-amber-600 font-medium">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-xl font-bold text-center mb-8">Quick answers</h2>
              <div className="space-y-4">
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
                  <div key={i} className="p-5 rounded-xl bg-background">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Sorted in 15 minutes</h2>
              <p className="text-muted-foreground mb-6">
                Get your cert on your phone. No stuffing around.
              </p>
              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white">
                  Get Certificate Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="mt-4 text-xs text-muted-foreground">From $19.95 • Valid for all employers</p>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/for/shift-workers" className="text-amber-500 hover:underline">
                  Shift Workers
                </Link>
                {" • "}
                <Link href="/medical-certificate" className="text-amber-500 hover:underline">
                  All Medical Certificates
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-amber-500 hover:underline">
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
