"use client"

import { AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

interface IdentityIncompleteBannerProps {
  missingFields?: string[]
}

export function IdentityIncompleteBanner({
  missingFields = ["Provider Number", "AHPRA Registration Number"],
}: IdentityIncompleteBannerProps) {
  return (
    <div className="bg-warning-light border border-warning-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-warning">
            Complete your certificate identity
          </h3>
          <p className="text-sm text-warning mt-1">
            You must provide your{" "}
            {missingFields.length > 0
              ? missingFields.join(" and ")
              : "Provider Number and AHPRA Registration Number"}{" "}
            before you can approve medical certificates.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-warning-border text-warning hover:bg-warning-light"
            asChild
          >
            <Link href="/doctor/settings/identity">
              Complete Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
