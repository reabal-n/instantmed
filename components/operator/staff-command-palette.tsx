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
}: StaffCommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    function handleGlobalKeydown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown)
    return () => window.removeEventListener("keydown", handleGlobalKeydown)
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((item) =>
      [item.title, item.detail, item.keywords].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery),
    )
  }, [items, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

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
