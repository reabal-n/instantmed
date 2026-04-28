import { ArrowRight,MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { BreadcrumbSchema } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Heading } from "@/components/ui/heading"
import { getAllStateSlugs,statesData } from "@/lib/seo/data/states"

export const metadata: Metadata = {
  title: "Online Doctor | All Australian Locations",
  description:
    "Telehealth in Sydney, Melbourne, Brisbane, Perth, Adelaide & 20+ more cities. AHPRA-registered doctors Australia-wide.",
  openGraph: {
    title: "Online Doctor | All Australian Locations",
    description: "Telehealth in 25+ Australian cities. Med certs, scripts and consults from AHPRA-registered doctors.",
    url: "https://instantmed.com.au/locations",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Doctor | All Australian Locations",
    description: "Telehealth in 25+ Australian cities. Med certs, scripts and consults from AHPRA-registered doctors.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/locations",
  },
}

const cities = [
  { name: "Sydney", state: "NSW", slug: "sydney", population: "5.3M" },
  { name: "Melbourne", state: "VIC", slug: "melbourne", population: "5.1M" },
  { name: "Brisbane", state: "QLD", slug: "brisbane", population: "2.5M" },
  { name: "Perth", state: "WA", slug: "perth", population: "2.1M" },
  { name: "Adelaide", state: "SA", slug: "adelaide", population: "1.4M" },
  { name: "Gold Coast", state: "QLD", slug: "gold-coast", population: "700K" },
  { name: "Canberra", state: "ACT", slug: "canberra", population: "460K" },
  { name: "Newcastle", state: "NSW", slug: "newcastle", population: "320K" },
  { name: "Hobart", state: "TAS", slug: "hobart", population: "240K" },
  { name: "Darwin", state: "NT", slug: "darwin", population: "150K" },
  { name: "Sunshine Coast", state: "QLD", slug: "sunshine-coast", population: "350K" },
  { name: "Wollongong", state: "NSW", slug: "wollongong", population: "310K" },
  { name: "Geelong", state: "VIC", slug: "geelong", population: "270K" },
  { name: "Townsville", state: "QLD", slug: "townsville", population: "195K" },
  { name: "Cairns", state: "QLD", slug: "cairns", population: "160K" },
  { name: "Toowoomba", state: "QLD", slug: "toowoomba", population: "140K" },
  { name: "Ballarat", state: "VIC", slug: "ballarat", population: "115K" },
  { name: "Bendigo", state: "VIC", slug: "bendigo", population: "100K" },
  { name: "Launceston", state: "TAS", slug: "launceston", population: "90K" },
  { name: "Mackay", state: "QLD", slug: "mackay", population: "85K" },
  { name: "Rockhampton", state: "QLD", slug: "rockhampton", population: "80K" },
  { name: "Bunbury", state: "WA", slug: "bunbury", population: "75K" },
  { name: "Wagga Wagga", state: "NSW", slug: "wagga-wagga", population: "65K" },
  { name: "Albury-Wodonga", state: "NSW/VIC", slug: "albury-wodonga", population: "95K" },
  { name: "Hervey Bay", state: "QLD", slug: "hervey-bay", population: "55K" },
]

export default function LocationsPage() {
  const stateSlugs = getAllStateSlugs()

  return (
    <div className="flex min-h-screen flex-col">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "Locations", url: "https://instantmed.com.au/locations" },
      ]} />
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <Heading level="h1" className="text-center mb-4">Serving All of Australia</Heading>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              InstantMed is available in every Australian state and territory. Browse by state for regional
              context, or jump straight to your closest city.
            </p>

            {/* ─────────── Browse by state (primary hub entry) ─────────── */}
            <Heading level="h2" className="mb-5">Browse by state</Heading>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-14">
              {stateSlugs.map((slug) => {
                const state = statesData[slug]
                return (
                  <Link
                    key={slug}
                    href={`/locations/state/${slug}`}
                    className="group flex flex-col p-5 rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wide font-semibold text-primary">
                        {state.shortName}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-[transform,color]" />
                    </div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {state.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {state.population} · {state.cities.length}+ cities
                    </p>
                  </Link>
                )
              })}
            </div>

            {/* ─────────── Browse by city ─────────── */}
            <Heading level="h2" className="mb-5">Or browse by city</Heading>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/locations/${city.slug}`}
                  className="flex items-center justify-between p-5 rounded-xl border bg-card hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{city.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {city.state} • {city.population}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-xl bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                <strong>Not in a major city?</strong> No worries - InstantMed works anywhere in Australia with internet
                access. We serve regional and rural areas just as well as the cities.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
