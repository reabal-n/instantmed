"use client"

import { ArrowRight, Check, FileText, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { CertificateShowcaseMockup } from "@/components/marketing/mockups/certificate-showcase"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const CERTIFICATE_FEATURES = [
  "AHPRA-registered doctor\u2019s name and provider number",
  "Unique certificate ID with online verification",
  "Standard details for employer or study documentation",
  "Secure PDF delivered directly to your email",
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Section 3: Certificate Preview - split layout with animated mockup */
export function CertificatePreviewSection({ onCTAClick }: { onCTAClick?: () => void }) {
  return (
    <section aria-label="Certificate preview" className="py-20 lg:py-24 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text content */}
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                What you&apos;ll receive
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight">
              A real certificate from a real doctor
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Every certificate is issued by an AHPRA-registered GP and includes
              everything your employer or university needs. Identical to what
              you&apos;d receive at a clinic.
            </p>

            <ul className="space-y-3 mb-8">
              {CERTIFICATE_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="active:scale-[0.98]"
                onClick={onCTAClick}
              >
                <Link href="/request?service=med-cert">
                  Get your certificate
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <a
                href="/sample-certificate.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Download sample (PDF)
              </a>
            </div>
            <div className="mt-3">
              <Link
                href="/verify"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify a certificate
              </Link>
            </div>
          </Reveal>

          {/* Certificate mockup */}
          <Reveal delay={0.15} className="flex justify-center">
            <CertificateShowcaseMockup />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
