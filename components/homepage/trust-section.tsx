"use client"

import { CheckCircle2, Shield, Zap, Lock, Heart } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { SecurityBadges } from "@/components/security/security-badges"
import { SectionPill } from "@/components/ui/section-pill"

const trustPoints = [
  {
    icon: Shield,
    title: "Real doctors",
    description: "Not bots, not overseas call centres. Actual AHPRA-registered Aussie GPs who know their stuff.",
    color: "#00E2B5",
  },
  {
    icon: Zap,
    title: "Stupid fast",
    description: "Most requests done within an hour. Yes, really. We've timed it.",
    color: "#F59E0B",
  },
  {
    icon: Lock,
    title: "No Medicare BS",
    description: "Flat fee, you know what you're paying. No surprise bills, no rebate paperwork.",
    color: "#06B6D4",
  },
  {
    icon: Heart,
    title: "Medical-grade security",
    description:
      "Your health data is protected with AES-256 encryption and stored on Australian servers. Full compliance with the Privacy Act 1988.",
    color: "#EC4899",
  },
]

export function TrustSection() {
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <SectionPill icon={<Shield className="h-3.5 w-3.5" />} text="Why trust us" />
          </div>
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why Aussies trust InstantMed
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            We built this because GP waitlists are ridiculous and you shouldn't need to take a half-day off work for a
            script renewal.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {trustPoints.map((point, i) => (
            <HolographicCard key={point.title} hover intensity="medium" className="flex gap-4 p-6">
              {/* Icon with gradient background */}
              <div
                className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl"
                style={{
                  background: `linear-gradient(135deg, ${point.color}20, ${point.color}10)`,
                  border: `1px solid ${point.color}30`,
                }}
              >
                <point.icon className="h-6 w-6" style={{ color: point.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                  <h3 className="font-semibold text-foreground">{point.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="mt-12 pt-12 border-t border-white/10">
          <p className="text-center text-sm text-muted-foreground mb-6">Certified and compliant with</p>
          <SecurityBadges />
        </div>
      </div>
    </section>
  )
}
