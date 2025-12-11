import Link from "next/link"
import type { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Clock,
  CheckCircle,
  Stethoscope,
  Brain,
  Heart,
  Eye,
  Bone,
  Baby,
  Smile,
  Activity,
  Pill,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Online Specialist Referral Australia | See a Specialist | InstantMed",
  description:
    "Get a specialist referral online from an Australian GP. Dermatologist, cardiologist, psychiatrist and more. $29.95. No phone call needed.",
}

const SPECIALISTS = [
  {
    id: "dermatologist",
    title: "Dermatologist",
    tagline: "Skin stuff — moles, rashes, acne",
    icon: Smile,
    reasons: ["Suspicious moles", "Persistent rashes", "Severe acne", "Eczema/psoriasis"],
    waitTime: "2-6 weeks",
  },
  {
    id: "cardiologist",
    title: "Cardiologist",
    tagline: "Heart checks",
    icon: Heart,
    reasons: ["Chest pain", "Palpitations", "High blood pressure", "Family history"],
    waitTime: "2-4 weeks",
  },
  {
    id: "gastroenterologist",
    title: "Gastroenterologist",
    tagline: "Gut issues",
    icon: Activity,
    reasons: ["Reflux/GERD", "IBS symptoms", "Bloating", "Blood in stool"],
    waitTime: "3-6 weeks",
  },
  {
    id: "endocrinologist",
    title: "Endocrinologist",
    tagline: "Hormones, thyroid, diabetes",
    icon: Pill,
    reasons: ["Thyroid issues", "Diabetes management", "PCOS", "Hormone imbalance"],
    waitTime: "4-8 weeks",
  },
  {
    id: "psychiatrist",
    title: "Psychiatrist",
    tagline: "Mental health specialist",
    icon: Brain,
    reasons: ["Depression", "Anxiety", "ADHD assessment", "Medication review"],
    waitTime: "4-12 weeks",
  },
  {
    id: "orthopaedic",
    title: "Orthopaedic Surgeon",
    tagline: "Bones and joints",
    icon: Bone,
    reasons: ["Persistent pain", "Sports injury", "Joint problems", "Back issues"],
    waitTime: "2-6 weeks",
  },
  {
    id: "ophthalmologist",
    title: "Ophthalmologist",
    tagline: "Eye specialist",
    icon: Eye,
    reasons: ["Vision changes", "Eye pain", "Floaters", "Cataracts"],
    waitTime: "2-4 weeks",
  },
  {
    id: "obgyn",
    title: "Obstetrician/Gynaecologist",
    tagline: "Women's health",
    icon: Baby,
    reasons: ["Pregnancy care", "Menstrual issues", "Fertility", "Menopause"],
    waitTime: "2-6 weeks",
  },
]

export default function ReferralsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

          <div className="relative mx-auto max-w-4xl text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-0">
              <Stethoscope className="w-3 h-3 mr-1" />
              Specialist Referrals
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Need to see a specialist? <span className="text-primary">We'll write the letter.</span>
            </h1>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us who you need to see and why. A GP will review your request and issue a referral if appropriate.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Medicare valid
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                Reviewed within 24hrs
              </span>
              <span className="text-border">•</span>
              <span className="font-semibold text-foreground">$29.95</span>
            </div>
          </div>
        </section>

        {/* Specialist Categories */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-center mb-8">Choose a specialist</h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SPECIALISTS.map((spec) => (
                <Link
                  key={spec.id}
                  href={`/referrals/specialist/request?type=${spec.id}`}
                  className="group bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <spec.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                        {spec.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{spec.tagline}</p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    {spec.reasons.slice(0, 3).map((reason) => (
                      <p key={reason} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary/50" />
                        {reason}
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Wait: {spec.waitTime}</span>
                    <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Get referral <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Other specialists CTA */}
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-3">Don't see your specialist?</p>
              <Link href="/referrals/specialist/request">
                <Button variant="outline" className="rounded-full bg-transparent">
                  Request any specialist
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Pathology & Imaging Section */}
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-4xl">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-1">Pathology & Imaging</h3>
                  <p className="text-muted-foreground">
                    Need blood tests or scans? Request a pathology or imaging referral and take it to any lab.
                  </p>
                </div>
                <Link href="/pathology">
                  <Button className="rounded-full whitespace-nowrap">
                    View tests
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
