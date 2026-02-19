import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Card, CardContent } from "@/components/ui/card"
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
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { getCertificateByRef } from "@/lib/data/issued-certificates"

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
    <div className="min-h-screen flex flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-linear-to-b from-background to-emerald-50/30 dark:to-emerald-950/10 pt-28 pb-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 px-4 py-1.5">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Certificate Verification
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
                Verify Certificate
              </h1>
              <p className="text-muted-foreground font-mono text-sm">
                {certificate_ref.toUpperCase()}
              </p>
            </div>
          </div>
        </section>

        {/* Result */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            {isValid && cert ? (
              <Card className="border-2 border-emerald-200 bg-emerald-50/50">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-emerald-100 p-3">
                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-emerald-900">Certificate Verified</h3>
                        <p className="text-emerald-700">
                          This is a valid certificate issued by InstantMed.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-emerald-200 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          {formatCertificateType(cert.certificate_type)}
                        </Badge>
                        <span className="font-mono text-sm text-muted-foreground">
                          {cert.certificate_ref || cert.certificate_number}
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Patient:</span>
                          <span className="font-medium">{maskName(cert.patient_name)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Issued by:</span>
                          <span className="font-medium">
                            {cert.doctor_name}
                            {cert.doctor_nominals ? `, ${cert.doctor_nominals}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Issued:</span>
                          <span className="font-medium">{formatDate(cert.issue_date)}</span>
                        </div>
                        {cert.start_date && cert.end_date && (
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Valid period:</span>
                            <span className="font-medium">
                              {formatDate(cert.start_date)} — {formatDate(cert.end_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-emerald-600 text-center">
                      This verification confirms the certificate was issued through InstantMed&apos;s secure platform.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isRevoked ? (
              <Card className="border-2 border-red-200 bg-red-50/50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-red-100 p-3">
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-red-900">Certificate Revoked</h3>
                        <p className="text-red-700">
                          This certificate has been revoked and is no longer valid.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-red-200 bg-red-50/50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-red-100 p-3">
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-red-900">Certificate Not Found</h3>
                        <p className="text-red-700">
                          No certificate matches this reference number.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-red-200 p-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Possible reasons:</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>The reference number may have been entered incorrectly</li>
                            <li>The certificate may not have been issued by InstantMed</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-red-600 text-center">
                      If you believe this is an error, please contact support@instantmed.com.au
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Link to manual verification */}
            <div className="mt-6 text-center">
              <Link
                href="/verify"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Verify using a different code
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
