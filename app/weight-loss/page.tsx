import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { TiltCard } from "@/components/shared/tilt-card"
import { ArrowRight, Calculator, Scale, TrendingDown, Repeat, FileText, Droplets } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Weight Loss Program Online | Ozempic, Saxenda | InstantMed",
  description:
    "Medically supervised weight loss program with GLP-1 medications like Ozempic and Saxenda. BMI eligibility check, initial consultation, monthly check-ins, and pathology monitoring.",
  keywords: [
    "weight loss online australia",
    "ozempic online",
    "saxenda online",
    "GLP-1 weight loss",
    "medical weight loss program",
    "telehealth weight loss",
  ],
  openGraph: {
    title: "Weight Loss Program | Ozempic & Saxenda | InstantMed",
    description: "Medically supervised weight loss with GLP-1 medications. Check your eligibility now.",
    url: "https://instantmed.com.au/weight-loss",
  },
}

export default function WeightLossPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
          <div
            className="hero-orb w-[400px] h-[400px] -top-[100px] right-1/4 opacity-40"
            style={{ background: "radial-gradient(circle, rgba(0,226,181,0.3) 0%, transparent 70%)" }}
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E2B5]/10 text-[#00E2B5] text-sm font-medium mb-6">
              <TrendingDown className="h-4 w-4" />
              Medically Supervised
            </div>

            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Weight loss that <span className="text-[#00E2B5]">actually works</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8">
              Doctor-prescribed GLP-1 medications like Ozempic and Saxenda, with ongoing support and monitoring. Check
              if you're eligible.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="#eligibility">
                <Button size="lg" className="w-full sm:w-auto bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                  <Calculator className="h-4 w-4 mr-2" />
                  Check Eligibility
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* BMI Calculator */}
        <section id="eligibility" className="px-4 py-12 bg-mesh">
          <div className="mx-auto max-w-xl">
            <TiltCard className="glass-card rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-[#00E2B5]/10 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-[#00E2B5]" />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    BMI Eligibility Check
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    GLP-1 medications require BMI ≥30 (or ≥27 with comorbidities)
                  </p>
                </div>
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Height (cm)</label>
                    <input
                      type="number"
                      placeholder="175"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-white text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Weight (kg)</label>
                    <input
                      type="number"
                      placeholder="85"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-white text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Do you have any of the following?</label>
                  <div className="space-y-2 text-sm">
                    {["Type 2 diabetes", "High blood pressure", "High cholesterol", "Sleep apnoea"].map((condition) => (
                      <label key={condition} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-border" />
                        <span>{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="button" className="w-full bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                  Calculate BMI & Check Eligibility
                </Button>
              </form>
            </TiltCard>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
              How the program works
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: FileText,
                  title: "Initial Consultation",
                  description:
                    "Complete our health assessment. A doctor reviews your history and determines if you're a candidate.",
                  price: "$49.95",
                },
                {
                  icon: Repeat,
                  title: "Monthly Check-ins",
                  description: "Ongoing monitoring of your progress, side effects, and dosage adjustments as needed.",
                  price: "$29.95/month",
                },
                {
                  icon: Droplets,
                  title: "Pathology Monitoring",
                  description: "Regular blood tests to ensure your liver, kidneys, and thyroid are healthy.",
                  price: "$29.95/test",
                },
              ].map((step, index) => (
                <TiltCard key={index} className="glass-card rounded-xl p-5">
                  <div className="h-10 w-10 rounded-lg bg-[#00E2B5]/10 flex items-center justify-center mb-3">
                    <step.icon className="h-5 w-5 text-[#00E2B5]" />
                  </div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  <span className="text-sm font-bold text-[#00E2B5]">{step.price}</span>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* Medications */}
        <section className="px-4 py-12 bg-mesh">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
              Available medications
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  name: "Ozempic (Semaglutide)",
                  description: "Weekly injection. Most effective for weight loss. Often has supply constraints.",
                  note: "Requires prior approval",
                },
                {
                  name: "Saxenda (Liraglutide)",
                  description: "Daily injection. TGA-approved for weight management. Generally available.",
                  note: "PBS listed for eligible patients",
                },
              ].map((med) => (
                <div key={med.name} className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold mb-1">{med.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{med.description}</p>
                  <span className="text-xs text-[#00E2B5] font-medium">{med.note}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              The prescribing doctor will determine the most appropriate medication based on your health profile and
              goals.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Ready to start?
            </h2>
            <p className="text-muted-foreground mb-6">
              Complete the eligibility check above, or jump straight into a consultation.
            </p>
            <Link href="/weight-loss/request">
              <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                Start Consultation
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
