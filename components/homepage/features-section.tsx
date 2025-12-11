"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { Pill, FileText, FlaskConical, Stethoscope, Clock, Shield, Zap, CheckCircle2 } from "lucide-react"

const features = [
  {
    icon: Pill,
    title: "Prescriptions",
    description: "Get your regular medications renewed quickly. No need to visit a GP for repeat prescriptions.",
    color: "#00E2B5",
  },
  {
    icon: FileText,
    title: "Medical Certificates",
    description: "Legally valid certificates accepted by employers and institutions. Usually approved within 1 hour.",
    color: "#06B6D4",
  },
  {
    icon: FlaskConical,
    title: "Pathology & Imaging",
    description: "Request blood tests, scans, and other diagnostic tests. Referrals sent directly to your chosen provider.",
    color: "#8B5CF6",
  },
  {
    icon: Stethoscope,
    title: "Specialist Referrals",
    description: "Get referred to specialists when needed. Fast, professional, and accepted by all Australian specialists.",
    color: "#EC4899",
  },
  {
    icon: Clock,
    title: "1 Hour Approval",
    description: "AHPRA-registered doctors review and approve (if appropriate) within 1 hour. No calls needed.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "AHPRA Registered",
    description: "All doctors are fully registered with AHPRA and hold valid medical licenses to practice in Australia.",
    color: "#10B981",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
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
