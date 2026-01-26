"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Tag {
  id: string
  label: string
}

interface TagsSelectorProps {
  tags: Tag[]
  value: Tag[]
  onChange: (tags: Tag[]) => void
  label?: string
  className?: string
  placeholder?: string
  maxSelections?: number
}

export function TagsSelector({
  tags,
  value,
  onChange,
  label,
  className,
  placeholder = "Select options...",
  maxSelections,
}: TagsSelectorProps) {
  const selectedContainerRef = useRef<HTMLDivElement>(null)

  const removeTag = (id: string) => {
    onChange(value.filter((tag) => tag.id !== id))
  }

  const addTag = (tag: Tag) => {
    if (maxSelections && value.length >= maxSelections) return
    onChange([...value, tag])
  }

  useEffect(() => {
    if (selectedContainerRef.current) {
      selectedContainerRef.current.scrollTo({
        left: selectedContainerRef.current.scrollWidth,
        behavior: "smooth",
      })
    }
  }, [value])

  const availableTags = tags.filter(
    (tag) => !value.some((selected) => selected.id === tag.id)
  )

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      {/* Selected tags display */}
      <motion.div
        className={cn(
          "w-full flex items-center gap-1.5 bg-background border-2 border-border rounded-xl min-h-[52px] overflow-x-auto p-1.5",
          "scrollbar-hide",
          // Scroll shadow indicators for overflow
          "mask-[linear-gradient(to_right,transparent,black_8px,black_calc(100%-8px),transparent)]",
          value.length > 0 && "mask-[linear-gradient(to_right,black,black_calc(100%-16px),transparent)]"
        )}
        ref={selectedContainerRef}
        layout
      >
        <AnimatePresence mode="popLayout">
          {value.length === 0 ? (
            <span className="text-sm text-muted-foreground px-2">{placeholder}</span>
          ) : (
            value.map((tag) => (
              <motion.div
                key={tag.id}
                className="flex items-center gap-1 pl-3 pr-1 py-1.5 bg-primary/10 border border-primary/20 rounded-lg shrink-0"
                layoutId={`tag-${tag.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <motion.span
                  layoutId={`tag-${tag.id}-label`}
                  className="text-sm font-medium text-primary"
                >
                  {tag.label}
                </motion.span>
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                >
                  <X className="size-4 text-primary" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* Available tags */}
      {availableTags.length > 0 && (
        <motion.div
          className="bg-muted/30 p-2 border border-border rounded-xl"
          layout
        >
          <motion.div className="flex flex-wrap gap-2" layout>
            {availableTags.map((tag) => (
              <motion.button
                key={tag.id}
                type="button"
                layoutId={`tag-${tag.id}`}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg shrink-0",
                  "hover:border-primary/50 hover:bg-primary/5 transition-colors",
                  "text-sm font-medium text-foreground",
                  maxSelections && value.length >= maxSelections && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => addTag(tag)}
                disabled={maxSelections ? value.length >= maxSelections : false}
              >
                <motion.span layoutId={`tag-${tag.id}-label`}>
                  {tag.label}
                </motion.span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Selection count */}
      {maxSelections && (
        <p className="text-xs text-muted-foreground">
          {value.length} of {maxSelections} selected
        </p>
      )}
    </div>
  )
}

export default TagsSelector
