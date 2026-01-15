"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MapPin, Loader2 } from "lucide-react"
import { searchAddresses, getAddressMetadata, type AddressFinderSuggestion } from "@/lib/addressfinder/client"
import { useDebounce } from "@/hooks/use-debounce"

export interface AddressComponents {
  streetNumber: string
  streetName: string
  suburb: string
  state: string
  postcode: string
  country: string
  fullAddress: string
  addressLine1?: string
  addressLine2?: string | null
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressComponents) => void
  placeholder?: string
  className?: string
  error?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className,
  error,
  disabled,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressFinderSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSearchRef = useRef<string>("")
  
  const debouncedValue = useDebounce(value, 300)
  const shouldSearch = debouncedValue && debouncedValue.length >= 3

  // Search addresses when input changes
  const doSearch = useCallback(async (searchValue: string) => {
    if (!searchValue || searchValue.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      setIsSearching(false)
      return
    }
    
    if (lastSearchRef.current === searchValue) return
    lastSearchRef.current = searchValue
    
    setIsSearching(true)
    const results = await searchAddresses(searchValue)
    
    // Only update if this is still the current search
    if (lastSearchRef.current === searchValue) {
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setHighlightedIndex(-1)
      setIsSearching(false)
    }
  }, [])

  // Trigger search when debounced value changes
  useEffect(() => {
    const searchValue = shouldSearch ? debouncedValue : ""
    // Wrap in IIFE to satisfy lint rule about async effects
    void (async () => {
      await doSearch(searchValue)
    })()
  }, [debouncedValue, shouldSearch, doSearch])

  // Handle selection
  const handleSelect = useCallback(async (suggestion: AddressFinderSuggestion) => {
    setIsOpen(false)
    setSuggestions([])
    onChange(suggestion.full_address)

    // Fetch full metadata
    const metadata = await getAddressMetadata(suggestion.pxid)
    if (metadata) {
      onAddressSelect({
        streetNumber: "",
        streetName: "",
        suburb: metadata.suburb,
        state: metadata.state,
        postcode: metadata.postcode,
        country: "AU",
        fullAddress: metadata.fullAddress,
        addressLine1: metadata.addressLine1,
        addressLine2: metadata.addressLine2,
      })
    }
  }, [onChange, onAddressSelect])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }, [isOpen, suggestions, highlightedIndex, handleSelect])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn("pl-10 pr-10", className, error && "border-red-500")}
          disabled={disabled}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.pxid}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                "px-4 py-3 cursor-pointer text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{suggestion.full_address}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
