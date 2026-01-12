"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Check, AlertCircle } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface SmartSymptomInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minLength?: number
  maxLength?: number
  context?: "med_cert" | "repeat_rx" | "consult"
  isCarer?: boolean
  className?: string
  required?: boolean
  helperText?: string
}

interface Suggestion {
  text: string
  category: string
}

// Common symptom suggestions by category
const SYMPTOM_SUGGESTIONS: Record<string, Suggestion[]> = {
  respiratory: [
    { text: "runny nose and congestion", category: "Cold/Flu" },
    { text: "sore throat with difficulty swallowing", category: "Cold/Flu" },
    { text: "persistent dry cough", category: "Cold/Flu" },
    { text: "productive cough with phlegm", category: "Cold/Flu" },
    { text: "mild shortness of breath with exertion", category: "Respiratory" },
  ],
  gastrointestinal: [
    { text: "nausea and loss of appetite", category: "Gastro" },
    { text: "stomach cramps and diarrhea", category: "Gastro" },
    { text: "vomiting since yesterday", category: "Gastro" },
    { text: "acid reflux and heartburn", category: "Gastro" },
  ],
  general: [
    { text: "fever and chills", category: "General" },
    { text: "body aches and fatigue", category: "General" },
    { text: "headache and general malaise", category: "General" },
    { text: "feeling unwell and tired", category: "General" },
    { text: "dizziness and lightheadedness", category: "General" },
  ],
  musculoskeletal: [
    { text: "lower back pain limiting movement", category: "Pain" },
    { text: "neck pain and stiffness", category: "Pain" },
    { text: "muscle strain from physical activity", category: "Pain" },
    { text: "joint pain and swelling", category: "Pain" },
  ],
  mental: [
    { text: "feeling overwhelmed and anxious", category: "Mental Health" },
    { text: "stress affecting sleep and concentration", category: "Mental Health" },
    { text: "low mood and lack of motivation", category: "Mental Health" },
  ],
  other: [
    { text: "migraine with sensitivity to light", category: "Other" },
    { text: "ear pain and reduced hearing", category: "Other" },
    { text: "eye irritation and redness", category: "Other" },
    { text: "skin rash and itching", category: "Other" },
  ],
}

// Get all suggestions flattened
const ALL_SUGGESTIONS = Object.values(SYMPTOM_SUGGESTIONS).flat()

export function SmartSymptomInput({
  value,
  onChange,
  label = "Describe your symptoms",
  placeholder = "Start typing to see suggestions...",
  minLength = 10,
  maxLength = 500,
  context = "med_cert",
  isCarer = false,
  className,
  required = true,
  helperText,
}: SmartSymptomInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debouncedValue = useDebounce(value, 300)

  const isValid = value.length >= minLength
  const charCount = value.length
  const charsNeeded = minLength - charCount

  // Filter local suggestions based on input
  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const query = value.toLowerCase()
    const filtered = ALL_SUGGESTIONS.filter(
      (s) =>
        s.text.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    ).slice(0, 5)

    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0 && value.length < 30)
  }, [value])

  // Fetch AI suggestions when user has typed enough
  const fetchAISuggestions = useCallback(async () => {
    if (debouncedValue.length < 5 || debouncedValue.length > 50) {
      setAiSuggestions([])
      return
    }

    setIsLoadingAI(true)
    try {
      const response = await fetch("/api/ai/symptom-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: debouncedValue,
          context,
          isCarer,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiSuggestions(data.suggestions || [])
      }
    } catch {
      // Silently fail - AI suggestions are optional
    } finally {
      setIsLoadingAI(false)
    }
  }, [debouncedValue, context, isCarer])

  useEffect(() => {
    fetchAISuggestions()
  }, [fetchAISuggestions])

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  // Handle AI suggestion click - append to existing
  const handleAISuggestionClick = (suggestion: string) => {
    const newValue = value.trim()
      ? `${value.trim()}. ${suggestion}`
      : suggestion
    onChange(newValue.slice(0, maxLength))
    setAiSuggestions([])
    textareaRef.current?.focus()
  }

  // Dynamic label based on context
  const getContextLabel = () => {
    if (label !== "Describe your symptoms") return label
    
    switch (context) {
      case "med_cert":
        return isCarer
          ? "What symptoms are they experiencing?"
          : "What symptoms are you experiencing?"
      case "repeat_rx":
        return "Why do you need this medication renewed?"
      case "consult":
        return "What would you like to discuss with the doctor?"
      default:
        return label
    }
  }

  // Dynamic placeholder based on context
  const getContextPlaceholder = () => {
    if (placeholder !== "Start typing to see suggestions...") return placeholder
    
    switch (context) {
      case "med_cert":
        return isCarer
          ? "e.g., They have had a fever and sore throat since yesterday..."
          : "e.g., I've had a fever and sore throat since yesterday..."
      case "repeat_rx":
        return "e.g., I've been taking this medication for 2 years for blood pressure..."
      case "consult":
        return "e.g., I'd like to discuss my ongoing fatigue and sleep issues..."
      default:
        return placeholder
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="symptom-input" className="text-sm font-medium">
          {getContextLabel()}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {isLoadingAI && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Getting suggestions...</span>
          </div>
        )}
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          id="symptom-input"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={getContextPlaceholder()}
          className={cn(
            "min-h-[120px] resize-none rounded-xl transition-all duration-200",
            "bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg",
            "border-slate-200/60 dark:border-slate-700/40",
            "focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.1)]",
            !isValid && value.length > 0 && "border-amber-400/50",
            isValid && "border-green-400/50"
          )}
          onFocus={() => value.length >= 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />

        {/* Local suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
            >
              <div className="p-2 text-xs text-muted-foreground border-b">
                Quick suggestions
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(s.text)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                >
                  <span>{s.text}</span>
                  <Badge variant="secondary" className="text-xs">
                    {s.category}
                  </Badge>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI suggestions chips */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Add more detail:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAISuggestionClick(s)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all duration-200",
                    "bg-primary/10 text-primary hover:bg-primary/20",
                    "border border-primary/20 hover:border-primary/40"
                  )}
                >
                  + {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character count and validation */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {!isValid && charCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="w-3 h-3" />
              <span>{charsNeeded} more character{charsNeeded !== 1 ? "s" : ""} needed</span>
            </div>
          ) : isValid ? (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-3 h-3" />
              <span>Good description</span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {helperText || "Minimum 10 characters required"}
            </span>
          )}
        </div>
        <span className={cn(
          "text-muted-foreground",
          charCount >= maxLength - 50 && "text-amber-600",
          charCount >= maxLength && "text-destructive"
        )}>
          {charCount}/{maxLength}
        </span>
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        This information helps the doctor understand your situation and will be used in your {context === "med_cert" ? "medical certificate" : context === "repeat_rx" ? "prescription request" : "consultation notes"}.
      </p>
    </div>
  )
}

// Export validation helper
export function isSymptomInputValid(value: string, minLength = 10): boolean {
  return value.trim().length >= minLength
}
