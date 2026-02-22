"use client"

import * as React from "react"
import { HeroUIProvider } from "@heroui/react"
import { useRouter } from "next/navigation"

export interface ProvidersProps {
  children: React.ReactNode
}

export function HeroUIProviderWrapper({ children }: ProvidersProps) {
  const router = useRouter()

  return (
    <HeroUIProvider navigate={router.push}>
      {children}
    </HeroUIProvider>
  )
}
