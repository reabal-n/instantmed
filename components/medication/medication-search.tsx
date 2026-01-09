"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Pill, AlertCircle, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { searchMedications, type Medication } from "@/lib/data/medications"

interface MedicationSearchProps {
  value?: string
  onChange: (medication: Medication | null, customValue?: string) => void
  placeholder?: string
  className?: string
}

export function MedicationSearch({
  value = "",
  onChange,
  placeholder = "Search for a medication...",
  className,
}: MedicationSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Medication[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Search medications when query changes
  useEffect(() => {
    const performSearch = () => {
      // Don't show dropdown if query matches selected medication
      if (selectedMed && query === selectedMed.name) {
        setResults([])
        setIsOpen(false)
        return
      }
      
      if (query.length >= 2) {
        const searchResults = searchMedications(query)
        setResults(searchResults)
        setIsOpen(true)
        setHighlightedIndex(0)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }
    
    performSearch()
  }, [query, selectedMed])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (medication: Medication, event?: React.MouseEvent) => {
    // Prevent blur event from firing when clicking on dropdown item
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    setSelectedMed(medication)
    setQuery(medication.name)
    setIsOpen(false)
    setResults([]) // Clear results to prevent dropdown from showing
    onChange(medication)
  }

  const handleClear = () => {
    setQuery("")
    setSelectedMed(null)
    setResults([])
    setIsOpen(false)
    onChange(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % results.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length)
        break
      case "Enter":
        e.preventDefault()
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex], undefined)
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  // Handle custom medication entry (not in database)
  const handleBlur = () => {
    // Close dropdown on blur
    setIsOpen(false)
    
    setTimeout(() => {
      if (query && !selectedMed && results.length === 0) {
        // User entered a custom medication not in our database
        onChange(null, query)
      }
    }, 200)
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        placeholder={placeholder}
        startContent={<Search className="w-4 h-4 text-muted-foreground" />}
        endContent={
          query ? (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded-full transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : null
        }
        classNames={{
          inputWrapper: cn(
            "h-12 bg-white border border-slate-200 shadow-none",
            "hover:border-slate-300",
            "data-[focused=true]:border-primary data-[focused=true]:ring-1 data-[focused=true]:ring-primary/20"
          ),
        }}
      />

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-border rounded-xl shadow-lg max-h-96 overflow-auto">
          {results.map((med, index) => (
            <button
              key={med.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault() // Prevent input blur
                handleSelect(med, e)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 first:rounded-t-xl last:rounded-b-xl",
                highlightedIndex === index && "bg-muted/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Pill className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground">{med.name}</span>
                    {med.requiresCall && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        <Phone className="w-2.5 h-2.5 mr-1" />
                        Call needed
                      </Badge>
                    )}
                  </div>
                  
                  {med.brandNames.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Brands: {med.brandNames.slice(0, 3).join(", ")}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {med.commonUses.slice(0, 2).join(", ")}
                  </p>
                  
                  {med.strengths.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {med.strengths.slice(0, 4).join(", ")}
                      {med.strengths.length > 4 && ` +${med.strengths.length - 4} more`}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Medication not in our database</p>
              <p className="text-muted-foreground text-xs">
                Don&apos;t worry - you can still enter &quot;{query}&quot;. Our doctors will review it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Medication Display */}
      {selectedMed && (
        <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{selectedMed.name}</span>
                {selectedMed.requiresCall && (
                  <Badge variant="secondary" className="text-xs">
                    <Phone className="w-3 h-3 mr-1" />
                    Phone consult required
                  </Badge>
                )}
              </div>
              
              {selectedMed.brandNames.length > 0 && (
                <p className="text-sm text-muted-foreground mb-2">
                  Also known as: {selectedMed.brandNames.join(", ")}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {selectedMed.commonUses.map((use) => (
                  <span
                    key={use}
                    className="text-xs px-2 py-1 bg-white rounded-full border border-border"
                  >
                    {use}
                  </span>
                ))}
              </div>

              {selectedMed.notes && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {selectedMed.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
