"use client"

import { useEffect, useState } from "react"
import { MapPin, ArrowRight } from "lucide-react"
import Link from "next/link"

// Map IANA timezone to Australian state and primary city
const TIMEZONE_STATE_MAP: Record<string, { state: string; city: string; slug: string }> = {
  "Australia/Sydney": { state: "NSW", city: "Sydney", slug: "sydney" },
  "Australia/Melbourne": { state: "VIC", city: "Melbourne", slug: "melbourne" },
  "Australia/Brisbane": { state: "QLD", city: "Brisbane", slug: "brisbane" },
  "Australia/Perth": { state: "WA", city: "Perth", slug: "perth" },
  "Australia/Adelaide": { state: "SA", city: "Adelaide", slug: "adelaide" },
  "Australia/Hobart": { state: "TAS", city: "Hobart", slug: "hobart" },
  "Australia/Darwin": { state: "NT", city: "Darwin", slug: "darwin" },
  "Australia/Canberra": { state: "ACT", city: "Canberra", slug: "canberra" },
  // Fallbacks for less common timezone names
  "Australia/ACT": { state: "ACT", city: "Canberra", slug: "canberra" },
  "Australia/Currie": { state: "TAS", city: "Hobart", slug: "hobart" },
  "Australia/Lindeman": { state: "QLD", city: "Brisbane", slug: "brisbane" },
  "Australia/Lord_Howe": { state: "NSW", city: "Sydney", slug: "sydney" },
  "Australia/Broken_Hill": { state: "NSW", city: "Sydney", slug: "sydney" },
}

interface NearMeBannerProps {
  service?: string
}

export function NearMeBanner({ service = "medical certificate" }: NearMeBannerProps) {
  const [location, setLocation] = useState<{ state: string; city: string; slug: string } | null>(null)

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const match = TIMEZONE_STATE_MAP[tz]
      if (match) {
        setLocation(match)
      }
    } catch {
      // Timezone detection not supported
    }
  }, [])

  if (!location) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/5 rounded-xl text-sm">
      <MapPin className="h-4 w-4 text-primary shrink-0" />
      <span className="text-muted-foreground">
        Get a {service} near{" "}
        <Link
          href={`/locations/${location.slug}`}
          className="text-primary font-medium hover:underline"
        >
          {location.city}
        </Link>
      </span>
      <Link
        href={`/locations/${location.slug}`}
        className="text-primary hover:underline flex items-center gap-1 font-medium ml-1"
      >
        View <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
