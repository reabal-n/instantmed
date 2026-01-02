import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Clock, Shield, Star, CheckCircle2, Zap, Building2, GraduationCap, HardHat } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Suburb/City data for "medical certificate online [location]" SEO
const suburbs: Record<
  string,
  {
    name: string
    state: string
    stateShort: string
    region?: string
    population?: string
    localFlair: string
    testimonial?: { name: string; quote: string; occupation: string }
  }
> = {
  // NSW
  sydney: {
    name: "Sydney",
    state: "New South Wales",
    stateShort: "NSW",
    population: "5.3 million",
    localFlair: "From Bondi to Parramatta",
    testimonial: {
      name: "Marcus T.",
      quote: "Got my cert sorted on the train to work. Certificate in my inbox before I reached Central.",
      occupation: "Project Manager",
    },
  },
  parramatta: {
    name: "Parramatta",
    state: "New South Wales",
    stateShort: "NSW",
    region: "Western Sydney",
    localFlair: "Serving all of Western Sydney",
    testimonial: {
      name: "Priya S.",
      quote: "So much easier than trying to find a bulk-billing GP in Parra. Done in 15 minutes.",
      occupation: "Retail Manager",
    },
  },
  "bondi-beach": {
    name: "Bondi Beach",
    state: "New South Wales",
    stateShort: "NSW",
    region: "Eastern Suburbs",
    localFlair: "From Bondi to Coogee",
  },
  newcastle: {
    name: "Newcastle",
    state: "New South Wales",
    stateShort: "NSW",
    population: "320,000",
    localFlair: "Hunter region covered",
    testimonial: {
      name: "Jake R.",
      quote: "Woke up crook, had my med cert before smoko. Legend service.",
      occupation: "Sparky",
    },
  },
  wollongong: {
    name: "Wollongong",
    state: "New South Wales",
    stateShort: "NSW",
    region: "Illawarra",
    localFlair: "Illawarra to Shoalhaven",
  },
  // VIC
  melbourne: {
    name: "Melbourne",
    state: "Victoria",
    stateShort: "VIC",
    population: "5.1 million",
    localFlair: "From St Kilda to the outer suburbs",
    testimonial: {
      name: "Sarah L.",
      quote: "Way easier than waiting 3 weeks for a GP appointment in the inner north.",
      occupation: "Marketing Coordinator",
    },
  },
  geelong: {
    name: "Geelong",
    state: "Victoria",
    stateShort: "VIC",
    population: "270,000",
    localFlair: "Serving the Surf Coast",
  },
  ballarat: {
    name: "Ballarat",
    state: "Victoria",
    stateShort: "VIC",
    region: "Regional Victoria",
    localFlair: "Central Highlands covered",
  },
  // QLD
  brisbane: {
    name: "Brisbane",
    state: "Queensland",
    stateShort: "QLD",
    population: "2.5 million",
    localFlair: "From the Valley to the bayside",
    testimonial: {
      name: "Emma T.",
      quote: "Perfect for when you need something quick without leaving Fortitude Valley.",
      occupation: "Hospitality Worker",
    },
  },
  "gold-coast": {
    name: "Gold Coast",
    state: "Queensland",
    stateShort: "QLD",
    population: "700,000",
    localFlair: "Surfers to Coolangatta",
    testimonial: {
      name: "Chris D.",
      quote: "Got my script while at Surfers. Picked it up from the pharmacy an hour later.",
      occupation: "Tradie",
    },
  },
  "sunshine-coast": {
    name: "Sunshine Coast",
    state: "Queensland",
    stateShort: "QLD",
    population: "350,000",
    localFlair: "Caloundra to Noosa",
  },
  cairns: {
    name: "Cairns",
    state: "Queensland",
    stateShort: "QLD",
    region: "Far North Queensland",
    localFlair: "FNQ covered",
  },
  townsville: {
    name: "Townsville",
    state: "Queensland",
    stateShort: "QLD",
    region: "North Queensland",
    localFlair: "North QLD's telehealth option",
  },
  // WA
  perth: {
    name: "Perth",
    state: "Western Australia",
    stateShort: "WA",
    population: "2.1 million",
    localFlair: "Fremantle to Joondalup",
    testimonial: {
      name: "Michael K.",
      quote: "Finally a service that understands WA time zone! Certificate in my inbox by lunch.",
      occupation: "FIFO Worker",
    },
  },
  fremantle: {
    name: "Fremantle",
    state: "Western Australia",
    stateShort: "WA",
    region: "Perth Metro",
    localFlair: "Port city convenience",
  },
  // SA
  adelaide: {
    name: "Adelaide",
    state: "South Australia",
    stateShort: "SA",
    population: "1.4 million",
    localFlair: "From Glenelg to the hills",
    testimonial: {
      name: "Lisa R.",
      quote: "Quick, easy, and the doctors actually take their time to read your symptoms.",
      occupation: "Nurse",
    },
  },
  // TAS
  hobart: {
    name: "Hobart",
    state: "Tasmania",
    stateShort: "TAS",
    population: "240,000",
    localFlair: "Serving all of Tasmania",
    testimonial: {
      name: "Amy S.",
      quote: "Great option when you can't get in to see anyone locally.",
      occupation: "Teacher",
    },
  },
  launceston: {
    name: "Launceston",
    state: "Tasmania",
    stateShort: "TAS",
    region: "Northern Tasmania",
    localFlair: "Northern Tassie covered",
  },
  // NT
  darwin: {
    name: "Darwin",
    state: "Northern Territory",
    stateShort: "NT",
    population: "150,000",
    localFlair: "Top End telehealth",
    testimonial: {
      name: "Tom B.",
      quote: "Works perfectly even in the Top End. Fast service despite the distance.",
      occupation: "Mine Worker",
    },
  },
  // ACT
  canberra: {
    name: "Canberra",
    state: "Australian Capital Territory",
    stateShort: "ACT",
    population: "460,000",
    localFlair: "Serving the capital",
    testimonial: {
      name: "Nicole W.",
      quote: "Better than waiting weeks for a bulk-billing appointment in the ACT.",
      occupation: "Public Servant",
    },
  },
}

