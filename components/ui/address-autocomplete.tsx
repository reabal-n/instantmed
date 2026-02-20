"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MapPin, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import {
  searchAddresses,
  getPlaceDetails,
  generateSessionToken,
  type PlaceSuggestion,
} from "@/lib/google-places/client"
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
  /** True if address was selected from Google Places */
  isVerified?: boolean
  /** Google Place ID for audit trail */
  pxid?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressComponents) => void
  placeholder?: string
  className?: string
  error?: string
  disabled?: boolean
  /** If true, user MUST select from suggestions */
  requireVerified?: boolean
  /** Callback when verification status changes */
  onVerificationChange?: (isVerified: boolean) => void
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className,
  error,
  disabled,
  requireVerified = false,
  onVerificationChange,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isVerified, setIsVerified] = useState(false)
  const [lastSelectedPlaceId, setLastSelectedPlaceId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSearchRef = useRef<string>("")
  const sessionTokenRef = useRef<string>(generateSessionToken())

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
    const results = await searchAddresses(searchValue, {
      sessionToken: sessionTokenRef.current,
    })

    // Only update if this is still the current search
    if (lastSearchRef.current === searchValue) {
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setHighlightedIndex(-1)
      setIsSearching(false)
    }
  }, [])

  // Track whether a search has been attempted (for "no results" UI)
  const [hasSearched, setHasSearched] = useState(false)

  // Trigger search when debounced value changes
  useEffect(() => {
    const searchValue = shouldSearch ? debouncedValue : ""
    if (!searchValue) {
      setHasSearched(false)
    }
    void (async () => {
      await doSearch(searchValue)
      if (searchValue) {
        setHasSearched(true)
      }
    })()
  }, [debouncedValue, shouldSearch, doSearch])

  // Handle selection from Google Places
  const handleSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setIsOpen(false)
      setSuggestions([])
      onChange(suggestion.description)

      // Mark as verified since user selected from Google Places
      setIsVerified(true)
      setLastSelectedPlaceId(suggestion.place_id)
      onVerificationChange?.(true)

      // Fetch full place details (this completes the session for billing)
      const details = await getPlaceDetails(
        suggestion.place_id,
        sessionTokenRef.current
      )

      // Generate a new session token for the next autocomplete flow
      sessionTokenRef.current = generateSessionToken()

      if (details) {
        onAddressSelect({
          streetNumber: "",
          streetName: "",
          suburb: details.suburb,
          state: details.state,
          postcode: details.postcode,
          country: "AU",
          fullAddress: details.fullAddress,
          addressLine1: details.addressLine1,
          addressLine2: details.addressLine2,
          isVerified: true,
          pxid: suggestion.place_id,
        })
      }
    },
    [onChange, onAddressSelect, onVerificationChange]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
          setHasSearched(false)
          break
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelect]
  )

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setHasSearched(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle manual typing - invalidates verification
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onChange(newValue)

      // If user is manually editing after selecting, invalidate verification
      if (isVerified && lastSelectedPlaceId) {
        setIsVerified(false)
        setLastSelectedPlaceId(null)
        onVerificationChange?.(false)
      }
    },
    [onChange, isVerified, lastSelectedPlaceId, onVerificationChange]
  )

  // Determine if we should show verification warning
  const showVerificationWarning =
    requireVerified && value.length > 0 && !isVerified && !isSearching

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          className,
          error && "border-red-500",
          isVerified && "border-green-500/50",
          showVerificationWarning && "border-amber-500/50"
        )}
        disabled={disabled}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
        startContent={<MapPin className="h-4 w-4 text-muted-foreground" />}
        endContent={
          isSearching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : isVerified ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : showVerificationWarning ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : null
        }
      />

      {/* Verification hint */}
      {showVerificationWarning && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Please select an address from the suggestions
        </p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-white/10 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.place_id}
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
                <div>
                  <span className="font-medium">{suggestion.main_text}</span>
                  {suggestion.secondary_text && (
                    <span className="text-muted-foreground">
                      {" "}
                      {suggestion.secondary_text}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results state */}
      {!isOpen &&
        !isSearching &&
        hasSearched &&
        suggestions.length === 0 &&
        value.length >= 3 &&
        !isVerified && (
          <div className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-white/10 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl shadow-lg px-4 py-3">
            <p className="text-sm text-muted-foreground text-center">
              No addresses found. Try a different search.
            </p>
          </div>
        )}

      {/* Loading state during search */}
      {isSearching && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-white/10 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl shadow-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching addresses...</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
