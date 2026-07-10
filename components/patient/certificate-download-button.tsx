"use client"

import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { capture } from "@/lib/analytics/capture"
import { requestPatientCertificateDownload } from "@/lib/patient/download-certificate"
import { cn } from "@/lib/utils"

export function CertificateDownloadButton({
  href,
  intakeId,
  serviceType,
  fileName = "instantmed-certificate.pdf",
  label = "Download PDF",
  size = "lg",
  variant = "default",
  className,
}: {
  href: string
  intakeId?: string | null
  serviceType?: string | null
  fileName?: string
  label?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline"
  className?: string
}) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)

    const result = await requestPatientCertificateDownload({ href })

    if (result.status === "unauthorized") {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/sign-in?redirect=${encodeURIComponent(returnTo)}`)
      return
    }

    if (result.status === "error") {
      setError(result.message)
      setIsDownloading(false)
      return
    }

    const objectUrl = URL.createObjectURL(result.blob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

    capture("certificate_downloaded", {
      intake_id: intakeId,
      service_type: serviceType,
    })
    setIsDownloading(false)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full sm:w-auto"
      >
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {isDownloading ? "Opening securely..." : label}
      </Button>
      {error && (
        <p role="alert" className="max-w-sm text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
