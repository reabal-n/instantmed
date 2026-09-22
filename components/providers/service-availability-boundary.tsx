"use client"

import type { ReactNode } from "react"

import { ServiceAvailabilityProvider } from "@/components/providers/service-availability-provider"

// Keep the root server-to-client reference unique to the layout. Referencing
// the same module that marketing pages import for their hook makes Next 15
// preload the homepage entry and its dependencies on unrelated intake routes.
export function ServiceAvailabilityBoundary({ children }: { children: ReactNode }) {
  return <ServiceAvailabilityProvider>{children}</ServiceAvailabilityProvider>
}
