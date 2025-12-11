import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { ArrowRight, Clock, Lock, Shield, Eye, EyeOff } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Men's Health Online | ED, Hair Loss, STI Testing | InstantMed",
  description:
    "Discreet online consultations for men's health. Erectile dysfunction, hair loss treatment, testosterone testing, STI screening. No awkward conversations.",
  keywords: [
    "mens health online",
    "erectile dysfunction online australia",
    "hair loss treatment online",
    "testosterone test online",
    "STI screening online",
  ],
  openGraph: {
    title: "Men's Health Online | InstantMed",
    description: "Discreet online consultations for men's health from AHPRA-registered doctors.",
    url: "https://instantmed.com.au/mens-health",
  },
}

const services = [
  {
    id: "ed",
    title: "Erectile Dysfunction",
    description: "Sildenafil, Tadalafil, or alternatives. Discreet e-script to your phone.",
    price: "$29.95",
    time: "~1 hour",
    href: "/prescriptions/request?condition=ed&vertical=mens-health",
    color: "#3B82F6",
    popular: true,
  },
  {
    id: "hair-loss",
    title: "Hair Loss Treatment",
    description: "Finasteride, Minoxidil, or combination therapy. Stop the shed.",
    price: "$29.95",
    time: "~1 hour",
    href: "/prescriptions/request?condition=hair-loss&vertical=mens-health",
    color: "#8B5CF6",
  },
  {
    id: "testosterone",
    title: "Testosterone Testing",
    description: "Feeling flat? Get your levels checked with a simple blood test.",
    price: "$29.95",
    time: "~1 hour",
    href: "/referrals/pathology-imaging/request?condition=testosterone&vertical=mens-health",
    color: "#F59E0B",
  },
  {
    id: "sti",
    title: "STI Screening",
    description: "Comprehensive panel. Results sent directly to you. Totally confidential.",
    price: "$29.95",
    time: "~1 hour",
    href: "/referrals/pathology-imaging/request?condition=sti&vertical=mens-health",
    color: "#00E2B5",
  },
]

export default function MensHealthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
          <div
            className="hero-orb w-[400px] h-[400px] -top-[100px] right-1/4 opacity-40"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)" }}
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Men's Health
            </div>

            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No awkward conversations. <span className="text-blue-500">Just solutions.</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8">
              Get treated for common men's health issues without the uncomfortable GP visit. 100% online. 100% discreet.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 border border-blue-100">
                <Lock className="h-4 w-4 text-blue-500" />
                <span>Encrypted & private</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 border border-blue-100">
                <EyeOff className="h-4 w-4 text-blue-500" />
                <span>Discreet packaging</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 border border-blue-100">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Same-day scripts</span>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="px-4 py-12 bg-mesh">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-xl font-semibold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
              What do you need?
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <Link key={service.id} href={service.href} className="group">
                  <TiltCard className="glass-card rounded-xl p-5 h-full hover-lift">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${service.color}15` }}
                      >
                        <Shield className="h-5 w-5" style={{ color: service.color }} />
                      </div>
                      {service.popular && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                          Most requested
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold mb-1">{service.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{service.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{service.price}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {service.time}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </TiltCard>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-2xl">
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Your privacy is non-negotiable
              </h2>
              <p className="text-muted-foreground text-sm">
                We use bank-level encryption. Your records are stored securely in Australia. We never share your
                information. Pharmacy packaging is always discreet — no one will know what's inside.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
