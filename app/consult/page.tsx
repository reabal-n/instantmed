import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Stethoscope,
  MessageSquare,
  Video,
  FileText,
} from "lucide-react"

export const metadata: Metadata = {
  title: "General Consult | Online Doctor Consultation | InstantMed",
  description:
    "Book an online consultation with an Australian GP. New prescriptions, complex health concerns, and comprehensive assessments. $49.95 flat fee.",
}

const features = [
  {
    icon: Stethoscope,
    title: "New prescriptions",
    description: "Get a new prescription for medications you haven&apos;t taken before",
  },
  {
    icon: MessageSquare,
    title: "Complex concerns",
    description: "Discuss health issues that need more than a quick assessment",
  },
  {
    icon: Video,
    title: "Video or messaging",
    description: "Choose between video call or secure messaging with your doctor",
  },
  {
    icon: FileText,
    title: "Referrals & letters",
    description: "Request specialist referrals or medical letters",
  },
]

const includes = [
  "Comprehensive GP assessment",
  "New prescriptions (if appropriate)",
  "E-script sent to your phone",
  "Referral letters if needed",
  "Follow-up messaging included",
  "Valid at any pharmacy",
]

export default function ConsultPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:px-6 sm:py-16 overflow-hidden">
          <div className="hero-orb hero-orb-violet w-[500px] h-[500px] -top-[200px] left-1/2 -translate-x-1/2 opacity-40" />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-violet-500/10 text-violet-600 border-0 text-sm font-medium">
              General Consult
            </Badge>
            <h1
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
            >
              Speak with an Australian GP{" "}
              <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                online
              </span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
            >
              For new prescriptions, complex health concerns, or when you need more than a quick assessment.
              AHPRA-registered doctors available 7 days a week.
            </p>

            <div
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              <Button
                asChild
                size="lg"
                className="rounded-full bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold h-14 px-8 shadow-lg"
              >
                <Link href="/consult/request">
                  Book a consult — $49.95
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div
              className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" />
                <span>AHPRA registered</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                <span>Same-day appointments</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-12 sm:px-6 bg-mesh">
          <div className="mx-auto max-w-5xl">
            <h2
              className="text-2xl font-semibold text-center mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What you can discuss
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.1 + index * 0.1}s`, animationFillMode: "forwards" }}
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-violet-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="glass-card rounded-3xl p-8 text-center">
              <Badge className="mb-4 bg-violet-500/10 text-violet-600 border-0">One flat fee</Badge>
              <div className="mb-6">
                <span className="text-5xl font-bold">$49.95</span>
                <span className="text-muted-foreground ml-2">AUD</span>
              </div>
              <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto rounded-full bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold h-12 px-8"
              >
                <Link href="/consult/request">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Full refund if we can&apos;t help. No hidden fees.
              </p>
            </div>
          </div>
        </section>

        {/* When to use */}
        <section className="px-4 py-12 sm:px-6 bg-mesh">
          <div className="mx-auto max-w-3xl">
            <h2
              className="text-2xl font-semibold text-center mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              When to book a General Consult
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-green-600 mb-3">✓ Good for</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• New prescription requests</li>
                  <li>• Health concerns needing discussion</li>
                  <li>• Specialist referrals</li>
                  <li>• Second opinions</li>
                  <li>• Mental health check-ins</li>
                  <li>• Chronic condition reviews</li>
                </ul>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-amber-600 mb-3">⚠ Not suitable for</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Emergencies (call 000)</li>
                  <li>• Physical examinations</li>
                  <li>• Schedule 8 medications</li>
                  <li>• WorkCover claims</li>
                  <li>• Conditions requiring in-person care</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Need a repeat script instead?
            </h2>
            <p className="text-muted-foreground mb-6">
              If you&apos;re already taking a medication and just need a repeat, our prescription service is faster and more affordable.
            </p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/prescriptions/request">
                Get a repeat script — $29.95
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
