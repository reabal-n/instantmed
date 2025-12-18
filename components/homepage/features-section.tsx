"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Pill, FileText, ArrowRight, CheckCircle2, Zap } from "lucide-react"
import { motion, useInView } from "framer-motion"
import { SectionPill } from "@/components/ui/section-pill"
import { SparklesText } from "@/components/ui/sparkles-text"
import { Button } from "@/components/ui/button"
import { MagneticButton, MagneticGlow } from "@/components/effects/magnetic-button"
import { GridStagger } from "@/components/effects/stagger-container"
import { SpotlightCard } from "@/components/effects/cursor-spotlight"
import { TextRevealLine } from "@/components/effects/text-reveal"

const services = [
  {
    icon: FileText,
    title: "Medical Certificate",
    description: "Sick and need proof for work or uni? Get a valid certificate emailed to you.",
    color: "#00E2B5",
    gradient: "from-[#00E2B5]/20 to-[#06B6D4]/20",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
    href: "/medical-certificate",
    price: "$29",
  },
  {
    icon: Pill,
    title: "Prescription",
    description: "Need your regular medications? We'll send a script to your pharmacy.",
    color: "#06B6D4",
    gradient: "from-[#06B6D4]/20 to-[#8B5CF6]/20",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
    href: "/prescriptions",
    price: "$39",
  },
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })

  return (
    <section id="features" ref={sectionRef} className="px-4 py-20 sm:py-28 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-b from-background via-[#f0fdf4]/50 dark:via-gray-900/50 to-background" />
      
      {/* Animated background blobs */}
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-linear-to-br from-[#00E2B5]/10 to-[#06B6D4]/10 rounded-full blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-linear-to-br from-[#8B5CF6]/10 to-[#EC4899]/10 rounded-full blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
          scale: [1.1, 1, 1.1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="mx-auto max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-4">
            <SectionPill emoji="⚡" text="Our services" hoverText="What we offer" />
          </div>
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <TextRevealLine delay={0.1}>
              <SparklesText
                text="What you get"
                className="text-3xl sm:text-4xl lg:text-5xl"
                colors={{ first: "#00E2B5", second: "#8B5CF6" }}
                sparklesCount={8}
              />
            </TextRevealLine>
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Two things, done well. Reviewed by real doctors, usually in about an hour.
          </motion.p>
        </motion.div>

        <GridStagger className="grid gap-8 md:grid-cols-2" staggerDelay={0.1}>
          {services.map((service, i) => {
            const Icon = service.icon
            return (
              <Link key={service.title} href={service.href} className="group block">
                <MagneticGlow glowColor={`${service.color}40`}>
                  <SpotlightCard spotlightColor={`${service.color}30`} className="h-full">
                    <div className={`relative rounded-3xl overflow-hidden bg-linear-to-br ${service.gradient} p-1`}>
                      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[22px] overflow-hidden h-full">
                        {/* Image section */}
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={service.image}
                            alt={service.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                          
                          {/* Price tag */}
                          <motion.div
                            className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-full px-3 py-1 shadow-lg"
                            whileHover={{ scale: 1.05 }}
                          >
                            <span className="text-sm font-bold" style={{ color: service.color }}>From {service.price}</span>
                          </motion.div>

                          {/* Icon */}
                          <motion.div
                            className="absolute bottom-4 left-4 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)`,
                            }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </motion.div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                            <motion.div
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <ArrowRight className="h-5 w-5" style={{ color: service.color }} />
                            </motion.div>
                          </div>
                          <p className="text-muted-foreground mb-4">{service.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                              1 hour approval
                            </span>
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                              No calls needed
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                </MagneticGlow>
              </Link>
            )
          })}
        </GridStagger>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 text-center"
        >
          <MagneticButton>
            <Button size="lg" asChild className="rounded-full btn-premium px-8 relative overflow-hidden group">
              <Link href="/start">
                <span className="relative z-10 flex items-center">
                  View all services
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                />
              </Link>
            </Button>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
