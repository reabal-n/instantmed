'use client'

import Link from "next/link"
import { FileText, Pill, ArrowRight, Shield, Clock, CheckCircle } from "lucide-react"
import { Card, CardBody, CardFooter, Chip } from "@heroui/react"

const services = [
  {
    title: "Medical Certificate",
    description: "Work, university, or carer's leave certificates. Accepted by all Australian employers.",
    href: "/medical-certificate/request",
    icon: FileText,
    color: "primary" as const,
    price: "24.95",
    features: ["Same-day delivery", "Legally valid", "Backdating available"],
  },
  {
    title: "Prescription",
    description: "Repeat prescriptions and medication reviews from registered GPs.",
    href: "/prescriptions/request",
    icon: Pill,
    color: "secondary" as const,
    price: "29.95",
    features: ["Sent to any pharmacy", "eScript available", "Medication review"],
  },
]

const trustPoints = [
  { icon: Shield, text: "AHPRA registered doctors" },
  { icon: Clock, text: "Under 1 hour turnaround" },
  { icon: CheckCircle, text: "98% approval rate" },
]

export default function StartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
      {/* Gradient orbs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 opacity-60" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 opacity-60" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <Chip color="primary" variant="flat" className="mb-4">
            Get started in 60 seconds
          </Chip>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground mb-5">
            What do you need today?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Select a service below. All consultations are reviewed by AHPRA-registered Australian doctors.
          </p>
        </div>

        {/* Trust points */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 animate-slide-up">
          {trustPoints.map((point) => (
            <div key={point.text} className="flex items-center gap-2 text-sm text-muted-foreground">
              <point.icon className="w-4 h-4 text-primary" />
              <span>{point.text}</span>
            </div>
          ))}
        </div>

        {/* Service Cards */}
        <div className="grid gap-6 sm:grid-cols-2 animate-slide-up-delay-1">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <Link
                key={service.href}
                href={service.href}
                className="group block h-full"
              >
                <Card 
                  isHoverable
                  isPressable
                  className="h-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  shadow="sm"
                >
                  <CardBody className="p-8 gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    
                    <div>
                      <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                        {service.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-2 mt-2">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                  
                  <CardFooter className="flex items-center justify-between px-8 pb-8 pt-0">
                    <Chip color={service.color} variant="flat" size="lg">
                      From ${service.price}
                    </Chip>
                    <div className="flex items-center gap-2 text-primary font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                      Start now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground mt-10 animate-slide-up-delay-2">
          Not sure what you need?{" "}
          <Link href="/contact" className="text-primary hover:underline font-medium">
            Contact us
          </Link>{" "}
          and we&apos;ll help you out.
        </p>
      </div>
    </div>
  )
}
