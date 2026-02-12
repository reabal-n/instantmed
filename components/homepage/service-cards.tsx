"use client"

import Link from "next/link"
import { ArrowRight, Clock, Sparkles, TrendingUp } from "lucide-react"
import { TiltCard } from "@/components/shared/tilt-card"
import { AnimatedIcon } from "@/components/shared/animated-icons"

interface ServiceCard {
  href: string
  title: string
  description: string
  price: string
  time: string
  icon: "medCert" | "pill"
  color: string
  colorLight: string
  badge?: "popular" | "new" | "fast"
}

const services: ServiceCard[] = [
  {
    href: "/medical-certificate",
    title: "Medical Certificate",
    description: "Sick? Need proof for work or uni?",
    price: "$29",
    time: "~1 hour",
    icon: "medCert",
    color: "#2563EB",
    colorLight: "rgba(0, 226, 181, 0.1)",
    badge: "popular",
  },
  {
    href: "/prescriptions",
    title: "Prescription",
    description: "Need your regular meds?",
    price: "$39",
    time: "~1 hour",
    icon: "pill",
    color: "#4f46e5",
    colorLight: "rgba(6, 182, 212, 0.1)",
  },
]

function BadgeIcon({ type }: { type: "popular" | "new" | "fast" }) {
  switch (type) {
    case "popular":
      return <TrendingUp className="h-3 w-3" />
    case "new":
      return <Sparkles className="h-3 w-3" />
    case "fast":
      return <Clock className="h-3 w-3" />
  }
}

function BadgeLabel({ type }: { type: "popular" | "new" | "fast" }) {
  switch (type) {
    case "popular":
      return "Most popular"
    case "new":
      return "New"
    case "fast":
      return "Fast"
  }
}

export function ServiceCards() {
  return (
    <section id="services" className="px-4 py-12 sm:py-16 lg:py-20 bg-mesh">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-medium text-primary mb-2 uppercase tracking-wide">
            Our Services
          </span>
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Med cert or prescription?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Pick what you need. Fill a quick form. A real doctor reviews it — usually within an hour.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
          {services.map((service) => (
            <Link key={service.href} href={service.href} className="block group">
              <TiltCard className="glass-card rounded-xl p-5 h-full hover-lift tap-bounce relative overflow-hidden">
                {/* Glassmorphism hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${service.colorLight} 0%, transparent 50%)`,
                    backdropFilter: "blur(8px)",
                  }}
                />

                <div className="relative">
                  {/* Icon + Badge row */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-300 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${service.colorLight} 0%, transparent 100%)`,
                      }}
                    >
                      <AnimatedIcon type={service.icon} size={28} />
                    </div>
                    {service.badge && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: service.colorLight,
                          color: service.color,
                        }}
                      >
                        <BadgeIcon type={service.badge} />
                        <BadgeLabel type={service.badge} />
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">{service.description}</p>

                  {/* Time estimate */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" style={{ color: service.color }} />
                    <span>{service.time}</span>
                  </div>

                  {/* Price + CTA */}
                  <div className="pt-3 border-t border-foreground/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-bold text-foreground">{service.price}</span>
                        <span className="text-xs text-muted-foreground ml-0.5">AUD</span>
                      </div>
                      <span
                        className="flex items-center text-xs font-medium group-hover:gap-1.5 transition-all"
                        style={{ color: service.color }}
                      >
                        {service.icon === 'medCert' ? 'Get certificate' : 'Renew prescription'}
                        <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
