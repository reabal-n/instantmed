"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface IdentityIncompleteBannerProps {
  missingFields?: string[]
}

export function IdentityIncompleteBanner({
  missingFields = ["Provider Number", "AHPRA Registration Number"],
}: IdentityIncompleteBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-900">
            Complete your certificate identity
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            You must provide your{" "}
            {missingFields.length > 0
              ? missingFields.join(" and ")
              : "Provider Number and AHPRA Registration Number"}{" "}
            before you can approve medical certificates.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
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
