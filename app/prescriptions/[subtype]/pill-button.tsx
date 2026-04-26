"use client"

import type React from "react"

// Pill button component - calm selection styling per brand guidelines
export function PillButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-[transform,box-shadow] duration-300 ${
        selected
          ? "bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-200 border-2 border-sky-300/60 dark:border-sky-600/40 shadow-sm shadow-sky-400/15"
          : "bg-white dark:bg-card text-foreground dark:text-muted-foreground border-2 border-border/60 dark:border-border/40 hover:border-border hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  )
}

// Multi-select pill button - calm selection styling per brand guidelines
export function MultiPillButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-[transform,box-shadow] duration-300 ${
        selected
          ? "bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-200 border-2 border-sky-300/60 dark:border-sky-600/40 shadow-sm shadow-sky-400/15"
          : "bg-white dark:bg-card text-foreground dark:text-muted-foreground border-2 border-border/60 dark:border-border/40 hover:border-border hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  )
}
