"use client"

import { type ReactNode } from "react"
// framer-motion removed — module factory race condition in root layout chunk.
// The 0.15s opacity fade was imperceptible; children rendered directly.

interface PageTransitionProviderProps {
  children: ReactNode
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  return <>{children}</>
}
