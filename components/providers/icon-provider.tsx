"use client"

import { IconContext } from "@phosphor-icons/react"

/**
 * Sets Phosphor Icons to duotone weight globally.
 * Duotone is the signature premium style — two-layer icons
 * with a filled secondary layer at reduced opacity.
 */
export function IconProvider({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={{ size: 20, weight: "duotone" }}>
      {children}
    </IconContext.Provider>
  )
}
