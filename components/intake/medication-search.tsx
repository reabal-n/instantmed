"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Loader2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * PBS Medication Search - Patient Recall Only
 *
 * This component helps patients recall medication names using PBS (Pharmaceutical Benefits Scheme) data.
 * It is NOT a recommendation tool, prescribing tool, or clinical decision system.
 *
 * See: docs/MEDICATION_SEARCH_POLICY.md
 * See: docs/MEDICATION_SEARCH_SPEC.md
 */

export interface PBSProduct {
  pbs_code: string
  drug_name: string
  form: string | null
  strength: string | null
  manufacturer: string | null
}

export interface SelectedPBSProduct {
  pbs_code: string
  drug_name: string
  form: string | null
  strength: string | null
}

interface MedicationSearchProps {
  value: SelectedPBSProduct | null
  onChange: (product: SelectedPBSProduct | null) => void
  disabled?: boolean
  className?: string
}

export function MedicationSearch({
  value,
  onChange,
  disabled = false,
  className,
}: MedicationSearchProps) {
  const [inputValue, setInputValue] = useState(value?.drug_name || "")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState<PBSProduct[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [announcement, setAnnouncement] = useState("")
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null)
  const [isAiAssisted, setIsAiAssisted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setInputValue(value.drug_name)
    }
  }, [value])

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOptions([])
      setIsOpen(false)
      setCorrectedQuery(null)
      setIsAiAssisted(false)
      return
    }

    setIsLoading(true)

    try {
      // Direct PBS search
      const response = await fetch(
        `/api/medications/search?q=${encodeURIComponent(query)}&limit=15`
      )
      const data = await response.json()

      if (data.error) {
        setOptions([])
        setCorrectedQuery(null)
        setIsAiAssisted(false)
      } else {
        const results = data.results || []
        setOptions(results)
        setIsOpen(results.length > 0)
        setCorrectedQuery(null)
        setIsAiAssisted(false)
        if (results.length > 0) {
          setAnnouncement(`${results.length} medication${results.length === 1 ? '' : 's'} found`)
        } else {
          setAnnouncement("No medications found")
        }
      }
    } catch {
      setOptions([])
      setCorrectedQuery(null)
      setIsAiAssisted(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (value && newValue !== value.drug_name) {
      onChange(null)
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchProducts(newValue)
    }, 350)
  }

  const handleSelect = (option: PBSProduct) => {
    if (!option.drug_name) return

    const selected: SelectedPBSProduct = {
      pbs_code: option.pbs_code,
      drug_name: option.drug_name,
      form: option.form,
      strength: option.strength,
    }
    onChange(selected)
    setInputValue(option.drug_name)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleClear = () => {
    onChange(null)
    setInputValue("")
    setOptions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Sanitize user input to prevent XSS and ensure safe storage
  const sanitizeMedicationInput = (input: string): string => {
    return input
      .trim()
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/[<>'"&]/g, "") // Remove potentially dangerous characters
      .slice(0, 100) // Limit length to 100 chars
  }

  // Allow manual entry if user types but doesn't select from dropdown
  const handleBlur = () => {
    // Small delay to allow click on dropdown option to register first
    setTimeout(() => {
      if (inputValue.trim() && !value) {
        // User typed something but didn't select - create manual entry
        const sanitizedName = sanitizeMedicationInput(inputValue)
        if (sanitizedName.length < 2) {
          setIsOpen(false)
          return // Too short after sanitization
        }
        const manualEntry: SelectedPBSProduct = {
          pbs_code: "MANUAL",
          drug_name: sanitizedName,
          form: null,
          strength: null,
        }
        onChange(manualEntry)
      }
      setIsOpen(false)
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && options.length > 0) {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          handleSelect(options[highlightedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasSelection = value !== null

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="block text-sm font-medium text-foreground/80 mb-1.5">
        Medication name (optional)
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (options.length > 0 && !value) {
              setIsOpen(true)
            }
          }}
          onBlur={handleBlur}
          placeholder="If you know the name, start typing to help us locate it."
          disabled={disabled}
          className={cn(
            "w-full h-12 pl-10 pr-10 rounded-xl border bg-background text-base",
            "placeholder:text-muted-foreground/60 placeholder:text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "transition-all duration-200",
            hasSelection && "border-green-500/50 bg-green-50/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Medication name search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="pbs-listbox"
          role="combobox"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {hasSelection && !isLoading && (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-muted rounded-full transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {isOpen && options.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-60 w-full mt-1 max-h-60 overflow-auto rounded-xl border bg-background shadow-lg"
          role="listbox"
          id="pbs-listbox"
        >
          {/* Typo correction or AI assistance indicator */}
          {(correctedQuery || isAiAssisted) && (
            <li className="px-4 py-2 bg-primary/5 border-b text-xs text-muted-foreground">
              {correctedQuery && (
                <span>Showing results for <strong className="text-primary">{correctedQuery}</strong></span>
              )}
              {isAiAssisted && !correctedQuery && (
                <span>✨ Smart search active</span>
              )}
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.pbs_code}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "px-4 py-3 cursor-pointer transition-colors",
                highlightedIndex === index && "bg-muted",
                index !== options.length - 1 && "border-b border-border/50"
              )}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <p className="text-sm font-medium">{option.drug_name}</p>
              {option.strength && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {option.strength}
                </p>
              )}
              {option.form && (
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {option.form}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen &&
        options.length === 0 &&
        inputValue.length >= 2 &&
        !isLoading && (
          <div className="absolute z-60 w-full mt-1 p-4 rounded-xl border bg-background shadow-lg">
            <p className="text-sm text-muted-foreground text-center">
              No results found
            </p>
          </div>
        )}

      <p className="mt-2 text-xs text-muted-foreground">
        This helps with record accuracy. A doctor will review everything.
      </p>

      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  )
}
