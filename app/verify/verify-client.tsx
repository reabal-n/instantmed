"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  FileText,
  Calendar,
  User,
  Building,
  AlertTriangle,
} from "lucide-react"

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
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Document Verification</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Verify the authenticity of medical certificates and documents issued by InstantMed.
        </p>
      </div>

      {/* Search Form */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enter Verification Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="e.g., IM-ABC12345 or MC-12345678"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider h-12"
                maxLength={20}
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
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && result && (
        <Card className={`border-2 ${result.valid ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
          <CardContent className="pt-6">
            {result.valid && (result.certificate || result.document) ? (
              <div className="space-y-6">
                {/* Success Header */}
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-emerald-900">Certificate Verified</h3>
                    <p className="text-emerald-700">This is a valid certificate issued by {result.certificate?.issuingClinic || "InstantMed"}.</p>
                  </div>
                </div>

                {/* Certificate Details - New format */}
                {result.certificate && (
                  <div className="bg-white rounded-lg border border-emerald-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        {result.certificate.type}
                      </Badge>
                      <span className="font-mono text-sm text-muted-foreground">
                        {result.certificate.certificateNumber}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="font-medium">{result.certificate.patientName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Issued by:</span>
                        <span className="font-medium">{result.certificate.issuingDoctor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Clinic:</span>
                        <span className="font-medium">{result.certificate.issuingClinic}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Issued:</span>
                        <span className="font-medium">{formatDate(result.certificate.issueDate)}</span>
                      </div>
                      {result.certificate.validFrom && result.certificate.validTo && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Valid period:</span>
                          <span className="font-medium">
                            {formatDate(result.certificate.validFrom)} — {formatDate(result.certificate.validTo)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Legacy format support */}
                {!result.certificate && result.document && (
                  <div className="bg-white rounded-lg border border-emerald-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        {formatDocumentType(result.document.type, result.document.subtype)}
                      </Badge>
                      <span className="font-mono text-sm text-muted-foreground">
                        {result.document.certificate_id}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="font-medium">{result.document.patient_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Issued by:</span>
                        <span className="font-medium">{result.document.doctor_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Issued:</span>
                        <span className="font-medium">{formatDate(result.document.issued_at)}</span>
                      </div>
                      {result.document.expires_at && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Valid until:</span>
                          <span className="font-medium">{formatDate(result.document.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Trust Note */}
                <p className="text-xs text-emerald-600 text-center">
                  This verification confirms the certificate was issued through InstantMed&apos;s secure platform.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Error Header */}
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-red-100 p-3">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-red-900">Verification Failed</h3>
                    <p className="text-red-700">
                      {result.error || "This code does not match any document in our system."}
                    </p>
                  </div>
                </div>

                {/* Help */}
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-dawn-500 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Possible reasons:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>The code may have been entered incorrectly</li>
                        <li>The document may have been issued before our verification system</li>
                        <li>The document may not have been issued by InstantMed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-red-600 text-center">
                  If you believe this is an error, please contact support@instantmed.com.au
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          <strong>For employers and institutions:</strong> Use this portal to verify the authenticity 
          of medical certificates presented to you.
        </p>
        <p>
          Need help? Contact us at{" "}
          <a href="mailto:support@instantmed.com.au" className="text-primary hover:underline">
            support@instantmed.com.au
          </a>
        </p>
      </div>
    </div>
  )
}
