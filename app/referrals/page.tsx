import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { TiltCard } from "@/components/shared/tilt-card"
import { Badge } from "@/components/ui/badge"
import { ReferralIcon, ImagingIcon } from "@/components/shared/animated-icons"
import { ArrowRight, Stethoscope, Clock, CheckCircle, Shield, Star } from "lucide-react"

export default function ReferralsPage() {
  const subtypes = [
    {
      id: "specialist",
      title: "Specialist Referral",
      description: "Request a referral to a specialist. A GP will review and issue if clinically appropriate.",
      icon: ReferralIcon,
      href: "/referrals/specialist",
      price: "$34.99",
      popular: true,
      emoji: "👨‍⚕️",
    },
    {
      id: "pathology-imaging",
      title: "Pathology & Imaging",
      description: "Request blood tests or imaging. A GP will assess whether a referral is appropriate.",
      icon: ImagingIcon,
      href: "/referrals/pathology-imaging/request",
      price: "$29.99",
      popular: false,
      emoji: "🔬",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-gradient-hero overflow-hidden">
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge
              className="mb-6 bg-primary/10 text-primary border-0 px-4 py-1.5 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
            >
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              Referrals
            </Badge>

            <h1
              className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
            >
              Request a referral <span className="text-primary">online</span>
            </h1>
            <p
              className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              Submit your request online. A GP will review your information and issue a referral if clinically
              appropriate.
            </p>

            {/* Trust indicators */}
            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Reviewed within 24hrs</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Medicare eligible</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>GP reviewed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Subtype Selection */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-subtle">
          <div className="mx-auto max-w-3xl">
            <div
              className="text-center mb-12 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
            >
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">What do you need?</h2>
              <p className="mt-2 text-muted-foreground">Select an option to get started.</p>
            </div>

            <div className="grid gap-6">
              {subtypes.map((subtype, index) => (
                <Link key={subtype.id} href={subtype.href} className="group">
                  <TiltCard
                    className="animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.15 + index * 0.1}s`, animationFillMode: "forwards" }}
                  >
                    <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                          <subtype.icon className="w-10 h-10" />
                        </div>
                        <span className="absolute -top-2 -right-2 text-2xl">{subtype.emoji}</span>
                        {subtype.popular && (
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary text-primary" />
                            Popular
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {subtype.title}
                          </h3>
                        </div>
                        <p className="text-muted-foreground">{subtype.description}</p>
                      </div>

                      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                        <span className="text-2xl font-bold text-primary font-mono">{subtype.price}</span>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                          <span>Get started</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-8 mt-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Submit your request</h3>
                <p className="text-sm text-muted-foreground">Tell us what you need and provide some basic details.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">GP reviews</h3>
                <p className="text-sm text-muted-foreground">An Australian-registered GP reviews your information.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Get your referral</h3>
                <p className="text-sm text-muted-foreground">If approved, your referral is sent directly to you.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
