"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

export type ServiceId = "med-cert" | "scripts" | "consult"

interface AvailabilityState {
  maintenance_mode: boolean
  disable_med_cert: boolean
  disable_repeat_scripts: boolean
  disable_consults: boolean
}

interface ServiceAvailabilityContextValue {
  maintenanceMode: boolean
  isServiceDisabled: (serviceId: ServiceId) => boolean
  isLoading: boolean
}

const defaultState: AvailabilityState = {
  maintenance_mode: false,
  disable_med_cert: false,
  disable_repeat_scripts: false,
  disable_consults: false,
}

const ServiceAvailabilityContext = createContext<ServiceAvailabilityContextValue>({
  maintenanceMode: false,
  isServiceDisabled: () => false,
  isLoading: true,
})

export function useServiceAvailability() {
  const context = useContext(ServiceAvailabilityContext)
  if (!context) {
    throw new Error("useServiceAvailability must be used within ServiceAvailabilityProvider")
  }
  return context
}

export function ServiceAvailabilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AvailabilityState>(defaultState)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/availability")
      .then((res) => res.json())
      .then((data: AvailabilityState) => {
        setState(data)
      })
      .catch(() => {
        // Fail open — assume all services available
        setState(defaultState)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const isServiceDisabled = useCallback(
    (serviceId: ServiceId): boolean => {
      if (state.maintenance_mode) return true
      switch (serviceId) {
        case "med-cert":
          return state.disable_med_cert
        case "scripts":
          return state.disable_repeat_scripts
        case "consult":
          return state.disable_consults
        default:
          return false
      }
    },
    [state]
  )

  const value: ServiceAvailabilityContextValue = {
    maintenanceMode: state.maintenance_mode,
    isServiceDisabled,
    isLoading,
  }

  return (
    <ServiceAvailabilityContext.Provider value={value}>
      {children}
    </ServiceAvailabilityContext.Provider>
  )
}
