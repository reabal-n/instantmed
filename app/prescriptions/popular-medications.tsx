"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getPopularMedications, CATEGORY_LABELS, CATEGORY_ICONS, type Medication } from "@/lib/data/medications"

// Helper function to get medication price
function getMedicationPrice(med: Medication): number {
  return med.requiresCall ? 49 : 39
}

export function PopularMedications() {
  const popular = getPopularMedications().slice(0, 12)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {popular.map((med) => (
        <Link
          key={med.id}
          href={`/prescriptions/med/${med.id}`}
          className="group p-4 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">{CATEGORY_ICONS[med.category]}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{med.name}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {med.brandNames.length > 0 ? med.brandNames[0] : med.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{CATEGORY_LABELS[med.category]}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="font-semibold text-sm">${getMedicationPrice(med)}</span>
            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Request
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
