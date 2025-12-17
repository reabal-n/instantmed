"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  FileText, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  Command,
  ArrowRight,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  type: "request" | "patient"
  title: string
  subtitle: string
  status?: string
  href: string
}

interface GlobalSearchProps {
  variant?: "doctor" | "patient" | "admin"
}

export function GlobalSearch({ variant = "doctor" }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&variant=${variant}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [variant])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      router.push(results[selectedIndex].href)
      setOpen(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-3 h-3 text-emerald-500" />
      case "declined":
        return <XCircle className="w-3 h-3 text-red-500" />
      case "pending":
        return <Clock className="w-3 h-3 text-amber-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    
    const colors: Record<string, string> = {
      approved: "bg-emerald-100 text-emerald-700",
      declined: "bg-red-100 text-red-700",
      pending: "bg-amber-100 text-amber-700",
      needs_follow_up: "bg-blue-100 text-blue-700",
    }

    return (
      <Badge className={cn("text-xs border-0", colors[status] || "bg-muted text-muted-foreground")}>
        {status.replace("_", " ")}
      </Badge>
    )
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 hover:bg-white/80 border border-white/40 text-muted-foreground text-sm transition-all"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground" />
            )}
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search requests, patients..."
              className="flex-1 border-0 focus-visible:ring-0 px-0 text-base"
            />
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {query && results.length === 0 && !isLoading && (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No results found for &quot;{query}&quot;</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      router.push(result.href)
                      setOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      selectedIndex === index ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      result.type === "request" ? "bg-primary/10" : "bg-blue-500/10"
                    )}>
                      {result.type === "request" ? (
                        <FileText className="w-5 h-5 text-primary" />
                      ) : (
                        <User className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{result.title}</span>
                        {getStatusIcon(result.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">Start typing to search...</p>
                <p className="text-xs mt-2">
                  Use <kbd className="px-1 py-0.5 rounded bg-muted text-xs">↑</kbd>{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-xs">↓</kbd> to navigate,{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Enter</kbd> to select
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
