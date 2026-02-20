"use client"

import { Users, Clock, Star, Shield, Stethoscope, CalendarCheck, Building2, BadgeCheck } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const stats = [
  {
    icon: Users,
    value: "Hundreds",
    label: "Satisfied patients",
    color: "#2563EB",
    emoji: "👥",
  },
  {
    icon: Clock,
    value: "~42 min",
    label: "Average response",
    color: "#4f46e5",
    emoji: "⚡",
  },
  {
    icon: Star,
    value: "4.9/5",
    label: "Patient satisfaction",
    color: "#F59E0B",
    emoji: "⭐",
  },
  {
    icon: Shield,
    value: "100%",
    label: "AHPRA doctors",
    color: "#10B981",
    emoji: "✅",
  },
]

const trustFacts = [
  { icon: CalendarCheck, text: "Operating since 2025", emoji: "📅" },
  { icon: Building2, text: "ABN: 64 694 559 334", emoji: "🏢" },
  { icon: BadgeCheck, text: "AHPRA-registered practitioners", emoji: "🩺" },
  { icon: Stethoscope, text: "Australian-based medical team", emoji: "🇦🇺" },
]

export function StatsSection() {
  return (
    <section className="px-4 py-16 sm:py-24 relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-[#4f46e5]/5" />

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Visual feature showcase (replacing stock photos) */}
          <BlurFade delay={0.1}>
            <div className="relative">
              {/* Main card — illustrative, not stock photos */}
              <div className="relative rounded-3xl overflow-hidden bg-linear-to-br from-primary/10 via-blue-50 to-indigo-50 dark:from-primary/20 dark:via-slate-800 dark:to-indigo-950 border border-primary/10 dark:border-primary/20 p-8 shadow-xl">
                {/* Decorative background circles */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shadow-sm">
                      <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">InstantMed</h3>
                      <p className="text-sm text-muted-foreground">Australian Telehealth</p>
                    </div>
                  </div>

                  {/* Simulated consultation flow */}
                  <div className="space-y-3">
                    {[
                      { step: "1", label: "Submit your request", icon: "📋", status: "complete" },
                      { step: "2", label: "Doctor reviews your case", icon: "👨‍⚕️", status: "complete" },
                      { step: "3", label: "Certificate or script issued", icon: "📄", status: "active" },
                    ].map((item) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + Number(item.step) * 0.15 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                          item.status === "active"
                            ? "bg-white/80 dark:bg-white/10 border border-primary/20 shadow-md shadow-primary/5"
                            : "bg-white/40 dark:bg-white/5 border border-transparent"
                        )}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className={cn(
                          "text-sm font-medium",
                          item.status === "active" ? "text-primary" : "text-muted-foreground"
                        )}>
                          {item.label}
                        </span>
                        {item.status === "complete" && (
                          <span className="ml-auto text-emerald-500 text-sm">✓</span>
                        )}
                        {item.status === "active" && (
                          <span className="ml-auto">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                            </span>
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Floating testimonial — text only, no stock photo */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/90 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/50 dark:border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        S
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                        <p className="text-sm text-foreground">&quot;Had it sorted in about 40 minutes. My employer accepted it without any questions.&quot;</p>
                        <p className="text-xs text-muted-foreground mt-1">Sarah M. — Sydney</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Floating badge — top right */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl border border-primary/10 dark:border-primary/20 rotate-3 hidden md:flex items-center gap-2"
              >
                <span className="text-2xl">🩺</span>
                <div>
                  <p className="text-xs font-bold text-foreground">100% Online</p>
                  <p className="text-[10px] text-muted-foreground">No appointments needed</p>
                </div>
              </motion.div>

              {/* Floating badge — bottom left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl border border-emerald-500/10 -rotate-3 hidden md:flex items-center gap-2"
              >
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="text-xs font-bold text-foreground">~42 min</p>
                  <p className="text-[10px] text-muted-foreground">Average response</p>
                </div>
              </motion.div>
            </div>
          </BlurFade>

          {/* Right side - Stats */}
          <div>
            <BlurFade delay={0.2}>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Trusted by{" "}
                <span className="bg-linear-to-r from-primary to-[#4f46e5] bg-clip-text text-transparent">
                  hundreds
                </span>{" "}
                of Australians
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                AHPRA-registered Australian doctors, available 7 days a week.
              </p>
            </BlurFade>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <BlurFade key={stat.label} delay={0.3 + i * 0.1}>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-linear-to-r rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${stat.color}10, transparent)` }} />
                      <div className="relative bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/40 dark:border-white/10 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: stat.color }} />
                        </div>
                        <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    </div>
                  </BlurFade>
                )
              })}
            </div>

            {/* Verifiable social proof — replaces avatar stack */}
            <BlurFade delay={0.7}>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/40 dark:border-white/10">
                <div className="grid grid-cols-2 gap-3">
                  {trustFacts.map((fact, i) => {
                    const Icon = fact.icon
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-xs">{fact.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  )
}
