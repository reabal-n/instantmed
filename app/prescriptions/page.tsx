import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { ArrowRight, Clock, CheckCircle, AlertCircle, RefreshCw, Sparkles } from "lucide-react"
import { PrescriptionSearch } from "./prescription-search"
import { PopularMedications } from "./popular-medications"
import { CategoryFilters } from "./category-filters"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online Prescriptions Australia | Repeat Scripts & New Medications | InstantMed",
  description:
    "Request prescriptions online from Australian doctors. Repeat scripts from $24.95, new medications from $34.95. E-script sent to your phone, use at any pharmacy.",
  keywords: [
    "online prescription australia",
    "repeat prescription online",
    "online script australia",
    "telehealth prescription",
    "medication refill online",
    "digital prescription",
    "e-script online",
  ],
  openGraph: {
    title: "Online Prescriptions Australia | InstantMed",
    description:
      "Skip the GP queue. Request repeat scripts or new medications online. Reviewed by AHPRA-registered doctors.",
    url: "https://instantmed.com.au/prescriptions",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
}

export default function PrescriptionsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:py-16 overflow-hidden bg-gradient-to-b from-background to-muted/30">
          <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:32px_32px]" />

          <div className="relative mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Need your regular meds? <span className="text-primary">Skip the GP queue.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Request a prescription online. A doctor reviews your details and sends an e-script to your phone — use
                it at any pharmacy.
              </p>
            </div>

            {/* Search Bar */}
            <PrescriptionSearch />

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Usually same-day review</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Any pharmacy Australia-wide</span>
              </div>
            </div>
          </div>
        </section>

        {/* Repeat vs New Split */}
        <section className="px-4 py-12 bg-background">
          <div className="mx-auto max-w-4xl">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Repeat Script */}
              <Link href="/prescriptions/request?type=repeat" className="group">
                <div className="h-full p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">I need a repeat</h2>
                      <p className="text-2xl font-bold text-primary">$24.95</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Been on this medication before? Easy. We just need to check nothing's changed.
                  </p>
                  <div className="flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                    Continue with repeat
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>

              {/* New Prescription */}
              <Link href="/prescriptions/request?type=new" className="group">
                <div className="h-full p-6 rounded-2xl border-2 border-border hover:border-foreground/20 hover:bg-muted/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">I need something new</h2>
                      <p className="text-2xl font-bold">$34.95</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Starting a new medication? We'll ask a few more questions so the doctor can assess properly.
                  </p>
                  <div className="flex items-center text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Request new medication
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section className="px-4 py-8 bg-muted/30">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-lg font-semibold mb-4 text-center">Browse by category</h2>
            <CategoryFilters />
          </div>
        </section>

        {/* Popular Medications Grid */}
        <section className="px-4 py-12 bg-background">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Popular treatments</h2>
              <Link href="/medications" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all medications
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <PopularMedications />
          </div>
        </section>

        {/* Warning */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Some medications require an in-person visit</p>
                <p className="mt-1 text-amber-700">
                  We can't prescribe Schedule 8 drugs (opioids, stimulants), benzodiazepines, or medications requiring
                  physical examination online. Not sure? Start a request and we'll let you know.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
