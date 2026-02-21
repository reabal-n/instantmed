import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { VerifyClient } from "./verify-client"
import { Shield, Lock, Building2, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Verify Medical Certificate",
  description: "Employers and institutions can verify the authenticity of medical certificates issued by InstantMed. Enter the verification code to confirm document validity.",
  openGraph: {
    title: "Verify Medical Certificate | InstantMed",
    description: "Verify the authenticity of medical certificates issued by InstantMed.",
  },
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar variant="marketing" />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-linear-to-b from-background to-emerald-50/30 dark:to-emerald-950/10 pt-28 pb-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 px-4 py-1.5">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Secure Verification
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
                Verify a Medical Certificate
              </h1>
              <p className="text-muted-foreground">
                Employers and institutions can use this portal to confirm the authenticity 
                of certificates issued through InstantMed.
              </p>
            </div>
          </div>
        </section>

        {/* Verification Form */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <VerifyClient />
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold text-foreground text-center mb-8">
                Why you can trust this verification
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">AHPRA Doctors</h3>
                  <p className="text-sm text-muted-foreground">
                    Every certificate is issued by an AHPRA-registered Australian doctor.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Tamper-Proof</h3>
                  <p className="text-sm text-muted-foreground">
                    Each certificate has a unique code that cannot be duplicated or altered.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Australian Business</h3>
                  <p className="text-sm text-muted-foreground">
                    InstantMed is a registered Australian healthcare provider based in Sydney.
                  </p>
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Need more information about our verification process?
                </p>
                <Link 
                  href="/for/employers" 
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  Employer verification guide
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <MarketingFooter />
    </div>
  )
}
