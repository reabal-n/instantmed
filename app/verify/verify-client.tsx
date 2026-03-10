"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Calendar,
  User,
  Building,
  AlertTriangle,
  Search,
} from "lucide-react"
import { CONTACT_EMAIL } from "@/lib/constants"

interface VerificationResult {
  valid: boolean
  certificate?: {
    certificateNumber: string
    type: string
    issueDate: string
    validFrom?: string
    validTo?: string
    patientName: string
    issuingDoctor: string
    issuingClinic: string
  }
  // Legacy format support
  document?: {
    type: string
    subtype: string
    issued_at: string
    expires_at: string | null
    patient_name: string
    doctor_name: string
    certificate_id: string
  }
  error?: string
}

export function VerifyClient() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/verify?code=${encodeURIComponent(cleanCode)}`)
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setResult({ valid: false, error: data.error || "Verification failed" })
      }
    } catch {
      setResult({ valid: false, error: "Unable to verify. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDocumentType = (type: string, subtype: string) => {
    if (type === "med_cert") {
      const subtypeLabels: Record<string, string> = {
        work: "Work Medical Certificate",
        uni: "University Medical Certificate",
        carer: "Carer's Certificate",
      }
      return subtypeLabels[subtype] || "Medical Certificate"
    }
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-8">
      {/* Search Form */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Enter Verification Code</h2>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="e.g., IM-WORK-20260101-00001"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono tracking-wider h-12"
              maxLength={25}
            />
            <p className="text-xs text-muted-foreground text-center">
              The verification code can be found on the document or in the email you received.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Verify Document
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Results */}
      {hasSearched && result && (
        <>
          {result.valid && (result.certificate || result.document) ? (
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-emerald-200 dark:border-emerald-500/20">
              <div className="space-y-6">
                {/* Success Header */}
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-3 shrink-0">
                    <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">Certificate Verified</h3>
                    <p className="text-emerald-700 dark:text-emerald-400 text-sm">
                      This is a valid certificate issued by {result.certificate?.issuingClinic || "InstantMed"}.
                    </p>
                  </div>
                </div>

                {/* Certificate Details - New format */}
                {result.certificate && (
                  <div className="rounded-xl bg-muted/50 dark:bg-white/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                        {result.certificate.type}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {result.certificate.certificateNumber}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="font-medium text-foreground">{result.certificate.patientName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Issued by:</span>
                        <span className="font-medium text-foreground">{result.certificate.issuingDoctor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Clinic:</span>
                        <span className="font-medium text-foreground">{result.certificate.issuingClinic}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Issued:</span>
                        <span className="font-medium text-foreground">{formatDate(result.certificate.issueDate)}</span>
                      </div>
                      {result.certificate.validFrom && result.certificate.validTo && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Valid period:</span>
                          <span className="font-medium text-foreground">
                            {formatDate(result.certificate.validFrom)} — {formatDate(result.certificate.validTo)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Legacy format support */}
                {!result.certificate && result.document && (
                  <div className="rounded-xl bg-muted/50 dark:bg-white/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                        {formatDocumentType(result.document.type, result.document.subtype)}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {result.document.certificate_id}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="font-medium text-foreground">{result.document.patient_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Issued by:</span>
                        <span className="font-medium text-foreground">{result.document.doctor_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Issued:</span>
                        <span className="font-medium text-foreground">{formatDate(result.document.issued_at)}</span>
                      </div>
                      {result.document.expires_at && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Valid until:</span>
                          <span className="font-medium text-foreground">{formatDate(result.document.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Trust Note */}
                <p className="text-xs text-muted-foreground text-center">
                  This verification confirms the certificate was issued through InstantMed&apos;s secure platform.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-border">
              <div className="space-y-5">
                {/* Error Header */}
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-red-50 dark:bg-red-500/10 p-3 shrink-0">
                    <XCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Verification Failed</h3>
                    <p className="text-muted-foreground text-sm">
                      {result.error || "This code does not match any document in our system."}
                    </p>
                  </div>
                </div>

                {/* Help */}
                <div className="rounded-xl bg-muted/50 dark:bg-white/5 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">Possible reasons:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>The code may have been entered incorrectly</li>
                        <li>The document may have been issued before our verification system</li>
                        <li>The document may not have been issued by InstantMed</li>
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
        </>
      )}

      {/* Info Section */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          <strong className="text-foreground">For employers and institutions:</strong> Use this portal to verify the authenticity
          of medical certificates presented to you.
        </p>
        <p>
          Need help? Contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  )
}
