import Link from "next/link"
import { FileText, Pill, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Get Started | InstantMed",
  description:
    "Start your telehealth consultation with InstantMed. Medical certificates and prescriptions from AHPRA-registered doctors.",
}

const services = [
  {
    title: "Medical Certificate",
    description: "Work, university, or carer's leave certificates",
    href: "/medical-certificate/request",
    icon: FileText,
    accent: "#00E2B5",
    emoji: "📄",
  },
  {
    title: "Prescription",
    description: "Repeat prescriptions and medication reviews",
    href: "/prescriptions/request",
    icon: Pill,
    accent: "#3B82F6",
    emoji: "💊",
  },
]

export default function StartPage() {
  return (
    <div className="min-h-screen bg-premium-mesh flex items-center justify-center">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Gradient orbs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" style={{ background: 'radial-gradient(circle, rgba(0,226,181,0.12) 0%, transparent 70%)' }} />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-14 animate-slide-up">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground mb-5">
            What do you need today?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Select a service below to get started. All consultations are reviewed by
            AHPRA-registered Australian doctors.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid gap-6 sm:grid-cols-2 animate-slide-up-delay-1">
          {services.map((service) => {
            return (
              <Link
                key={service.href}
                href={service.href}
                className="group block"
              >
                <div 
                  className="glass-card relative rounded-3xl p-8 overflow-hidden transition-all duration-300 hover:-translate-y-2"
                  style={{
                    boxShadow: `0 4px 24px ${service.accent}15`,
                  }}
                >
                  {/* Top accent line */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(90deg, transparent, ${service.accent}, transparent)` }}
                  />
                  
                  {/* Outer glow on hover */}
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      boxShadow: `0 0 60px ${service.accent}20, 0 0 100px ${service.accent}10`,
                    }}
                  />
                  
                  {/* 3D Emoji icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-4xl"
                    style={{ 
                      background: `linear-gradient(145deg, ${service.accent}20, ${service.accent}08)`,
                      boxShadow: `inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px ${service.accent}15`,
                    }}
                  >
                    <span className="drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{service.emoji}</span>
                  </div>
                  
                  <h2 className="font-heading text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{service.description}</p>
                  
                  {/* CTA */}
                  <div 
                    className="inline-flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1"
                    style={{ color: service.accent }}
                  >
                    Get started
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
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
