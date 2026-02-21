"use client"

import { motion } from "framer-motion"
import { PRICING_DISPLAY } from "@/lib/constants"
import {
  Clock,
  PhoneOff,
  Phone,
  FileText,
  Pill,
  Stethoscope,
  CheckCircle2,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/uix"
import Link from "next/link"

/**
 * Hero value proposition highlighting the 15-minute, no-call USP
 */
export function HeroValueProp({ className }: { className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      {/* Main headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-100 px-4 py-1.5 text-sm font-medium">
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Australia&apos;s fastest telehealth
        </Badge>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          Too sick to visit a GP?
          <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">
            Sorted from your couch.
          </span>
        </h1>

        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Get a valid medical certificate or renew your script — reviewed by an
          AHPRA-registered doctor, usually in under an hour.
        </p>
      </motion.div>

      {/* USP pills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 flex flex-wrap justify-center gap-3"
      >
        <div className="flex items-center gap-2 bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 shadow-sm border">
          <PhoneOff className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">No phone calls</span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 shadow-sm border">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">15 mins or less</span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 shadow-sm border">
          <Shield className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium">AHPRA-registered doctors</span>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Service comparison cards showing no-call vs quick-call services
 */
export function ServiceTypeCards({ className }: { className?: string }) {
  return (
    <div className={cn("grid md:grid-cols-2 gap-6", className)}>
      {/* No-call services */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border-2 border-green-200 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800 p-6"
      >
        <div className="absolute top-3 right-3">
          <Badge className="bg-green-600 text-white">Most Popular</Badge>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <PhoneOff className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900 dark:text-green-100">
              No Phone Call Needed
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              15 minutes or less
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <ServiceItem
            icon={FileText}
            title="Medical Certificates"
            description="Sick leave, carer's leave, fitness"
            price={PRICING_DISPLAY.MED_CERT}
            time="~15 mins"
          />
          <ServiceItem
            icon={Pill}
            title="Repeat Prescriptions"
            description="Ongoing medications you already take"
            price={PRICING_DISPLAY.REPEAT_SCRIPT}
            time="~15 mins"
          />
        </div>

        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Complete everything online</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Doctor reviews your request</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>E-script or PDF sent to your email</span>
          </div>
        </div>

        <Link href="/request" className="block mt-6">
          <Button className="w-full magnetic-button glow-pulse bg-green-600 hover:bg-green-700 text-white">
            Get Started
            <ArrowRight className="h-4 w-4 ml-2 icon-spin-hover" />
          </Button>
        </Link>
      </motion.div>

      {/* Quick call services */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative rounded-2xl border bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-primary p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
              Quick 2-Min Phone Consult
            </h3>
            <p className="text-primary dark:text-blue-300 text-sm">
              For new medications
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <ServiceItem
            icon={Stethoscope}
            title="New Prescriptions"
            description="First-time medications"
            price={PRICING_DISPLAY.NEW_SCRIPT}
            time="2 min call"
            variant="blue"
          />
          <ServiceItem
            icon={Stethoscope}
            title="Men's & Women's Health"
            description="Sensitive health consultations"
            price={PRICING_DISPLAY.CONSULT}
            time="2 min call"
            variant="blue"
          />
        </div>

        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Fill out form online first</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Quick 2-minute doctor call</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>E-script sent immediately after</span>
          </div>
        </div>

        <Link href="/prescriptions/new" className="block mt-6">
          <Button
            variant="outline"
            className="w-full magnetic-button scale-spring border-primary text-primary hover:bg-blue-100 dark:border-primary dark:text-blue-300"
          >
            Request New Script
            <ArrowRight className="h-4 w-4 ml-2 icon-spin-hover" />
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}

function ServiceItem({
  icon: Icon,
  title,
  description,
  price,
  time,
  variant = "green",
}: {
  icon: React.ElementType
  title: string
  description: string
  price: string
  time: string
  variant?: "green" | "blue"
}) {
  const colors = {
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      icon: "text-green-600",
      price: "text-green-700 dark:text-green-300",
    },
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      icon: "text-primary",
      price: "text-primary dark:text-blue-300",
    },
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        colors[variant].bg
      )}
    >
      <Icon className={cn("h-5 w-5", colors[variant].icon)} />
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="text-right">
        <p className={cn("font-semibold text-sm", colors[variant].price)}>
          {price}
        </p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}

/**
 * Compact speed badge for headers/navbars
 */
export function SpeedBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium",
        className
      )}
    >
      <Zap className="h-3.5 w-3.5" />
      <span>15 min med certs &amp; scripts</span>
    </div>
  )
}

/**
 * How it works section highlighting the fast process
 */
export function HowItWorksSection({ className }: { className?: string }) {
  const steps = [
    {
      step: 1,
      title: "Tell us what you need",
      description: "Select your service and answer a few quick questions",
      icon: FileText,
      time: "2 mins",
    },
    {
      step: 2,
      title: "Doctor reviews your request",
      description: "An Australian GP reviews your information",
      icon: Stethoscope,
      time: "5-10 mins",
    },
    {
      step: 3,
      title: "Get your script or certificate",
      description: "E-script or PDF delivered to your email",
      icon: CheckCircle2,
      time: "Same day",
    },
  ]

  return (
    <div className={cn("py-12", className)}>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold">How it works</h2>
        <p className="text-muted-foreground mt-2">
          Three steps. Stay in bed. Certificate in your inbox.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative text-center"
          >
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-linear-to-r from-blue-300 to-transparent" />
            )}

            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <step.icon className="h-7 w-7 text-primary" />
            </div>

            <Badge variant="outline" className="mb-2">
              {step.time}
            </Badge>

            <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-10">
        <p className="text-sm text-muted-foreground mb-4">
          <strong>No phone call required</strong> for medical certificates and
          repeat prescriptions. Pay only after the doctor reviews.
        </p>
        <Link href="/request">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Get your certificate
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
