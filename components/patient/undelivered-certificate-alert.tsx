"use client"

import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

import { buildPatientIntakeHref } from "@/lib/dashboard/routes"

interface UndeliveredCertificate {
  intakeId: string
  certificateRef: string | null
  certificateType: string | null
}

export function UndeliveredCertificateAlert({
  certificates,
}: {
  certificates: UndeliveredCertificate[]
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-warning-border bg-warning-light/50 p-4 dark:border-warning/40 dark:bg-warning/10"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {certificates.length === 1
              ? "Your certificate didn't reach your inbox."
              : `${certificates.length} certificates didn't reach your inbox.`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            We tried multiple times. Open the request page to download or resend.
          </p>
          <ul className="mt-3 space-y-1.5">
            {certificates.map((certificate) => (
              <li key={certificate.intakeId}>
                <Link
                  href={buildPatientIntakeHref(certificate.intakeId)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-warning hover:underline"
                >
                  {certificate.certificateType
                    ? `${certificate.certificateType.replaceAll("_", " ")}${certificate.certificateRef ? ` · ${certificate.certificateRef}` : ""}`
                    : (certificate.certificateRef ?? "View certificate")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
