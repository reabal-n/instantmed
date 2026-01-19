"use client"

import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartDateSuggestionsProps {
  onSelect: (date: string) => void
  context?: 'certificate' | 'general'
}

export function SmartDateSuggestions({ onSelect, context = 'certificate' }: SmartDateSuggestionsProps) {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  const suggestions = generateSuggestions(today, dayOfWeek, context)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mt-2"
    >
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs",
            "bg-primary/10 hover:bg-primary/20 text-primary",
            "border border-primary/20 transition-colors"
          )}
        >
          <Calendar className="w-3 h-3" />
          <span>{suggestion.label}</span>
        </button>
      ))}
    </motion.div>
  )
}

interface DateSuggestion {
  label: string
  value: string
}

function generateSuggestions(today: Date, dayOfWeek: number, context: string): DateSuggestion[] {
  const suggestions: DateSuggestion[] = []
  
  // Always suggest today
  suggestions.push({
    label: 'Today',
    value: 'today'
  })
  
  // Tomorrow
  suggestions.push({
    label: 'Tomorrow',
    value: 'tomorrow'
  })
  
  // Context-aware suggestions
  if (context === 'certificate') {
    // If it's Monday morning, suggest "weekend" (backdated)
    if (dayOfWeek === 1) {
      const saturday = new Date(today)
      saturday.setDate(today.getDate() - 2)
      suggestions.push({
        label: 'Saturday',
        value: formatDate(saturday)
      })
    }
    
    // If it's early in the week, suggest "start of week"
    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek - 1))
      if (monday.getTime() < today.getTime()) {
        suggestions.push({
          label: 'Monday',
          value: formatDate(monday)
        })
      }
    }
    
    // Yesterday (common for backdating)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (!suggestions.some(s => s.value === formatDate(yesterday))) {
      suggestions.push({
        label: 'Yesterday',
        value: formatDate(yesterday)
      })
    }
  }
  
  return suggestions.slice(0, 4) // Max 4 suggestions
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Duration suggestions based on context
export function SmartDurationSuggestions({ 
  onSelect, 
  startDate: _startDate 
}: { 
  onSelect: (duration: string) => void
  startDate?: string 
}) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  
  const suggestions: Array<{ label: string; value: string; popular?: boolean }> = [
    { label: '1 day', value: '1', popular: true },
    { label: '2 days', value: '2', popular: true },
    { label: '3 days', value: '3' },
  ]
  
  // If it's Thursday/Friday, suggest covering the weekend
  if (dayOfWeek === 4 || dayOfWeek === 5) {
    const daysToMonday = dayOfWeek === 4 ? 4 : 3
    suggestions.push({
      label: `Until Monday (${daysToMonday} days)`,
      value: String(daysToMonday),
      popular: true
    })
  }
  
  // Add 4+ option with note
  suggestions.push({
    label: '4+ days',
    value: '4+',
  })
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mt-2"
    >
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs",
            suggestion.popular 
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-foreground",
            "border border-transparent transition-colors"
          )}
        >
          <span>{suggestion.label}</span>
        </button>
      ))}
    </motion.div>
  )
}
