"use client"

import { SectionPill } from "@/components/ui/section-pill"
import { Users, Clock, Star, Shield } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { BlurFade } from "@/components/ui/blur-fade"

const stats = [
  {
    icon: Users,
    value: "10,000+",
    label: "Aussies helped",
    color: "#00E2B5",
  },
  {
    icon: Clock,
    value: "< 1 hour",
    label: "Average response time",
    color: "#06B6D4",
  },
  {
    icon: Star,
    value: "4.9/5",
    label: "Patient rating",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    value: "100%",
    label: "AHPRA registered",
    color: "#10B981",
  },
]

export function StatsSection() {
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <BlurFade delay={0.1}>
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <SectionPill icon={<Users className="h-3.5 w-3.5" />} text="By the numbers" />
            </div>
            <h2
              className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Trusted by thousands
            </h2>
          </div>
        </BlurFade>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <BlurFade key={stat.label} delay={0.1 + i * 0.05}>
                <HolographicCard hover intensity="medium" className="p-6 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center backdrop-blur-xl"
                      style={{
                        background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                        border: `1px solid ${stat.color}30`,
                      }}
                    >
                      <Icon className="h-7 w-7" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                </HolographicCard>
              </BlurFade>
            )
          })}
        </div>
      </div>
    </section>
  )
}