interface PageProps {
  params: Promise<{ suburb: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { suburb } = await params
  const data = suburbs[suburb]
  if (!data) return {}

  const title = `Medical Certificate Online ${data.name} | 15 Min Turnaround | InstantMed`
  const description = `Get a medical certificate online in ${data.name}, ${data.stateShort}. Australian doctors, 15-minute turnaround. Valid for all employers. No waiting rooms, no appointments.`

  return {
    title,
    description,
    keywords: [
      `medical certificate online ${data.name.toLowerCase()}`,
      `online medical certificate ${data.name.toLowerCase()}`,
      `sick certificate ${data.name.toLowerCase()}`,
      `doctor certificate online ${data.stateShort.toLowerCase()}`,
      `telehealth medical certificate ${data.name.toLowerCase()}`,
      `get medical certificate online ${data.name.toLowerCase()}`,
    ],
    openGraph: {
      title,
      description,
      url: `https://instantmed.com.au/medical-certificate/${suburb}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/medical-certificate/${suburb}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(suburbs).map((suburb) => ({ suburb }))
}

export default async function SuburbMedCertPage({ params }: PageProps) {
  const { suburb } = await params
  const data = suburbs[suburb]

  if (!data) {
    notFound()
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Can I get a medical certificate online in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes! InstantMed provides online medical certificates to ${data.name} residents. Complete a quick questionnaire, get reviewed by an AHPRA-registered doctor, and receive your certificate — typically within 15 minutes.`,
        },
      },
      {
        "@type": "Question",
        name: "Will my employer accept an online medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers in Australia, including those in " + data.name + ".",
        },
      },
      {
        "@type": "Question",
        name: "How fast can I get my medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most certificates are issued within 15 minutes during business hours (8am-10pm AEST). You'll receive a secure PDF via email.",
        },
      },
    ],
  }

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `InstantMed - Online Medical Certificates ${data.name}`,
    description: `Online medical certificates for ${data.name} residents`,
    areaServed: {
      "@type": "City",
      name: data.name,
      containedInPlace: { "@type": "State", name: data.state },
    },
    priceRange: "$$",
    openingHours: "Mo-Su 08:00-22:00",
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-[#00E2B5]/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00E2B5]/10 text-[#00E2B5] text-sm mb-6">
                <MapPin className="h-4 w-4" />
                {data.name}, {data.stateShort}
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Get a Medical Certificate Online in {data.name}
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Skip the waiting room. Get your medical certificate reviewed by an Australian doctor and delivered to your inbox — typically in <strong>15 minutes</strong>.
              </p>

              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C] text-base px-8">
                  Get Certificate Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              {/* Speed-focused trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full">
                  <Zap className="h-4 w-4 text-[#00E2B5]" />
                  <span className="font-medium">15 min turnaround</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full">
                  <Shield className="h-4 w-4 text-[#00E2B5]" />
                  <span>AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                  <span>Employer accepted</span>
                </div>
              </div>
            </div>
          </section>

          {/* Speed Promise */}
          <section className="px-4 py-10 bg-[#0A0F1C] text-white">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 sm:grid-cols-3 text-center">
                <div>
                  <div className="text-4xl font-bold text-[#00E2B5] mb-1">2 min</div>
                  <div className="text-sm text-white/70">to complete questionnaire</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#00E2B5] mb-1">15 min</div>
                  <div className="text-sm text-white/70">typical doctor review</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#00E2B5] mb-1">Instant</div>
                  <div className="text-sm text-white/70">PDF delivery to email</div>
                </div>
              </div>
            </div>
          </section>

          {/* Who uses this */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Popular with {data.name} locals</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: HardHat, label: "Tradies", desc: "No time off site" },
                  { icon: GraduationCap, label: "Students", desc: "Uni & TAFE accepted" },
                  { icon: Building2, label: "Office workers", desc: "Before your boss asks" },
                  { icon: Clock, label: "Shift workers", desc: "24/7 availability" },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 rounded-xl bg-muted/30">
                    <item.icon className="h-8 w-8 mx-auto mb-2 text-[#00E2B5]" />
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Local Testimonial */}
          {data.testimonial && (
            <section className="px-4 py-12 bg-muted/30">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-lg mb-4">&quot;{data.testimonial.quote}&quot;</blockquote>
                <p className="text-sm text-muted-foreground">
                  — {data.testimonial.name}, {data.testimonial.occupation} in {data.name}
                </p>
              </div>
            </section>
          )}

          {/* How It Works */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-8 text-center">How to get your medical certificate</h2>
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  {
                    step: "1",
                    title: "Quick questionnaire",
                    desc: "Tell us why you need a certificate. Takes about 2 minutes.",
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
                    desc: "Secure PDF sent to your email. Valid for all employers.",
                    time: "Instant",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4">
                    <div className="h-12 w-12 rounded-full bg-[#00E2B5]/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-xl text-[#00E2B5]">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.desc}</p>
                    <span className="inline-block text-xs bg-[#00E2B5]/10 text-[#00E2B5] px-2 py-0.5 rounded-full">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-xl font-bold text-center mb-8">
                Medical Certificates in {data.name} — FAQ
              </h2>
              <div className="space-y-4">
                {[
                  {
                    q: `Can I get a medical certificate online in ${data.name}?`,
                    a: `Yes! InstantMed provides online medical certificates to ${data.name} residents and anyone in ${data.stateShort}. Complete a quick questionnaire, get reviewed by an AHPRA-registered doctor, and receive your certificate — typically within 15 minutes.`,
                  },
                  {
                    q: "Will my employer accept this certificate?",
                    a: `Absolutely. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers, including those in ${data.name}. Each certificate includes the doctor's name, provider number, and signature.`,
                  },
                  {
                    q: "How fast can I get my certificate?",
                    a: "Most certificates are reviewed and issued within 15 minutes during business hours (8am-10pm AEST). You'll receive a secure PDF via email as soon as it's approved.",
                  },
                  {
                    q: "Can I get a certificate for yesterday?",
                    a: "We can backdate certificates up to 48 hours if clinically appropriate. Just indicate the dates you were unwell when completing the questionnaire.",
                  },
                  {
                    q: "What does it cost?",
                    a: "Medical certificates start from $19.95. One flat fee, no hidden costs. If your request isn't approved, you'll receive a refund minus a small admin fee.",
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
          <section className="px-4 py-12">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready in 15 minutes</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of {data.name} residents who skip the waiting room with InstantMed.
              </p>
              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                  Get Your Certificate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="mt-4 text-xs text-muted-foreground">From $19.95 • Valid for all employers</p>
            </div>
          </section>

          {/* Other Locations */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm text-muted-foreground text-center">
                Also serving:{" "}
                {Object.entries(suburbs)
                  .filter(([key]) => key !== suburb)
                  .slice(0, 6)
                  .map(([key, s], i, arr) => (
                    <span key={key}>
                      <Link href={`/medical-certificate/${key}`} className="text-[#00E2B5] hover:underline">
                        {s.name}
                      </Link>
                      {i < arr.length - 1 && " • "}
                    </span>
                  ))}
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
