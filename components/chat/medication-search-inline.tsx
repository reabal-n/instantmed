"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Pill, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PBSProduct {
  pbs_code: string
  drug_name: string
  form: string
  strength: string
  manufacturer?: string
}

interface MedicationSearchInlineProps {
  onSelect: (medication: PBSProduct) => void
  placeholder?: string
}

export function MedicationSearchInline({ 
  onSelect, 
  placeholder = "Start typing medication name..." 
}: MedicationSearchInlineProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PBSProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/medications?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.products || [])
          setIsOpen(true)
        }
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])
  
  const handleSelect = (med: PBSProduct) => {
    onSelect(med)
    setQuery("")
    setResults([])
    setIsOpen(false)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-2"
    >
      <p className="text-xs text-muted-foreground">
        Search to help locate your medication (reference only)
      </p>
      
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-8"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        
        <AnimatePresence>
          {isOpen && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
            >
              {results.slice(0, 5).map((med, idx) => (
                <button
                  key={`${med.pbs_code}-${idx}`}
                  onClick={() => handleSelect(med)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                    "flex items-start gap-2 border-b border-border last:border-0"
                  )}
                >
                  <Pill className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{med.drug_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {med.strength} {med.form}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg p-3 text-center"
          >
            <p className="text-sm text-muted-foreground">
              No matches found. You can type the name manually.
            </p>
          </motion.div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Doctor will review and confirm the prescription
      </p>
    </motion.div>
  )
}

/**
 * Detect if the AI is asking for medication information
 */
export function isMedicationQuestion(content: string): boolean {
  const patterns = [
    /what medication/i,
    /which medication/i,
    /medication.*refill/i,
    /medication.*name/i,
    /medication.*need/i,
    /what.*prescription/i,
    /which.*prescription/i,
  ]
  return patterns.some(p => p.test(content))
}
