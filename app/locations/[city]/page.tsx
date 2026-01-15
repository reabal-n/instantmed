import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Clock, Shield, Star, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Local SEO Pages - Top 10 Australian cities
const cities: Record<
  string,
  {
    name: string
    state: string
    slug: string
    population: string
    localTestimonial?: { name: string; quote: string }
  }
> = {
  sydney: {
    name: "Sydney",
    state: "NSW",
    slug: "sydney",
    population: "5.3 million",
    localTestimonial: {
      name: "Sarah M.",
      quote: "Got my med cert sorted while stuck on a train at Town Hall. Absolute lifesaver!",
    },
  },
  melbourne: {
    name: "Melbourne",
    state: "VIC",
    slug: "melbourne",
    population: "5.1 million",
    localTestimonial: { name: "James L.", quote: "Way easier than trying to get a same-day appointment in the CBD." },
  },
  brisbane: {
    name: "Brisbane",
    state: "QLD",
    slug: "brisbane",
    population: "2.5 million",
    localTestimonial: {
      name: "Emma T.",
      quote: "Perfect for when you need something quick without leaving Fortitude Valley.",
    },
  },
  perth: {
    name: "Perth",
    state: "WA",
    slug: "perth",
    population: "2.1 million",
    localTestimonial: { name: "Michael K.", quote: "Finally a service that understands WA time zone!" },
  },
  adelaide: {
    name: "Adelaide",
    state: "SA",
    slug: "adelaide",
    population: "1.4 million",
    localTestimonial: {
      name: "Lisa R.",
      quote: "Quick, easy, and the doctors actually take their time to read your symptoms.",
    },
  },
  "gold-coast": {
    name: "Gold Coast",
    state: "QLD",
    slug: "gold-coast",
    population: "700,000",
    localTestimonial: {
      name: "Chris D.",
      quote: "Got my script while at Surfers. Picked it up from the pharmacy an hour later.",
    },
  },
  canberra: {
    name: "Canberra",
    state: "ACT",
    slug: "canberra",
    population: "460,000",
    localTestimonial: { name: "Nicole W.", quote: "Better than waiting weeks for a bulk-billing appointment." },
  },
  newcastle: {
    name: "Newcastle",
    state: "NSW",
    slug: "newcastle",
    population: "320,000",
    localTestimonial: { name: "David H.", quote: "Super convenient when you&apos;re too crook to drive to the GP." },
  },
  hobart: {
    name: "Hobart",
    state: "TAS",
    slug: "hobart",
    population: "240,000",
    localTestimonial: { name: "Amy S.", quote: "Great option when you can&apos;t get in to see anyone locally." },
  },
  darwin: {
    name: "Darwin",
    state: "NT",
    slug: "darwin",
    population: "150,000",
    localTestimonial: { name: "Tom B.", quote: "Works perfectly even in the Top End. Fast service." },
  },
}

const services = [
  { name: "Medical Certificates", href: "/medical-certificate", price: "From $19.95" },
  { name: "Prescriptions", href: "/prescriptions", price: "From $29.95" },
]

interface PageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  const cityData = cities[city]
  if (!cityData) return {}

  return {
    title: `Online Doctor ${cityData.name} | Telehealth ${cityData.state} | InstantMed`,
    description: `Get online doctor consultations in ${cityData.name}. Medical certificates and prescriptions from AHPRA-registered doctors. Serving all of ${cityData.state}.`,
    keywords: [
      `online doctor ${cityData.name.toLowerCase()}`,
      `telehealth ${cityData.name.toLowerCase()}`,
      `medical certificate ${cityData.name.toLowerCase()}`,
      `online prescription ${cityData.name.toLowerCase()}`,
    ],
    openGraph: {
      title: `Online Doctor ${cityData.name} | InstantMed`,
      description: `Telehealth consultations for ${cityData.name} residents. Fast, affordable, and convenient.`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/locations/${city}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(cities).map((city) => ({ city }))
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params
  const cityData = cities[city]

  if (!cityData) {
    notFound()
  }

  // Local Business Schema
  const localSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `InstantMed - Online Doctor ${cityData.name}`,
    description: `Online doctor consultations for ${cityData.name} residents`,
    areaServed: {
      "@type": "City",
      name: cityData.name,
      containedInPlace: { "@type": "State", name: cityData.state },
    },
    priceRange: "$$",
    openingHours: "Mo-Su 08:00-22:00",
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-[#2563EB]/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-sm mb-6">
                <MapPin className="h-4 w-4" />
                Serving {cityData.name}, {cityData.state}
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Online Doctor in {cityData.name}
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Skip the waiting room. Get medical certificates and prescriptions online — reviewed by
                Australian doctors, delivered to your phone.
              </p>

              <Link href="/request">
                <Button size="lg" className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-[#0A0F1C] text-base px-8">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#2563EB]" />
                  <span>Usually under 1 hour</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#2563EB]" />
                  <span>AHPRA-registered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-[#2563EB]" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
          </section>

          {/* Services */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Services Available in {cityData.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <Link key={service.href} href={service.href}>
                    <div className="p-5 rounded-xl border bg-card hover:border-[#2563EB] transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.price}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Local Testimonial */}
          {cityData.localTestimonial && (
            <section className="px-4 py-12 bg-muted/30">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-dawn-400 text-dawn-400" />
                  ))}
                </div>
                <blockquote className="text-lg mb-4">&quot;{cityData.localTestimonial.quote}&quot;</blockquote>
                <p className="text-sm text-muted-foreground">
                  — {cityData.localTestimonial.name}, {cityData.name}
                </p>
              </div>
            </section>
          )}

          {/* How It Works */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">How It Works for {cityData.name} Patients</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    step: "1",
                    title: "Tell us what you need",
                    desc: "Answer a few quick questions about your health concern",
                  },
                  {
                    step: "2",
                    title: "Doctor reviews",
                    desc: "An Australian GP reviews your request (usually within 1 hour)",
                  },
                  { step: "3", title: "Get your result", desc: "Certificate, script, or referral sent to your phone" },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4">
                    <div className="h-10 w-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-[#2563EB]">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why Telehealth */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Why {cityData.name} Residents Choose InstantMed</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "No need to leave home or work",
                  "Skip the waiting room",
                  "Same-day service, most requests",
                  "Prescriptions sent to any pharmacy",
                  "Valid for all Australian employers",
                  "Reviewed by real Australian doctors",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of {cityData.name} residents who trust InstantMed for their telehealth needs.
              </p>
              <Link href="/request">
                <Button size="lg" className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-[#0A0F1C]">
                  Start Your Request
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Other Cities */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm text-muted-foreground text-center">
                Also serving:{" "}
                {Object.values(cities)
                  .filter((c) => c.slug !== city)
                  .slice(0, 5)
                  .map((c, i, arr) => (
                    <span key={c.slug}>
                      <Link href={`/locations/${c.slug}`} className="text-[#2563EB] hover:underline">
                        {c.name}
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
