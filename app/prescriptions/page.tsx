import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { AnimatedIcon } from "@/components/shared/animated-icons"
import { ArrowRight, RefreshCw, ClipboardList, Clock, CheckCircle, AlertCircle, Smartphone } from "lucide-react"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online Prescription Australia | Repeat Scripts | InstantMed",
  description:
    "Request prescriptions online from Australian doctors. Repeat scripts and medication reviews handled online, no phone call needed. Reviewed by AHPRA-registered GPs.",
  keywords: [
    "online prescription australia",
    "repeat prescription online",
    "online script australia",
    "telehealth prescription",
    "medication refill online",
    "digital prescription",
    "e-script online",
    "repeat script online",
  ],
  openGraph: {
    title: "Online Prescription Australia | Repeat Scripts | InstantMed",
    description:
      "Request prescriptions online from Australian doctors. Reviewed by AHPRA-registered GPs. E-script sent to your phone.",
    url: "https://instantmed.com.au/prescriptions",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Prescription Australia | InstantMed",
    description: "Request repeat scripts online. Reviewed by Australian GPs. E-script sent to your phone.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/prescriptions",
  },
}

export default function PrescriptionsPage() {
  redirect("/prescriptions/request")

  const subtypes = [
    {
      id: "repeat",
      title: "Repeat Script",
      description:
        "Continuing your regular medication? A doctor reviews your history and assesses if a repeat is appropriate.",
      icon: RefreshCw,
      color: "#06B6D4",
      bgColor: "from-[#06B6D4]/20 to-[#06B6D4]/5",
      hoverBg: "group-hover:from-[#06B6D4] group-hover:to-[#0891B2]",
      href: "/prescriptions/repeat",
      popular: true,
    },
    {
      id: "chronic",
      title: "Medication Review",
      description:
        "Need a dose change or want to discuss side effects? Tell us what's happening and a doctor will review.",
      icon: ClipboardList,
      color: "#8B5CF6",
      bgColor: "from-[#8B5CF6]/20 to-[#8B5CF6]/5",
      hoverBg: "group-hover:from-[#8B5CF6] group-hover:to-[#7C3AED]",
      href: "/prescriptions/chronic",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:px-6 sm:py-16 overflow-hidden">
          <div className="hero-orb hero-orb-cyan w-[500px] h-[500px] -top-[150px] right-1/3 opacity-50" />

          <div className="relative mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A0F1C] text-white text-sm font-medium mb-6 animate-fade-in-up opacity-0 shadow-lg"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
            >
              <Smartphone className="h-4 w-4 text-[#06B6D4]" />
              E-script sent to your phone
            </div>

            <h1
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.15s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
            >
              Need a repeat script? <span className="text-gradient-mint">We can help.</span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              Request a prescription renewal online. A doctor reviews your medical history and determines if a script is
              appropriate for you.
            </p>

            {/* Trust indicators */}
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <Clock className="h-4 w-4 text-[#06B6D4]" />
                <span className="font-medium">Usually same-day review</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <CheckCircle className="h-4 w-4 text-[#06B6D4]" />
                <span className="font-medium">Any pharmacy Australia-wide</span>
              </div>
            </div>
          </div>
        </section>

        {/* Subtype Selection */}
        <section className="px-4 py-12 sm:px-6 lg:px-8 bg-mesh">
          <div className="mx-auto max-w-3xl">
            <div
              className="text-center mb-8 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
            >
              <h2 className="text-xl font-semibold sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                What do you need?
              </h2>
            </div>

            <div className="grid gap-4">
              {subtypes.map((subtype, index) => (
                <Link key={subtype.id} href={subtype.href} className="group">
                  <TiltCard
                    className="glass-card rounded-2xl p-5 sm:p-6 flex items-center gap-4 hover-lift animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.15 + index * 0.05}s`, animationFillMode: "forwards" }}
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${subtype.bgColor} ${subtype.hoverBg} transition-all duration-300 overflow-hidden`}
                    >
                      <AnimatedIcon type="pill" size={36} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold group-hover:text-[#06B6D4] transition-colors">{subtype.title}</h3>
                        {subtype.popular && (
                          <span className="text-xs font-medium text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-full">
                            Most common
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{subtype.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold">$24.95</span>
                      <ArrowRight
                        className="h-5 w-5 text-muted-foreground group-hover:text-[#06B6D4] group-hover:translate-x-1 transition-all mt-1 ml-auto"
                        style={{ color: subtype.color }}
                      />
                    </div>
                  </TiltCard>
                </Link>
              ))}
            </div>

            {/* Warning about controlled substances */}
            <div
              className="mt-8 flex items-start gap-3 p-4 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
            >
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Some meds need an in-person visit</p>
                <p className="mt-1 text-amber-700">
                  We can't prescribe Schedule 8 drugs (opioids, stimulants) or benzos online. Chat with us if you're
                  unsure.
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
