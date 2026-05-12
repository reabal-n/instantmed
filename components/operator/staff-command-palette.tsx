"use client"

import { Keyboard, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { type KeyboardEvent, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Custom event name fired to open the staff command palette from anywhere
 * (sidebar `⌘K` hint, deep-links, error surfaces). Centralising avoids
 * prop-drilling and keeps the open-from-static-context contract one symbol.
 */
export const STAFF_PALETTE_OPEN_EVENT = "instantmed:staff-palette:open"

/** Programmatic open. Safe in client components only. */
export function openStaffPalette() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(STAFF_PALETTE_OPEN_EVENT))
}

export interface StaffCommandItem {
  id: string
  title: string
  detail: string
  keywords?: string
  href?: string
  onSelect?: () => void
  tone?: "critical" | "warning" | "neutral" | "success"
  label?: string
}

interface StaffCommandPaletteProps {
  items: StaffCommandItem[]
  buttonLabel?: string
  title?: string
  description?: string
  placeholder?: string
  emptyLabel?: string
  /**
   * Optional async search hook. When provided AND the query has 2+ chars,
   * results from this function REPLACE the local-filtered `items` so the
   * palette behaves as a search bar over patients / intakes / etc.
   * Debounced 120ms client-side before the fetch fires.
   */
  searchFn?: (query: string, signal: AbortSignal) => Promise<StaffCommandItem[]>
}

function CommandToneBadge({ item }: { item: StaffCommandItem }) {
  const tone = item.tone ?? "neutral"
  return (
    <Badge
      variant={
        tone === "critical"
          ? "destructive"
          : tone === "warning"
            ? "warning"
            : tone === "success"
              ? "success"
              : "outline"
      }
      className="shrink-0 text-[11px]"
    >
      {item.label ?? (tone === "neutral" ? "Open" : tone)}
    </Badge>
  )
}

export function StaffCommandPalette({
  items,
  buttonLabel = "Staff palette",
  title = "Staff palette",
  description = "Search patients, cases, scripts, and recovery paths. Use arrow keys and Enter to open.",
  placeholder = "Patient, intake, script, refund, webhook...",
  emptyLabel = "No staff action matches that search.",
  searchFn,
}: StaffCommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [remoteResults, setRemoteResults] = useState<StaffCommandItem[] | null>(null)
  const [isRemoteLoading, setIsRemoteLoading] = useState(false)

  useEffect(() => {
    function handleGlobalKeydown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    // Custom event so the sidebar (and any other static surface) can open
    // the palette without prop-drilling. Fires from `openStaffPalette()`.
    function handleOpenEvent() {
      setOpen(true)
    }

    window.addEventListener("keydown", handleGlobalKeydown)
    window.addEventListener(STAFF_PALETTE_OPEN_EVENT, handleOpenEvent)
    return () => {
      window.removeEventListener("keydown", handleGlobalKeydown)
      window.removeEventListener(STAFF_PALETTE_OPEN_EVENT, handleOpenEvent)
    }
  }, [])

  // Pre-compute each item's searchable text once when `items` changes.
  // Was rebuilding the joined-and-lowercased string per item per keystroke.
  const indexedItems = useMemo(
    () => items.map((item) => ({
      item,
      searchText: [item.title, item.detail, item.keywords].filter(Boolean).join(" ").toLowerCase(),
    })),
    [items],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    // When the remote search is wired and has results for this query, merge
    // them in front of local nav-item matches so the operator sees patients/
    // intakes first (the most likely intent) followed by navigation hits.
    const localHits = indexedItems
      .filter(({ searchText }) => searchText.includes(normalizedQuery))
      .map(({ item }) => item)
    if (remoteResults && remoteResults.length > 0) {
      const seen = new Set(remoteResults.map((r) => r.id))
      const localUnique = localHits.filter((item) => !seen.has(item.id))
      return [...remoteResults, ...localUnique]
    }
    return localHits
  }, [items, indexedItems, query, remoteResults])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Debounced remote search. Aborts in-flight requests on each keystroke.
  useEffect(() => {
    if (!searchFn) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setRemoteResults(null)
      setIsRemoteLoading(false)
      return
    }
    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setIsRemoteLoading(true)
      try {
        const results = await searchFn(trimmed, controller.signal)
        if (!controller.signal.aborted) {
          setRemoteResults(results)
          setIsRemoteLoading(false)
        }
      } catch {
        if (!controller.signal.aborted) setIsRemoteLoading(false)
      }
    }, 120)
    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [query, searchFn])

  function openCommand(item: StaffCommandItem) {
    setOpen(false)
    setQuery("")
    item.onSelect?.()
    if (item.href) router.push(item.href)
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((index) => Math.min(index + 1, filteredItems.length - 1))
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((index) => Math.max(index - 1, 0))
    }
    if (event.key === "Enter" && filteredItems[selectedIndex]) {
      event.preventDefault()
      openCommand(filteredItems[selectedIndex])
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Keyboard className="h-4 w-4" aria-hidden />
        {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div onKeyDown={handleListKeyDown}>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              startContent={<Search className="h-4 w-4" />}
              endContent={isRemoteLoading ? (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Searching…
                </span>
              ) : null}
            />
            <div className="mt-3 max-h-[360px] overflow-y-auto rounded-lg border border-border/60">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </div>
              ) : (
                filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 border-b border-border/50 px-3 py-3 text-left last:border-b-0",
                      index === selectedIndex ? "bg-muted/70" : "hover:bg-muted/40",
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => openCommand(item)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <CommandToneBadge item={item} />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
