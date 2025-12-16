"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { SectionPill } from "@/components/ui/section-pill"
import { CheckCircle2, Clock, PhoneOff, Shield, Zap, Heart } from "lucide-react"

const benefits = [
  {
    icon: Clock,
    title: "Done in ~1 hour",
    description: "Most requests reviewed same-day. No more waiting weeks for an appointment.",
    color: "#00E2B5",
  },
  {
    icon: PhoneOff,
    title: "No phone calls",
    description: "Fill out a form, get reviewed. That's it. No video chats, no hold music.",
    color: "#06B6D4",
  },
  {
    icon: Shield,
    title: "Real GPs only",
    description: "Every doctor is AHPRA-registered and actively practicing in Australia.",
    color: "#8B5CF6",
  },
  {
    icon: Zap,
    title: "Submit anytime",
    description: "Put in your request whenever. Doctors review 8am–10pm AEST daily.",
    color: "#F59E0B",
  },
  {
    icon: Heart,
    title: "Your data, protected",
    description: "Bank-level encryption keeps your health info private. Full stop.",
    color: "#EC4899",
  },
  {
    icon: CheckCircle2,
    title: "Accepted everywhere",
    description: "All documents are legally valid for employers, unis, and institutions.",
    color: "#10B981",
  },
]

export function BenefitsSection() {
  return (
    <section id="benefits" className="px-4 py-16 sm:py-20 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <SectionPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="Why InstantMed" />
          </div>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built for how you actually live 💡
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            GP waitlists are ridiculous. You shouldn't need to take a half-day off work for a script renewal. So we fixed that.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <HolographicCard key={benefit.title} hover intensity="medium" className="p-6">
                <div className="flex flex-col gap-4">
                  <div
                    className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl"
                    style={{
                      background: `linear-gradient(135deg, ${benefit.color}20, ${benefit.color}10)`,
                      border: `1px solid ${benefit.color}30`,
                    }}
                  >
                    <Icon className="h-6 w-6" style={{ color: benefit.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
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
