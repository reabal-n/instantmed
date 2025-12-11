"use client"

import { useState } from "react"
import Link from "next/link"
import { getAllCategories, CATEGORY_LABELS, CATEGORY_ICONS, getMedicationsByCategory, type MedicationCategory } from "@/lib/data/medications"

export function CategoryFilters() {
  const [activeCategory, setActiveCategory] = useState<MedicationCategory | null>(null)
  const categories = getAllCategories()

  return (
    <div>
      {/* Category Pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-background border hover:border-primary"
            }`}
          >
            <span className="mr-1.5">{CATEGORY_ICONS[cat]}</span>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Expanded Category */}
      {activeCategory && (
        <div className="mt-6 p-4 rounded-xl bg-background border animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {CATEGORY_ICONS[activeCategory]} {CATEGORY_LABELS[activeCategory as keyof typeof CATEGORY_LABELS]}
            </h3>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {getMedicationsByCategory(activeCategory).map((med) => (
              <Link
                key={med.slug}
                href={`/prescriptions/med/${med.slug}`}
                className="p-3 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <div className="font-medium">{med.name}</div>
                <div className="text-xs text-muted-foreground">${med.price}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
