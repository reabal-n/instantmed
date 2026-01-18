"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Loader2, AlertTriangle, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// AMT-backed medication option from NCTS FHIR
export interface MedicationOption {
  code: string // AMT SNOMED CT code
  display: string // Full display name from AMT
  medicationName: string
  strength: string
  form: string
}

export interface SelectedMedication {
  amt_code: string // AMT SNOMED CT code
  display: string // Full AMT display string
  medication_name: string
  strength: string
  form: string
}

interface MedicationComboboxProps {
  value: SelectedMedication | null
  onChange: (medication: SelectedMedication | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

export function MedicationCombobox({
  value,
  onChange,
  placeholder = "Search for your medication...",
  disabled = false,
  error,
  className,
}: MedicationComboboxProps) {
  const [inputValue, setInputValue] = useState(value?.display || "")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState<MedicationOption[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Sync input value with selected value
  useEffect(() => {
    if (value) {
      setInputValue(value.display)
    }
  }, [value])

  // Search medications
  const searchMedications = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOptions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setSearchError(null)
    setIsBlocked(false)

    try {
      // Use AMT terminology endpoint
      const response = await fetch(`/api/terminology/amt/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.blocked) {
        setIsBlocked(true)
        setOptions([])
        setSearchError(data.message)
      } else if (data.serviceUnavailable) {
        // Graceful handling of NCTS outage/slowness
        setSearchError(data.message || "Medication search temporarily unavailable. Please try again.")
        setOptions([])
      } else if (data.error) {
        setSearchError(data.error)
        setOptions([])
      } else {
        setOptions(data.results || [])
        setIsOpen((data.results || []).length > 0)
      }
    } catch {
      setSearchError("Connection error. Please check your internet and try again.")
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Clear selection if user edits after selecting
    if (value && newValue !== value.display) {
      onChange(null)
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      searchMedications(newValue)
    }, 200)
  }

  // Handle selection
  const handleSelect = (option: MedicationOption) => {
    const selected: SelectedMedication = {
      amt_code: option.code,
      display: option.display,
      medication_name: option.medicationName,
      strength: option.strength,
      form: option.form,
    }
    onChange(selected)
    setInputValue(option.display)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  // Clear selection
  const handleClear = () => {
    onChange(null)
    setInputValue("")
    setOptions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Keyboard navigation
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasValidSelection = value !== null
  const showError = error || (inputValue.length > 0 && !hasValidSelection && !isLoading && !isOpen)

  return (
    <div className={cn("relative", className)}>
      {/* Input */}
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
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-12 pl-10 pr-10 rounded-xl border bg-background text-base",
            "focus:outline-none focus:border-primary",
            "transition-all duration-200",
            hasValidSelection && "border-green-500 bg-green-50/50",
            showError && !hasValidSelection && "border-amber-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Search medications"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="medication-listbox"
          role="combobox"
        />
        
        {/* Right side icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {hasValidSelection && !isLoading && (
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

      {/* Dropdown - z-[60] to be above sticky footer */}
      {isOpen && options.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-60 w-full mt-1 max-h-60 overflow-auto rounded-xl border bg-background shadow-lg"
          role="listbox"
          id="medication-listbox"
        >
          {options.map((option, index) => (
            <li
              key={option.code}
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
              <p className="text-sm font-medium">{option.display}</p>
              <p className="text-xs text-muted-foreground">
                {option.medicationName} {option.strength && `• ${option.strength}`} {option.form && `• ${option.form}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {isOpen && options.length === 0 && inputValue.length >= 2 && !isLoading && !isBlocked && (
        <div className="absolute z-60 w-full mt-1 p-4 rounded-xl border bg-background shadow-lg">
          <p className="text-sm text-muted-foreground text-center">
            No medications found for &ldquo;{inputValue}&rdquo;
          </p>
        </div>
      )}

      {/* Blocked substance warning */}
      {isBlocked && (
        <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-800 font-medium">Controlled Substance</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Schedule 8 and controlled substances cannot be prescribed through this service. 
              Please see your regular GP.
            </p>
          </div>
        </div>
      )}

      {/* Validation error */}
      {showError && !isBlocked && (
        <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error || "Please select a medication from the list"}
        </p>
      )}

      {/* Search error */}
      {searchError && !isBlocked && (
        <p className="mt-1.5 text-xs text-destructive">{searchError}</p>
      )}

      {/* Disclaimer */}
      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Repeat scripts only.</strong> If you need a new prescription, 
          please book a{" "}
          <Link href="/consult" className="text-primary underline hover:no-underline">
            General Consult ($49.95)
          </Link>
          . We do not provide S8 medicines (opioids, benzodiazepines, stimulants).
        </p>
      </div>
    </div>
  )
}
