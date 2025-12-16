"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { Pill, FileText, FlaskConical, Stethoscope, Clock, Shield, Zap, CheckCircle2 } from "lucide-react"
import { SectionPill } from "@/components/ui/section-pill"

const features = [
  {
    icon: Pill,
    title: "Prescriptions",
    description: "Keep your regular meds coming without the GP waitlist. eScript sent straight to your pharmacy.",
    color: "#00E2B5",
  },
  {
    icon: FileText,
    title: "Medical Certificates",
    description: "Employer-ready certs for work, uni, or carer's leave. In your inbox same-day.",
    color: "#06B6D4",
  },
  {
    icon: FlaskConical,
    title: "Pathology & Imaging",
    description: "Blood tests, scans, and diagnostics. Referral sent direct to your chosen provider.",
    color: "#8B5CF6",
  },
  {
    icon: Stethoscope,
    title: "Specialist Referrals",
    description: "Need to see someone specific? Get referred without the runaround.",
    color: "#EC4899",
  },
  {
    icon: Clock,
    title: "~1 Hour Turnaround",
    description: "Most requests reviewed and done within an hour. Because your time matters.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "Real Australian GPs",
    description: "Every doctor is AHPRA-registered and actively practicing. No shortcuts.",
    color: "#10B981",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <SectionPill icon={<Zap className="h-3.5 w-3.5" />} text="What we offer" />
          </div>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Everything you need, nothing you don't 🎯
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Real Australian GPs reviewing your request — usually done in about an hour. No phone calls required.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <HolographicCard key={feature.title} hover intensity="medium" className="p-6">
                <div className="flex flex-col gap-4">
                  <div
                    className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`,
                      border: `1px solid ${feature.color}30`,
                    }}
                  >
                    <Icon className="h-6 w-6" style={{ color: feature.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </HolographicCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
