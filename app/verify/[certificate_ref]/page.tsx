import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  Shield,
  Calendar,
  User,
  Building,
  FileText,
  Lock,
  AlertTriangle,
} from "lucide-react"
import { getCertificateByRef } from "@/lib/data/issued-certificates"
import { CONTACT_EMAIL } from "@/lib/constants"

interface Props {
  params: Promise<{ certificate_ref: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { certificate_ref } = await params
  return {
    title: `Verify ${certificate_ref} | InstantMed`,
    description: "Verify the authenticity of a medical certificate issued by InstantMed.",
    robots: { index: false, follow: false },
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatCertificateType(type: string | null): string {
  switch (type) {
    case "work": return "Medical Certificate (Work)"
    case "study": return "Medical Certificate (Study)"
    case "carer": return "Carer's Leave Certificate"
    default: return "Medical Certificate"
  }
}

function maskName(fullName: string | null): string {
  if (!fullName) return "Patient"
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return "Patient"
  if (parts.length === 1) return parts[0]!
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1]![0]?.toUpperCase() || ""
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName!
}

export default async function VerifyCertificateRefPage({ params }: Props) {
  const { certificate_ref } = await params

  // Validate format: IM-TYPE-YYYYMMDD-NNNNN
  const refPattern = /^IM-(WORK|STUDY|CARER)-\d{8}-\d{5}$/
  if (!refPattern.test(certificate_ref.toUpperCase())) {
    notFound()
  }

  const cert = await getCertificateByRef(certificate_ref.toUpperCase())

  const isRevoked = cert?.status === "revoked"
  const isValid = cert?.status === "valid"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1 bg-hero pt-28 pb-16">
        <div className="mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 px-4 py-1.5">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Certificate Verification
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
              Verify Certificate
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              {certificate_ref.toUpperCase()}
            </p>
          </div>

          {/* Result */}
          {isValid && cert ? (
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-emerald-200 dark:border-emerald-500/20">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-3 shrink-0">
                    <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">Certificate Verified</h3>
                    <p className="text-emerald-700 dark:text-emerald-400 text-sm">
                      This is a valid certificate issued by InstantMed.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 dark:bg-white/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                      {formatCertificateType(cert.certificate_type)}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {cert.certificate_ref || cert.certificate_number}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-medium text-foreground">{maskName(cert.patient_name)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Issued by:</span>
                      <span className="font-medium text-foreground">
                        {cert.doctor_name}
                        {cert.doctor_nominals ? `, ${cert.doctor_nominals}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Issued:</span>
                      <span className="font-medium text-foreground">{formatDate(cert.issue_date)}</span>
                    </div>
                    {cert.start_date && cert.end_date && (
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Valid period:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(cert.start_date)} — {formatDate(cert.end_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  This verification confirms the certificate was issued through InstantMed&apos;s secure platform.
                </p>
              </div>
            </div>
          ) : isRevoked ? (
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-red-200 dark:border-red-500/20">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-red-50 dark:bg-red-500/10 p-3 shrink-0">
                    <XCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Certificate Revoked</h3>
                    <p className="text-muted-foreground text-sm">
                      This certificate has been revoked and is no longer valid.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  If you believe this is an error, please contact {CONTACT_EMAIL}
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-border">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-red-50 dark:bg-red-500/10 p-3 shrink-0">
                    <XCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Certificate Not Found</h3>
                    <p className="text-muted-foreground text-sm">
                      No certificate matches this reference number.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 dark:bg-white/5 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">Possible reasons:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>The reference number may have been entered incorrectly</li>
                        <li>The certificate may not have been issued by InstantMed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  If you believe this is an error, please contact {CONTACT_EMAIL}
                </p>
              </div>
            </div>
          )}

          {/* Link to manual verification */}
          <div className="mt-8 text-center">
            <Link
              href="/verify"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Verify using a different code
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
