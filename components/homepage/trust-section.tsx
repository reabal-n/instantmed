"use client"

import { CheckCircle2, Shield, Zap, Lock, Heart } from "lucide-react"

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
    title: "Your secrets are safe",
    description: "We're not selling your data or spamming you. Bank-level encryption. Pinky promise.",
    color: "#EC4899",
  },
]

export function TrustSection() {
  return (
    <section className="px-4 py-16 sm:py-20 bg-[#FAFBFC]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
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
          {trustPoints.map((point) => (
            <div key={point.title} className="flex gap-4 p-5 bg-white rounded-xl border border-border/40">
              <div
                className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${point.color}15` }}
              >
                <point.icon className="h-5 w-5" style={{ color: point.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                  <h3 className="font-semibold text-foreground">{point.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
