"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MapPin, Loader2 } from "lucide-react"

export interface AddressComponents {
  streetNumber: string
  streetName: string
  suburb: string
  state: string
  postcode: string
  country: string
  fullAddress: string
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

// Google Maps types are complex - using any is acceptable here with eslint-disable
/* eslint-disable @typescript-eslint/no-explicit-any */
interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (input: HTMLInputElement, options: unknown) => {
          addListener: (event: string, callback: () => void) => void
          getPlace: () => google.maps.places.PlaceResult
        }
      }
    }
  }
  initGooglePlaces?: () => void
}

let isScriptLoaded = false
let isScriptLoading = false
const callbacks: (() => void)[] = []

function loadGooglePlacesScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as GoogleMapsWindow
    if (isScriptLoaded && win.google?.maps?.places) {
      resolve()
      return
    }

    if (isScriptLoading) {
      callbacks.push(() => resolve())
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      reject(new Error("Google Places API key not configured"))
      return
    }

    isScriptLoading = true

    win.initGooglePlaces = () => {
      isScriptLoaded = true
      isScriptLoading = false
      resolve()
      callbacks.forEach((cb) => cb())
      callbacks.length = 0
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
    script.async = true
    script.defer = true
    script.onerror = () => {
      isScriptLoading = false
      reject(new Error("Failed to load Google Places API"))
    }
    document.head.appendChild(script)
  })
}

function parseAddressComponents(place: any): AddressComponents {
  const components: AddressComponents = {
    streetNumber: "",
    streetName: "",
    suburb: "",
    state: "",
    postcode: "",
    country: "",
    fullAddress: place.formatted_address || "",
  }

  place.address_components?.forEach((component: any) => {
    const types = component.types

    if (types.includes("street_number")) {
      components.streetNumber = component.long_name
    }
    if (types.includes("route")) {
      components.streetName = component.long_name
    }
    if (types.includes("locality") || types.includes("sublocality")) {
      components.suburb = component.long_name
    }
    if (types.includes("administrative_area_level_1")) {
      components.state = component.short_name
    }
    if (types.includes("postal_code")) {
      components.postcode = component.long_name
    }
    if (types.includes("country")) {
      components.country = component.short_name
    }
  })

  return components
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
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const initAutocomplete = useCallback(() => {
    const win = window as unknown as GoogleMapsWindow
    if (!inputRef.current || !win.google?.maps?.places) return

    autocompleteRef.current = new win.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
    })

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (place?.address_components) {
        const parsed = parseAddressComponents(place)
        onChange(parsed.fullAddress)
        onAddressSelect(parsed)
      }
    })
  }, [onChange, onAddressSelect])

  useEffect(() => {
    loadGooglePlacesScript()
      .then(() => {
        setIsLoading(false)
        initAutocomplete()
      })
      .catch((err) => {
        setIsLoading(false)
        setLoadError(err.message)
      })
  }, [initAutocomplete])

  // Reinitialize if input ref changes
  useEffect(() => {
    if (!isLoading && !loadError && inputRef.current) {
      initAutocomplete()
    }
  }, [isLoading, loadError, initAutocomplete])

  if (loadError) {
    return (
      <div className="space-y-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        <p className="text-xs text-amber-600">Address autocomplete unavailable. Enter manually.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isLoading ? "Loading..." : placeholder}
          className={cn("pl-10 pr-10", className, error && "border-red-500")}
          disabled={disabled || isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
