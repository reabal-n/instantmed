"use client"

import Link from "next/link"
import { FileText, Pill, Stethoscope, FlaskConical, ArrowRight, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const services = [
  {
    id: "medcert",
    title: "Medical Certificate",
    description: "Work, uni & carer's leave certificates",
    icon: FileText,
    href: "/medical-certificate",
    price: "$19.95",
    estimatedTime: "~45 mins",
    popular: true,
    features: ["Employer-ready format", "Same-day delivery", "Backdating available"],
  },
  {
    id: "prescription",
    title: "Prescription",
    description: "Repeat scripts & medication reviews",
    icon: Pill,
    href: "/prescriptions",
    price: "$24.95",
    estimatedTime: "~1 hour",
    features: ["Sent to your pharmacy", "Repeat prescriptions", "New medications"],
  },
  {
    id: "pathology",
    title: "Pathology & Imaging",
    description: "Blood tests, scans & specialist referrals",
    icon: FlaskConical,
    href: "/pathology",
    price: "$29.95",
    estimatedTime: "~1 hour",
    features: ["Bulk-billed tests", "Specialist referrals", "Results tracking"],
  },
  {
    id: "referral",
    title: "Specialist Referral",
    description: "Dermatology, cardiology & more",
    icon: Stethoscope,
    href: "/referrals",
    price: "$29.95",
    estimatedTime: "~1 hour",
    features: ["Valid for 12 months", "Medicare rebate", "All specialists"],
  },
]

export function ServiceSelector({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">What do you need?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Choose your service to get started</p>
            </div>
            {!isAuthenticated && (
              <Button variant="outline" asChild size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className={cn(
                "group relative overflow-hidden border-2 transition-all duration-200 hover:border-primary hover:shadow-lg",
                service.popular && "border-primary/50",
              )}
            >
              {service.popular && (
                <div className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most popular
                </div>
              )}

              <Link href={service.href} className="block p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <service.icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {service.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{service.description}</p>

                    {/* Pricing & Time */}
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="font-semibold text-foreground">{service.price}</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {service.estimatedTime}
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="mt-4 space-y-2">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                      <span>Get started</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-8 rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Not sure which service you need?{" "}
            <Link href="/how-it-works" className="font-medium text-primary hover:underline">
              Learn how it works
            </Link>{" "}
            or{" "}
            <Link href="/faq" className="font-medium text-primary hover:underline">
              browse our FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
