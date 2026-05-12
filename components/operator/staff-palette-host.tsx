"use client"

import { useCallback, useMemo } from "react"

import {
  type StaffCommandItem,
  StaffCommandPalette,
} from "@/components/operator/staff-command-palette"
import type { StaffNavSection } from "@/lib/dashboard/staff-navigation"

interface PaletteSearchResult {
  id: string
  kind: "patient" | "intake"
  title: string
  detail: string
  href: string
  badge: string
}

interface PaletteSearchResponse {
  results?: PaletteSearchResult[]
  error?: string
}

/**
 * Server-backed fuzzy search across patients + intakes.
 * Mounted once in `OperatorShell` so every staff route shares the same
 * Cmd+K experience.
 */
async function fetchPaletteSearch(query: string, signal: AbortSignal): Promise<StaffCommandItem[]> {
  try {
    const response = await fetch(`/api/admin/palette-search?q=${encodeURIComponent(query)}`, {
      signal,
      cache: "no-store",
    })
    if (!response.ok) return []
    const payload = (await response.json()) as PaletteSearchResponse
    if (!payload.results) return []
    return payload.results.map<StaffCommandItem>((result) => ({
      id: result.id,
      title: result.title,
      detail: result.detail,
      keywords: `${result.title} ${result.detail}`,
      href: result.href,
      label: result.badge,
      tone: "neutral",
    }))
  } catch {
    return []
  }
}

interface StaffPaletteHostProps {
  navSections: StaffNavSection[]
}

/**
 * StaffPaletteHost — global command-palette mount for the staff cockpit.
 *
 * Single instance lives inside `OperatorShell`, so Cmd+K opens the palette
 * on every staff route (`/dashboard`, `/admin/*`, `/doctor/*`). Items are
 * derived from the role-aware nav (so what shows up matches the sidebar).
 *
 * Triggered three ways:
 *   1. `Cmd+K` / `Ctrl+K` global keyboard listener
 *   2. The sidebar's persistent `⌘K` hint (fires `openStaffPalette()`)
 *   3. The header search-style trigger (also fires `openStaffPalette()`)
 *
 * The visible "open palette" button rendered here is hidden — the palette
 * itself owns the global keyboard + event subscriptions. Hiding via
 * `hidden` keeps a single source of truth for behavior.
 */
export function StaffPaletteHost({ navSections }: StaffPaletteHostProps) {
  const searchFn = useCallback(
    (query: string, signal: AbortSignal) => fetchPaletteSearch(query, signal),
    [],
  )
  const items = useMemo<StaffCommandItem[]>(() => {
    const navItems: StaffCommandItem[] = navSections.flatMap((section) =>
      section.items.map((item) => ({
        id: `nav-${item.href}`,
        title: item.label,
        detail: `${section.title} · open ${item.label.toLowerCase()}`,
        keywords: `${section.title} ${item.label} navigation`,
        href: item.href,
        label: "Go",
        tone: "neutral",
      })),
    )

    // Surface a couple of in-cockpit shortcuts that aren't sidebar nav items
    // but are the most common "next action" jumps mid-shift.
    const inlineShortcuts: StaffCommandItem[] = [
      {
        id: "shortcut-review",
        title: "Resume reviewing",
        detail: "Open the clinical review queue",
        keywords: "resume review next case queue clinical",
        href: "/dashboard?status=review#doctor-queue",
        tone: "neutral",
        label: "Queue",
      },
      {
        id: "shortcut-scripts",
        title: "Open scripts",
        detail: "Scripts waiting for send confirmation",
        keywords: "scripts prescribing parchment awaiting_script",
        href: "/dashboard?status=scripts#doctor-queue",
        tone: "neutral",
        label: "Scripts",
      },
    ]

    return [...inlineShortcuts, ...navItems]
  }, [navSections])

  return (
    <div className="hidden">
      <StaffCommandPalette
        items={items}
        buttonLabel="Staff palette"
        title="Staff palette"
        placeholder="Search a patient, case reference, or jump to..."
        searchFn={searchFn}
      />
    </div>
  )
}
