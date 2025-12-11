"use client"

import Image from "next/image"
import Link from "next/link"
import { Pill, FileText, FlaskConical, Stethoscope, ArrowRight, CheckCircle2, Zap } from "lucide-react"
import { SectionPill } from "@/components/ui/section-pill"
import { SparklesText } from "@/components/ui/sparkles-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"

const services = [
  {
    icon: Pill,
    title: "Prescriptions",
    description: "Get your regular medications renewed quickly. Contraception, mental health, chronic conditions & more.",
    color: "#00E2B5",
    gradient: "from-[#00E2B5]/20 to-[#06B6D4]/20",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
    href: "/prescriptions",
    price: "$39",
  },
  {
    icon: FileText,
    title: "Medical Certificates",
    description: "Legally valid certificates for work, uni, or carers. Accepted by all Australian employers.",
    color: "#06B6D4",
    gradient: "from-[#06B6D4]/20 to-[#8B5CF6]/20",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
    href: "/medical-certificate",
    price: "$29",
  },
  {
    icon: FlaskConical,
    title: "Pathology & Imaging",
    description: "Request blood tests, scans, and diagnostic tests. Referrals sent to your chosen provider.",
    color: "#8B5CF6",
    gradient: "from-[#8B5CF6]/20 to-[#EC4899]/20",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=300&fit=crop",
    href: "/referrals/pathology-imaging",
    price: "$49",
  },
  {
    icon: Stethoscope,
    title: "Specialist Referrals",
    description: "Get referred to dermatologists, cardiologists, and other specialists. Fast & professional.",
    color: "#EC4899",
    gradient: "from-[#EC4899]/20 to-[#F59E0B]/20",
    image: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=300&fit=crop",
    href: "/referrals/specialist",
    price: "$49",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-20 sm:py-28 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-[#f0fdf4]/50 dark:via-gray-900/50 to-background" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        <BlurFade delay={0.1}>
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <SectionPill icon={<Zap className="h-3.5 w-3.5" />} text="Our services" />
            </div>
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <SparklesText
                text="Everything you need, online"
                className="text-3xl sm:text-4xl lg:text-5xl"
                colors={{ first: "#00E2B5", second: "#8B5CF6" }}
                sparklesCount={12}
              />
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Skip the GP queue. Our AHPRA-registered doctors review and approve requests within 1 hour.
            </p>
          </div>
        </BlurFade>

        <div className="grid gap-8 md:grid-cols-2">
          {services.map((service, i) => {
            const Icon = service.icon
            return (
              <BlurFade key={service.title} delay={0.1 + i * 0.1}>
                <Link href={service.href} className="group block">
                  <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${service.gradient} p-1 transition-all duration-300 hover:shadow-2xl hover:shadow-${service.color}/20 hover:-translate-y-1`}>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[22px] overflow-hidden">
                      {/* Image section */}
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={service.image}
                          alt={service.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        
                        {/* Price tag */}
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-full px-3 py-1 shadow-lg">
                          <span className="text-sm font-bold" style={{ color: service.color }}>From {service.price}</span>
                        </div>

                        {/* Icon */}
                        <div
                          className="absolute bottom-4 left-4 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)`,
                          }}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" style={{ color: service.color }} />
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
                </Link>
              </BlurFade>
            )
          })}
        </div>

        <BlurFade delay={0.5}>
          <div className="mt-12 text-center">
            <Button size="lg" asChild className="rounded-full btn-premium px-8">
              <Link href="/start">
                View all services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}