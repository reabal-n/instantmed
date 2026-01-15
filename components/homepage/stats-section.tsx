"use client"

import Image from "next/image"
import { Users, Clock, Star, Shield } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { motion } from "framer-motion"

const stats = [
  {
    icon: Users,
    value: "10,000+",
    label: "Aussies helped",
    color: "#2563EB",
  },
  {
    icon: Clock,
    value: "45 min",
    label: "Average response",
    color: "#4f46e5",
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
    label: "AHPRA doctors",
    color: "#10B981",
  },
]

const testimonialImages = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
]

export function StatsSection() {
  return (
    <section className="px-4 py-16 sm:py-24 relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-[#4f46e5]/5" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Image collage */}
          <BlurFade delay={0.1}>
            <div className="relative">
              {/* Main image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop"
                  alt="Happy patient using telehealth"
                  width={600}
                  height={400}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                
                {/* Floating testimonial */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl"
                >
                  <div className="flex items-start gap-3">
                    <Image
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                      alt="Patient"
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                      <p className="text-sm text-foreground">&quot;Got my prescription in 30 minutes. Absolute lifesaver!&quot;</p>
                      <p className="text-xs text-muted-foreground mt-1">Sarah M. • Sydney</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Secondary floating image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="absolute -top-6 -right-6 w-32 h-32 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 rotate-6 hidden md:block"
              >
                <Image
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop"
                  alt="Doctor on video call"
                  fill
                  className="object-cover"
                />
              </motion.div>

              {/* Third floating image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-6 -left-6 w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 -rotate-6 hidden md:block"
              >
                <Image
                  src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=200&h=200&fit=crop"
                  alt="Mobile health app"
                  fill
                  className="object-cover"
                />
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
                  thousands
                </span>{" "}
                of Australians
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join the healthcare revolution. Fast, affordable, and from the comfort of your home.
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
                      <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-white/40 dark:border-slate-700/40">
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

            {/* Avatar stack */}
            <BlurFade delay={0.7}>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {testimonialImages.map((src, i) => (
                    <Image
                      key={i}
                      src={src}
                      alt="Patient"
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                    />
                  ))}
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-2 border-white dark:border-slate-800 text-white text-xs font-bold">
                    +2k
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">2,000+ reviews</span> on Google & Trustpilot
                </p>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  )
}
