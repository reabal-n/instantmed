"use client"

import { X } from "lucide-react"
import { useRouter } from "next/navigation"

import { ServiceSelector } from "@/components/patient"
import { REQUEST_CONSULT_HREF, REQUEST_MED_CERT_HREF, REQUEST_REPEAT_SCRIPT_HREF } from "@/lib/dashboard/routes"

export default function NewRequestModal() {
  const router = useRouter()

  const handleClose = () => {
    router.back()
  }

  const handleSelectService = (service: "medical-certificate" | "repeat-prescription" | "consultation") => {
    if (service === "medical-certificate") {
      router.push(REQUEST_MED_CERT_HREF)
    } else if (service === "repeat-prescription") {
      router.push(REQUEST_REPEAT_SCRIPT_HREF)
    } else if (service === "consultation") {
      router.push(REQUEST_CONSULT_HREF)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <ServiceSelector onSelectService={handleSelectService} />
      </div>
    </div>
  )
}
