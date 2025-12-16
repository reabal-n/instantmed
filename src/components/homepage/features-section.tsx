"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { Pill, FileText, Clock, Shield, Zap, CheckCircle2, Smartphone, CreditCard } from "lucide-react"
import { SectionPill } from "@/components/ui/section-pill"

const features = [
  {
    icon: FileText,
    title: "Medical Certificates",
    description: "Sick and need proof for work or uni? Get a valid certificate emailed to you.",
    color: "#00E2B5",
  },
  {
    icon: Pill,
    title: "Prescriptions",
    description: "Need your regular meds? We'll send a script to your pharmacy.",
    color: "#06B6D4",
  },
  {
    icon: Clock,
    title: "About an hour",
    description: "Most requests are reviewed and done within 60 minutes.",
    color: "#8B5CF6",
  },
  {
    icon: Shield,
    title: "Real doctors",
    description: "Actual Australian GPs review every single request. Not AI.",
    color: "#F59E0B",
  },
  {
    icon: Smartphone,
    title: "No video calls",
    description: "Just fill out a form. No awkward webcam consultations.",
    color: "#EC4899",
  },
  {
    icon: CreditCard,
    title: "Pay if approved",
    description: "You only pay if a doctor can actually help you. Otherwise, full refund.",
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
            What you get
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Two things, done well. Med certs and prescriptions — reviewed by real doctors, usually in about an hour.
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
