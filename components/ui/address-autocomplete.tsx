"use client"

import { AlertTriangle, CheckCircle, Loader2, MapPin } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  generateSessionToken,
  getPlaceDetails,
  type PlaceSuggestion,
  searchAddresses,
} from "@/lib/google-places/client"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { cn } from "@/lib/utils"

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
  /** True if address was selected from a verified address provider */
  isVerified?: boolean
  /** Provider place/address ID for audit trail */
  pxid?: string
  /** Provider place/address ID for audit trail */
  providerPlaceId?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressComponents) => void
  placeholder?: string
  className?: string
  error?: string
  disabled?: boolean
  id?: string
  /** If true, user MUST select from suggestions */
  requireVerified?: boolean
  /** Callback when verification status changes */
  onVerificationChange?: (isVerified: boolean) => void
  /** Called when the patient explicitly chooses to enter a manual address */
  onManualEntry?: () => void
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className,
  error,
  disabled,
  id,
  requireVerified = false,
  onVerificationChange,
  onManualEntry,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isVerified, setIsVerified] = useState(false)
  const [lastSelectedPlaceId, setLastSelectedPlaceId] = useState<string | null>(null)
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSearchRef = useRef<string>("")
  const sessionTokenRef = useRef<string>(generateSessionToken())
  const listboxIdRef = useRef(`address-suggestions-${generateSessionToken()}`)

  const debouncedValue = useDebounce(value, 300)
  const shouldSearch =
    !isManualEntry && !isLoadingDetails && !isVerified && debouncedValue.length >= 3

  // Search addresses when input changes
  const doSearch = useCallback(async (searchValue: string) => {
    if (!searchValue || searchValue.length < 3) {
      lastSearchRef.current = ""
      setSuggestions([])
      setIsOpen(false)
      setIsSearching(false)
      setLookupMessage(null)
      return
    }

    if (lastSearchRef.current === searchValue) return
    lastSearchRef.current = searchValue

    setIsSearching(true)
    setLookupMessage(null)
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

  // Handle selection from the configured address provider.
  const handleSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setIsOpen(false)
      setSuggestions([])
      onChange(suggestion.description)
      setIsLoadingDetails(true)
      setLookupMessage(null)

      // Fetch full place details (this completes the session for billing)
      const details = await getPlaceDetails(
        suggestion.place_id,
        sessionTokenRef.current
      )

      // Generate a new session token for the next autocomplete flow
      sessionTokenRef.current = generateSessionToken()
      setIsLoadingDetails(false)

      if (details) {
        setIsVerified(true)
        setIsManualEntry(false)
        setLastSelectedPlaceId(suggestion.place_id)
        onVerificationChange?.(true)
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
          providerPlaceId: suggestion.place_id,
        })
        return
      }

      setIsVerified(false)
      setIsManualEntry(true)
      setLastSelectedPlaceId(null)
      setLookupMessage("We could not confirm that address. Enter it manually below.")
      onVerificationChange?.(false)
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
            void handleSelect(suggestions[highlightedIndex])
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
      setLookupMessage(null)
      if (!newValue.trim()) {
        setIsManualEntry(false)
      }

      // If user is manually editing after selecting, invalidate verification
      if (isVerified && lastSelectedPlaceId) {
        setIsVerified(false)
        setLastSelectedPlaceId(null)
        onVerificationChange?.(false)
      }
    },
    [onChange, isVerified, lastSelectedPlaceId, onVerificationChange]
  )

  const handleManualEntry = useCallback(() => {
    setIsOpen(false)
    setHasSearched(false)
    setSuggestions([])
    setHighlightedIndex(-1)
    setIsVerified(false)
    setIsManualEntry(true)
    setLastSelectedPlaceId(null)
    setLookupMessage("Manual address entry is ready below.")
    onVerificationChange?.(false)
    onManualEntry?.()
  }, [onManualEntry, onVerificationChange])

  // Determine if we should show verification warning
  const showVerificationWarning =
    requireVerified && value.length > 0 && !isVerified && !isManualEntry && !isSearching && !isLoadingDetails
  const activeDescendant =
    highlightedIndex >= 0 && suggestions[highlightedIndex]
      ? `${listboxIdRef.current}-${suggestions[highlightedIndex].place_id}`
      : undefined

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
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
        aria-controls={listboxIdRef.current}
        aria-activedescendant={activeDescendant}
        role="combobox"
        startContent={<MapPin className="h-4 w-4 text-muted-foreground" />}
        endContent={
          isSearching || isLoadingDetails ? (
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
      {lookupMessage && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          {lookupMessage}
        </p>
      )}

      {/* Always-available manual entry escape — never strand a user on a slow
          search or an address the provider does not have. */}
      {!isVerified && !isManualEntry && (
        <button
          type="button"
          className="mt-1.5 text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          onMouseDown={(event) => {
            event.preventDefault()
            handleManualEntry()
          }}
        >
          Enter address manually
        </button>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxIdRef.current}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border/50 bg-white shadow-lg shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          {suggestions.map((suggestion, index) => (
            <li
              id={`${listboxIdRef.current}-${suggestion.place_id}`}
              key={suggestion.place_id}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                "cursor-pointer px-4 py-3 text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
              onMouseDown={(event) => {
                event.preventDefault()
                void handleSelect(suggestion)
              }}
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
        !isLoadingDetails &&
        !isManualEntry &&
        hasSearched &&
        suggestions.length === 0 &&
        value.length >= 3 &&
        !isVerified && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/50 bg-white px-4 py-3 shadow-lg shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                No verified match found.
              </p>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleManualEntry()
                }}
              >
                Use manual address
              </button>
            </div>
          </div>
        )}

      {/* Loading state during search */}
      {!isManualEntry && (isSearching || isLoadingDetails) && value.length >= 3 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/50 bg-white px-4 py-3 shadow-lg shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{isLoadingDetails ? "Confirming address..." : "Searching addresses..."}</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
