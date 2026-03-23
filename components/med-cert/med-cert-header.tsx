"use client"

import Link from "next/link"
import { ArrowLeft, X, FileText } from "lucide-react"
import { ProgressIndicator } from "@/components/med-cert/med-cert-shared"
import type { MedCertStep } from "@/types/med-cert"

interface MedCertHeaderProps {
  currentStep: MedCertStep
  onBack: () => void
}

export function MedCertHeader({ currentStep, onBack }: MedCertHeaderProps) {
  if (currentStep === "confirmation") return null

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          {currentStep !== "safety" && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 flex items-center justify-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Medical Certificate</span>
          </div>
          <Link href="/" className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </Link>
        </div>
        <ProgressIndicator currentStep={currentStep} />
      </div>
    </header>
  )
}
