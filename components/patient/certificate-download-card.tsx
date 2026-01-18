"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText,
  Download,
  Shield,
  Loader2,
  AlertCircle,
  Mail,
  CheckCircle,
} from "lucide-react"
import { getCertificateDownloadUrlForIntake } from "@/app/actions/certificate-download"
import { resendCertificate } from "@/app/actions/resend-certificate"

interface CertificateDownloadCardProps {
  intakeId: string
  serviceName?: string
  verificationCode?: string
  canResend?: boolean
}

export function CertificateDownloadCard({
  intakeId,
  serviceName,
  verificationCode,
  canResend = false,
}: CertificateDownloadCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleDownload = () => {
    setError(null)
    startTransition(async () => {
      const result = await getCertificateDownloadUrlForIntake(intakeId)

      if (!result.success || !result.url) {
        setError(result.error || "Failed to generate download link")
        return
      }

      // Open the signed URL in a new tab to trigger download
      window.open(result.url, "_blank")
    })
  }

  const handleResend = async () => {
    setError(null)
    setResendSuccess(false)
    setIsResending(true)

    try {
      const result = await resendCertificate(intakeId)
      if (!result.success) {
        setError(result.error || "Failed to resend email")
      } else {
        setResendSuccess(true)
        setTimeout(() => setResendSuccess(false), 5000)
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-emerald-100 p-3">
            <FileText className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-emerald-900">
                Your Document is Ready
              </h3>
              <p className="text-sm text-emerald-700">
                Download your {serviceName || "certificate"} below.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Resend Success */}
            {resendSuccess && (
              <div className="p-3 rounded-md bg-emerald-100 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Certificate has been resent to your email.
              </div>
            )}

            {/* Download Button */}
            <Button
              size="lg"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
              onClick={handleDownload}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isPending ? "Generating link..." : "Download PDF"}
            </Button>

            {/* Verification Code */}
            {verificationCode && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 pt-2">
                <Shield className="h-4 w-4" />
                <span>
                  Verification Code:{" "}
                  <code className="font-mono font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                    {verificationCode}
                  </code>
                </span>
              </div>
            )}

            <p className="text-xs text-emerald-600">
              A copy has also been sent to your email.
            </p>

            {/* Resend Email Button */}
            {canResend && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={isResending}
                className="mt-2"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isResending ? "Sending..." : "Resend to email"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
