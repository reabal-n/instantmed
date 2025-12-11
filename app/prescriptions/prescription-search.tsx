"use client"

import type React from "react"

import { useState, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Pill, ArrowRight, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchMedications, type Medication, CATEGORY_LABELS } from "@/lib/data/medications"

export function PrescriptionSearch() {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Compute results directly from query using useMemo (no effect needed)
  const results = useMemo(() => {
    if (query.length >= 2) {
      return searchMedications(query)
    }
    return []
  }, [query])

  // Reset selected index when results change
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(0)
    if (newQuery.length >= 2) {
      const found = searchMedications(newQuery)
      setIsOpen(found.length > 0)
    } else {
      setIsOpen(false)
    }
  }, [])

  const handleSelect = (med: Medication) => {
    router.push(`/prescriptions/med/${med.slug}`)
    setIsOpen(false)
    setQuery("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a medication (e.g., Lipitor, blood pressure, UTI)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          className="pl-12 pr-10 h-14 text-base rounded-2xl border-2 focus:border-primary"
        />
        {query && (
          <button
            onClick={() => {
              handleQueryChange("")
              inputRef.current?.focus()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-lg overflow-hidden z-50">
          {results.map((med, i) => (
            <button
              key={med.slug}
              onClick={() => handleSelect(med)}
              className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors ${
                i === selectedIndex ? "bg-muted" : ""
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Pill className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{med.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {med.brandNames[0]} • {CATEGORY_LABELS[med.category]}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">${med.price}</div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </div>
            </button>
          ))}

          {/* Generic search option */}
          <button
            onClick={() => router.push(`/prescriptions/request?search=${encodeURIComponent(query)}`)}
            className="w-full flex items-center gap-3 p-3 text-left border-t hover:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Can't find it? Request "{query}"</div>
              <div className="text-xs text-muted-foreground">We'll help you find the right medication</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}
