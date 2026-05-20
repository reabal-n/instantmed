"use client"

import { useEffect, useState } from "react"

import type { Density } from "./types"

const STORAGE_KEY = "cockpit_density"
const VALID: readonly Density[] = ["compact", "comfortable", "spacious"]

function isDensity(value: unknown): value is Density {
  return typeof value === "string" && (VALID as readonly string[]).includes(value)
}

/**
 * localStorage-persisted density preference. SSR-safe: returns "comfortable"
 * on the server and rehydrates from storage on mount.
 */
export function useDensity(): [Density, (next: Density) => void] {
  const [density, setDensity] = useState<Density>("comfortable")

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (isDensity(stored)) setDensity(stored)
    } catch {
      // private browsing / disabled storage: keep default
    }
  }, [])

  const update = (next: Density) => {
    setDensity(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore quota / private mode errors
    }
  }

  return [density, update]
}
