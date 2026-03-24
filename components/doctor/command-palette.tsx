"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  Search,
  FileText,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  BarChart3,
  MessageSquare,
  Keyboard,
  LogOut,
} from "@/lib/icons"
import { cn } from "@/lib/utils"

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  category: string
  shortcut?: string[]
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  /** Current queue intakes for search */
  intakes?: Array<{ id: string; patientName: string; service: string; status: string }>
}

export function CommandPalette({ isOpen, onClose, intakes = [] }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      {
        id: "queue",
        label: "Go to Queue",
        description: "View pending intakes",
        icon: <FileText className="w-4 h-4" />,
        category: "Navigation",
        action: () => { router.push("/doctor/queue"); onClose() },
      },
      {
        id: "analytics",
        label: "View Analytics",
        description: "Doctor dashboard analytics",
        icon: <BarChart3 className="w-4 h-4" />,
        category: "Navigation",
        action: () => { router.push("/doctor/analytics"); onClose() },
      },
      {
        id: "settings",
        label: "Settings",
        description: "Account and preferences",
        icon: <Settings className="w-4 h-4" />,
        category: "Navigation",
        action: () => { router.push("/doctor/settings"); onClose() },
      },
      {
        id: "shortcuts",
        label: "Keyboard Shortcuts",
        description: "View all keyboard shortcuts",
        icon: <Keyboard className="w-4 h-4" />,
        category: "Navigation",
        shortcut: ["?"],
        action: () => { onClose() },
      },
    ]

    // Add intake search results
    const intakeResults: CommandItem[] = intakes.map((intake) => ({
      id: `intake-${intake.id}`,
      label: intake.patientName,
      description: `${intake.service} — ${intake.status}`,
      icon: intake.status === "approved"
        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
        : intake.status === "declined"
        ? <XCircle className="w-4 h-4 text-red-500" />
        : <Clock className="w-4 h-4 text-blue-500" />,
      category: "Intakes",
      action: () => { router.push(`/doctor/intakes/${intake.id}`); onClose() },
    }))

    return [...nav, ...intakeResults]
  }, [intakes, router, onClose])

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    )
  }, [commands, query])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filtered])

  // Flat list for keyboard navigation
  const flatList = useMemo(() => filtered, [filtered])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      // Small delay to ensure the dialog is mounted before focusing
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= flatList.length) {
      setSelectedIndex(Math.max(0, flatList.length - 1))
    }
  }, [flatList.length, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    selected?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case "Enter":
          e.preventDefault()
          flatList[selectedIndex]?.action()
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [flatList, selectedIndex, onClose]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="fixed inset-x-0 top-[20%] z-50 mx-auto max-w-lg px-4"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands, intakes, patients..."
                  className="flex-1 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
                {flatList.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {category}
                      </div>
                      {items.map((item) => {
                        const globalIndex = flatList.indexOf(item)
                        return (
                          <button
                            key={item.id}
                            data-index={globalIndex}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors",
                              globalIndex === selectedIndex
                                ? "bg-primary/10 text-foreground"
                                : "text-foreground/80 hover:bg-muted"
                            )}
                          >
                            <span className="text-muted-foreground">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{item.label}</span>
                              {item.description && (
                                <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                              )}
                            </div>
                            {item.shortcut && (
                              <div className="flex items-center gap-0.5">
                                {item.shortcut.map((key) => (
                                  <kbd key={key} className="h-5 min-w-[20px] inline-flex items-center justify-center rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded border border-border bg-muted">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded border border-border bg-muted">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded border border-border bg-muted">esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
