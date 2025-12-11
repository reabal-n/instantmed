import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { MapPin, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online Doctor Australia | All Locations | InstantMed",
  description:
    "InstantMed serves all of Australia. Find telehealth services in Sydney, Melbourne, Brisbane, Perth, Adelaide, and more.",
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
]

export default function LocationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-4">Serving All of Australia</h1>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              InstantMed is available nationwide. No matter where you are, we've got you covered.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/locations/${city.slug}`}
                  className="flex items-center justify-between p-5 rounded-xl border bg-card hover:border-[#00E2B5] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#00E2B5]/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-[#00E2B5]" />
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
                <strong>Not in a major city?</strong> No worries — InstantMed works anywhere in Australia with internet
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
