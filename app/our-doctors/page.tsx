import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  ExternalLink,
  Stethoscope,
  GraduationCap,
  Clock,
  MapPin,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Our Doctors | AHPRA-Registered Australian GPs | InstantMed",
  description:
    "Meet the AHPRA-registered Australian doctors who review every InstantMed request. Experienced GPs with Medical Director oversight.",
  openGraph: {
    title: "Our Doctors | InstantMed",
    description:
      "Every request is reviewed by a real doctor. AHPRA-registered Australian GPs with years of clinical experience.",
  },
}

export default function OurDoctorsPage() {
  const doctorCredentials = [
    {
      icon: GraduationCap,
      title: "AHPRA Verified",
      description:
        "Every doctor is registered with the Australian Health Practitioner Regulation Agency and holds a current medical licence.",
    },
    {
      icon: Clock,
      title: "Experienced GPs",
      description:
        "Our doctors have years of clinical experience in Australian general practice. They know what they're doing.",
    },
    {
      icon: MapPin,
      title: "Based in Australia",
      description:
        "Our doctors work from Australia and understand the healthcare system, prescribing guidelines, and patient needs.",
    },
    {
      icon: Users,
      title: "Medical Director Oversight",
      description:
        "All clinical protocols are overseen by a Medical Director who holds Fellowship with the RACGP.",
    },
  ]

  const clinicalTeam = [
    {
      name: "Dr. Sarah M.",
      role: "Medical Director",
      credentials: "MBBS, FRACGP",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      bio: "Dr. Sarah has practised general medicine in Sydney for over 15 years. She oversees clinical standards at InstantMed and ensures every doctor on our platform meets the same standards she'd expect in her own practice.",
      quote: "I review every protocol as if my own family were using the service. That's the standard we hold ourselves to.",
    },
    {
      name: "Dr. James T.",
      role: "Senior GP",
      credentials: "MBBS, FRACGP",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      bio: "Dr. James brings over a decade of experience in metropolitan and regional general practice. He focuses on ensuring our telehealth consultations maintain the same clinical rigour as in-person care.",
    },
    {
      name: "Dr. Emily W.",
      role: "GP",
      credentials: "MBBS, DCH",
      image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face",
      bio: "Dr. Emily specialises in women's health and preventive care. She joined InstantMed to help make quality healthcare more accessible for busy Australians.",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden bg-linear-to-b from-background to-emerald-50/30 dark:to-emerald-950/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 px-4 py-1.5">
                <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                Real Australian Doctors
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                Every request reviewed by{" "}
                <span className="text-primary">a real GP</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                There&apos;s no algorithm making decisions about your health.
                Every single request is reviewed by an AHPRA-registered
                Australian doctor who takes the time to understand your
                situation.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="py-2 px-4">
                  <Shield className="w-4 h-4 mr-2 text-emerald-600" />
                  AHPRA Registered
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <GraduationCap className="w-4 h-4 mr-2 text-primary" />
                  FRACGP Qualified
                </Badge>
                <Badge variant="outline" className="py-2 px-4">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  Australian Based
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {doctorCredentials.map((credential) => (
                <div
                  key={credential.title}
                  className="bg-card rounded-2xl border p-6 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <credential.icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {credential.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {credential.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Clinical Team */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Meet the clinical team
                </h2>
                <p className="text-muted-foreground">
                  Experienced doctors who hold themselves to the highest
                  standards.
                </p>
              </div>

              <div className="space-y-8">
                {clinicalTeam.map((doctor) => (
                  <div
                    key={doctor.name}
                    className="bg-card rounded-2xl border p-6 md:p-8"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="shrink-0">
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden ring-4 ring-emerald-500/20 mx-auto md:mx-0">
                          <Image
                            src={doctor.image}
                            alt={doctor.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {doctor.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="w-fit mx-auto md:mx-0"
                          >
                            {doctor.credentials}
                          </Badge>
                        </div>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-3">
                          {doctor.role}
                        </p>
                        <p className="text-muted-foreground mb-4">
                          {doctor.bio}
                        </p>
                        {doctor.quote && (
                          <blockquote className="border-l-2 border-emerald-500 pl-4 italic text-muted-foreground">
                            &ldquo;{doctor.quote}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Our consulting doctors roster varies. All doctors meet the same
                credentialing requirements and clinical standards.
              </p>
            </div>
          </div>
        </section>

        {/* AHPRA Verification */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Verify our doctors yourself
              </h2>
              <p className="text-muted-foreground mb-6">
                Every doctor&apos;s registration can be independently verified
                on the AHPRA public register. We encourage you to check.
              </p>
              <Button asChild variant="outline" className="rounded-full bg-transparent">
                <Link
                  href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  AHPRA Public Register
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-6">
                Complete a 2-minute form and one of our doctors will review
                your request.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="rounded-full">
                  <Link href="/start">Start your request</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link href="/clinical-governance">
                    Our clinical standards
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
