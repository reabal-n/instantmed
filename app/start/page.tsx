import Link from "next/link"
import { FileText, Pill } from "lucide-react"

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
    color: "bg-emerald-500",
  },
  {
    title: "Prescription",
    description: "Repeat prescriptions and medication reviews",
    href: "/prescriptions",
    icon: Pill,
    color: "bg-blue-500",
  },
]

export default function StartPage() {
  // Log for debugging in Vercel logs
  console.log("[/start] Rendering service selector page")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            What do you need today?
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Select a service below to get started. All consultations are reviewed by
            AHPRA-registered Australian doctors.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <Link
                key={service.href}
                href={service.href}
                className="group relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`${service.color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {service.title}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{service.description}</p>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Not sure what you need?{" "}
          <Link href="/contact" className="text-emerald-600 hover:underline">
            Contact us
          </Link>{" "}
          and we&apos;ll help you out.
        </p>
      </div>
    </div>
  )
}
