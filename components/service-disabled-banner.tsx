"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServiceDisabledBannerProps {
  serviceName: string
  alternativeService?: {
    name: string
    href: string
  }
}

export function ServiceDisabledBanner({
  serviceName,
  alternativeService,
}: ServiceDisabledBannerProps) {
  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 bg-orange-50 border border-orange-200 rounded-xl">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-orange-100 rounded-full">
          <AlertTriangle className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-orange-900">
            {serviceName} Temporarily Unavailable
          </h2>
          <p className="text-orange-700 mt-2">
            We&apos;re currently unable to accept new {serviceName.toLowerCase()} requests.
            Please check back later or try one of our other services.
          </p>
        </div>
        {alternativeService && (
          <Button asChild className="mt-2">
            <Link href={alternativeService.href}>
              Try {alternativeService.name} Instead
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
