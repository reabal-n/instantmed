import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { ArrowRight, Clock, Heart, Shield, Sparkles, Users } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Women's Health Online | UTI, Contraception, Menopause | InstantMed",
  description:
    "Discreet online consultations for women's health. UTI treatment, contraception renewals, morning-after pill, menopause support, and PCOS testing. Request a female doctor.",
  keywords: [
    "womens health online",
    "UTI treatment online",
    "contraception online australia",
    "morning after pill online",
    "menopause telehealth",
    "PCOS blood test",
  ],
  openGraph: {
    title: "Women's Health Online | InstantMed",
    description: "Discreet online consultations for women's health from AHPRA-registered doctors.",
    url: "https://instantmed.com.au/womens-health",
  },
}

const services = [
  {
    id: "uti",
    title: "UTI Treatment",
    description: "Burning or frequent urination? Get assessed and treated quickly.",
    price: "$24.95",
    time: "~30 min",
    href: "/prescriptions/request?condition=uti&vertical=womens-health",
    color: "#EC4899",
    popular: true,
  },
  {
    id: "contraception",
    title: "Contraception Renewal",
    description: "Continue your regular contraceptive pill or discuss alternatives.",
    price: "$24.95",
    time: "~1 hour",
    href: "/prescriptions/request?condition=contraception&vertical=womens-health",
    color: "#8B5CF6",
  },
  {
    id: "morning-after",
    title: "Morning-After Pill",
    description: "Time-sensitive? We prioritise these requests. Discreet and fast.",
    price: "$29.95",
    time: "~20 min",
    href: "/prescriptions/request?condition=morning-after&vertical=womens-health",
    color: "#F59E0B",
    badge: "Urgent",
  },
  {
    id: "menopause",
    title: "Menopause Support",
    description: "Hot flushes, mood changes, sleep issues? Discuss treatment options.",
    price: "$34.95",
    time: "~1 hour",
    href: "/prescriptions/request?condition=menopause&vertical=womens-health",
    color: "#06B6D4",
  },
  {
    id: "pcos",
    title: "PCOS Blood Tests",
    description: "Hormone panel, glucose, and other relevant pathology.",
    price: "$29.95",
    time: "~1 hour",
    href: "/referrals/pathology-imaging/request?condition=pcos&vertical=womens-health",
    color: "#00E2B5",
  },
]

export default function WomensHealthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
          <div
            className="hero-orb w-[400px] h-[400px] -top-[100px] right-1/4 opacity-40"
            style={{ background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)" }}
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 text-pink-700 text-sm font-medium mb-6">
              <Heart className="h-4 w-4" />
              Women's Health
            </div>

            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Healthcare that <span className="text-pink-500">understands you</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-6">
              Discreet, judgement-free consultations for women's health concerns. Handled online by Australian doctors.
            </p>

            {/* Female doctor toggle */}
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 backdrop-blur border border-pink-100 shadow-sm">
              <Users className="h-5 w-5 text-pink-500" />
              <span className="text-sm font-medium">Request a female doctor</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-pink-400" />
                <span>100% confidential</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <span>No awkward waiting rooms</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-pink-400" />
                <span>Same-day response</span>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="px-4 py-12 bg-mesh">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-xl font-semibold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
              How can we help?
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
                        <Heart className="h-5 w-5" style={{ color: service.color }} />
                      </div>
                      {service.popular && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink-100 text-pink-600">
                          Popular
                        </span>
                      )}
                      {service.badge && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                          {service.badge}
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
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </TiltCard>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Reassurance Section */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              We get it
            </h2>
            <p className="text-muted-foreground">
              Some things are easier to discuss without eye contact. Our online process lets you share what's happening
              in your own words, at your own pace. A real doctor reads everything and responds thoughtfully.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
