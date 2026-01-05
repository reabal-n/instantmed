'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Pill, X, ChevronRight, AlertCircle, Plus } from 'lucide-react'
import { Spinner } from '@/components/ui/unified-skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface MedicationSelection {
  medicationId: string | null
  name: string
  brandName?: string
  form?: string
  strength?: string
  isManualEntry: boolean
}

interface MedicationResult {
  id: string
  name: string
  brand_names: string[]
  category: string
  category_label: string
  schedule: string | null
  forms: Array<{ form: string; strengths: string[] }>
  default_form: string | null
  default_strength: string | null
  is_common: boolean
  rank: number
}

interface MedicationSearchProps {
  value: MedicationSelection | null
  onChange: (selection: MedicationSelection | null) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

// ============================================
// COMPONENT
// ============================================

export function MedicationSearch({
  value,
  onChange,
  placeholder = 'Search for a medication...',
  error,
  disabled = false,
  className,
}: MedicationSearchProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // State
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MedicationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [showStrengthPicker, setShowStrengthPicker] = useState<MedicationResult | null>(null)

  // Debounced search
  const searchMedications = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([])
        return
      }

      setIsSearching(true)

      try {
        const { data, error } = await supabase.rpc('search_medications', {
          search_query: searchQuery,
          limit_results: 8,
        })

        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Search error:', error)
          }
          setResults([])
        } else {
          setResults((data as MedicationResult[]) || [])
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Search error:', err)
        }
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [supabase]
  )

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        searchMedications(query)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchMedications])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setShowStrengthPicker(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < results.length ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex === results.length) {
          // Manual entry
          handleManualEntry()
        } else if (results[highlightedIndex]) {
          handleSelectMedication(results[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setShowStrengthPicker(null)
        break
    }
  }

  // Select medication
  const handleSelectMedication = (med: MedicationResult) => {
    // If medication has multiple forms/strengths, show picker
    if (med.forms && med.forms.length > 0) {
      const allStrengths = med.forms.flatMap((f) => f.strengths)
      if (allStrengths.length > 1) {
        setShowStrengthPicker(med)
        return
      }
    }

    // Direct selection with defaults
    onChange({
      medicationId: med.id,
      name: med.name,
      brandName: med.brand_names?.[0],
      form: med.default_form || undefined,
      strength: med.default_strength || undefined,
      isManualEntry: false,
    })

    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  // Select specific form/strength
  const handleSelectStrength = (med: MedicationResult, form: string, strength: string) => {
    onChange({
      medicationId: med.id,
      name: med.name,
      brandName: med.brand_names?.[0],
      form,
      strength,
      isManualEntry: false,
    })

    setQuery('')
    setIsOpen(false)
    setResults([])
    setShowStrengthPicker(null)
  }

  // Manual entry
  const handleManualEntry = () => {
    if (query.trim()) {
      onChange({
        medicationId: null,
        name: query.trim(),
        isManualEntry: true,
      })
      setQuery('')
      setIsOpen(false)
      setResults([])
    }
  }

  // Clear selection
  const handleClear = () => {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  // Render selected value
  if (value) {
    return (
      <div className={cn('relative', className)}>
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{value.name}</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {value.brandName && <span>{value.brandName}</span>}
              {value.form && value.strength && (
                <span>
                  {value.form} • {value.strength}
                </span>
              )}
              {value.isManualEntry && (
                <Badge variant="secondary" className="text-xs">
                  Manual entry
                </Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-lg hover:bg-emerald-100 transition-colors"
            disabled={disabled}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'h-14 pl-12 pr-12 text-base rounded-xl border-2',
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-slate-200 focus:border-emerald-500'
          )}
        />
        {isSearching && (
          <Spinner size="sm" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (query.length >= 2 || results.length > 0) && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
          >
            {/* Strength picker */}
            {showStrengthPicker ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setShowStrengthPicker(null)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    ← Back
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    Select form & strength
                  </span>
                </div>

                <div className="space-y-3">
                  {showStrengthPicker.forms.map((formGroup) => (
                    <div key={formGroup.form}>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        {formGroup.form}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formGroup.strengths.map((strength) => (
                          <button
                            key={`${formGroup.form}-${strength}`}
                            type="button"
                            onClick={() =>
                              handleSelectStrength(
                                showStrengthPicker,
                                formGroup.form,
                                strength
                              )
                            }
                            className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                          >
                            {strength}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Results list */}
                {results.length > 0 && (
                  <div className="max-h-80 overflow-y-auto">
                    {results.map((med, index) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => handleSelectMedication(med)}
                        className={cn(
                          'w-full flex items-center gap-3 p-4 text-left transition-colors',
                          highlightedIndex === index
                            ? 'bg-emerald-50'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                            med.is_common ? 'bg-emerald-100' : 'bg-slate-100'
                          )}
                        >
                          <Pill
                            className={cn(
                              'w-5 h-5',
                              med.is_common ? 'text-emerald-600' : 'text-slate-500'
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {med.name}
                            </span>
                            {med.schedule && (
                              <Badge variant="secondary" className="text-xs">
                                {med.schedule}
                              </Badge>
                            )}
                          </div>
                          {med.brand_names.length > 0 && (
                            <p className="text-sm text-slate-500 truncate">
                              {med.brand_names.slice(0, 3).join(', ')}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            {med.category_label}
                            {med.default_form && med.default_strength && (
                              <> • {med.default_form} {med.default_strength}</>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {query.length >= 2 && results.length === 0 && !isSearching && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-slate-500 mb-3">
                      No medications found for &quot;{query}&quot;
                    </p>
                  </div>
                )}

                {/* Manual entry option */}
                {query.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleManualEntry}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 text-left border-t border-slate-100 transition-colors',
                      highlightedIndex === results.length
                        ? 'bg-slate-50'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-slate-700">
                        Can&apos;t find it? Add &quot;{query}&quot; manually
                      </span>
                      <p className="text-sm text-slate-500">
                        The doctor will verify the medication name
                      </p>
                    </div>
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
