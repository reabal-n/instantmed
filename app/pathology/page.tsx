import Link from "next/link"
import type { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Clock,
  CheckCircle,
  Droplet,
  TestTube,
  Scan,
  Activity,
  Heart,
  Pill,
  Baby,
  Shield,
  Zap,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Online Pathology Referral Australia | Blood Tests Without GP Visit | InstantMed",
  description:
    "Request blood tests online. General health check, thyroid, iron, vitamin D, STI screening and more. $29.95. Take your referral to any pathology lab.",
}

const TEST_PANELS = [
  {
    id: "general-health",
    title: "General Health Check",
    tagline: "The 'how am I doing?' panel",
    price: "$29.95",
    icon: Activity,
    tests: [
      "Full Blood Count",
      "Kidney Function (UEC)",
      "Liver Function (LFT)",
      "Cholesterol (Lipids)",
      "Blood Sugar (HbA1c)",
    ],
    popular: true,
    description: "A comprehensive snapshot of your overall health. Good for annual checkups.",
  },
  {
    id: "thyroid",
    title: "Thyroid Panel",
    tagline: "Feeling tired or gaining weight?",
    price: "$29.95",
    icon: Zap,
    tests: ["TSH", "Free T4", "Free T3"],
    popular: false,
    description: "Checks if your thyroid is under or overactive.",
  },
  {
    id: "iron",
    title: "Iron Studies",
    tagline: "Low energy? Could be iron.",
    price: "$29.95",
    icon: Droplet,
    tests: ["Serum Iron", "Ferritin", "Transferrin", "TIBC"],
    popular: true,
    description: "Checks for iron deficiency or overload.",
  },
  {
    id: "vitamin-d",
    title: "Vitamin D",
    tagline: "The sunshine vitamin",
    price: "$29.95",
    icon: TestTube,
    tests: ["25-OH Vitamin D"],
    popular: false,
    description: "Many Aussies are deficient. Especially in winter.",
  },
  {
    id: "sti",
    title: "STI Screening",
    tagline: "Discreet and confidential",
    price: "$29.95",
    icon: Shield,
    tests: ["Chlamydia", "Gonorrhoea", "Syphilis", "HIV"],
    popular: true,
    description: "Comprehensive STI panel. Results in 2-3 days.",
  },
  {
    id: "hormone-female",
    title: "Women's Hormone Panel",
    tagline: "Hormones out of whack?",
    price: "$29.95",
    icon: Baby,
    tests: ["FSH", "LH", "Oestradiol", "Progesterone", "Prolactin"],
    popular: false,
    description: "For irregular periods, fertility or menopause.",
  },
  {
    id: "hormone-male",
    title: "Men's Hormone Panel",
    tagline: "Check your testosterone",
    price: "$29.95",
    icon: Heart,
    tests: ["Total Testosterone", "Free Testosterone", "SHBG", "LH", "FSH"],
    popular: false,
    description: "For low energy, mood changes or low libido.",
  },
  {
    id: "diabetes",
    title: "Diabetes Check",
    tagline: "Blood sugar monitoring",
    price: "$29.95",
    icon: Pill,
    tests: ["Fasting Glucose", "HbA1c", "Insulin"],
    popular: false,
    description: "For diabetes risk assessment or monitoring.",
  },
]

export default function PathologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/20" />

          <div className="relative mx-auto max-w-4xl text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/50 dark:text-blue-300">
              <TestTube className="w-3 h-3 mr-1" />
              Pathology Referrals
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Blood tests without the GP visit
            </h1>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Request your blood tests online. A GP reviews your request and issues a referral you can take to any
              pathology lab.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Valid at any lab
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Same day referral
              </span>
              <span className="text-border">•</span>
              <span className="font-semibold text-foreground">$29.95 any test</span>
            </div>
          </div>
        </section>

        {/* Test Panels */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-center mb-2">Popular test panels</h2>
            <p className="text-center text-muted-foreground mb-8">Select a panel or request specific tests</p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEST_PANELS.map((panel) => (
                <Link
                  key={panel.id}
                  href={`/pathology/request?panel=${panel.id}`}
                  className="group relative bg-card border border-border rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
                >
                  {panel.popular && (
                    <span className="absolute -top-2.5 right-4 bg-blue-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <panel.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                        {panel.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{panel.tagline}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{panel.description}</p>

                  <div className="space-y-1 mb-4">
                    <p className="text-xs font-medium text-foreground">Includes:</p>
                    {panel.tests.slice(0, 3).map((test) => (
                      <p key={test} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {test}
                      </p>
                    ))}
                    {panel.tests.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{panel.tests.length - 3} more</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{panel.price}</span>
                    <span className="text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Request <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Custom request CTA */}
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-3">Need a specific test not listed?</p>
              <Link href="/pathology/request">
                <Button variant="outline" className="rounded-full bg-transparent">
                  Request custom tests
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-semibold text-center mb-8">How it works</h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              {[
                { step: 1, title: "Choose your tests", desc: "Select a panel or specific tests" },
                { step: 2, title: "GP issues referral", desc: "Same day, sent to your email" },
                { step: 3, title: "Visit any lab", desc: "Take referral to Laverty, QML, etc." },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-4 sm:flex-col sm:text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Imaging section */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Scan className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-1">Need imaging instead?</h3>
                  <p className="text-muted-foreground">
                    X-rays, ultrasounds, CT or MRI scans. Request an imaging referral online.
                  </p>
                </div>
                <Link href="/imaging/request">
                  <Button className="rounded-full whitespace-nowrap bg-purple-600 hover:bg-purple-700">
                    Request imaging
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
