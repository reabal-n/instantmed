'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Tag, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Article } from '@/lib/blog/types'
import { getSearchSuggestions } from '@/lib/blog/utils'

interface SearchAutocompleteProps {
  articles: Article[]
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

export function SearchAutocomplete({ 
  articles, 
  placeholder = "Search health guides...",
  onSearch,
  className 
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ReturnType<typeof getSearchSuggestions>>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const newSuggestions = getSearchSuggestions(articles, query, 6)
      setSuggestions(newSuggestions)
      setIsOpen(newSuggestions.length > 0)
      setSelectedIndex(-1)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [query, articles])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((suggestion: typeof suggestions[0]) => {
    if (suggestion.type === 'article' && suggestion.slug) {
      router.push(`/blog/${suggestion.slug}`)
    } else if (suggestion.type === 'tag') {
      // Search for tag
      if (onSearch) {
        onSearch(suggestion.text)
      }
      setQuery(suggestion.text)
    }
    setIsOpen(false)
  }, [router, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        } else if (onSearch) {
          onSearch(query)
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (onSearch && e.target.value.length >= 2) {
              onSearch(e.target.value)
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.type}-${suggestion.text}`}>
                <button
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors",
                    selectedIndex === index 
                      ? "bg-slate-100 dark:bg-slate-800" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  {suggestion.type === 'article' ? (
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{suggestion.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.type === 'article' ? 'Article' : 'Topic'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
