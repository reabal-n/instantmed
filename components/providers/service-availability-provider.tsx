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
  urgent_notice_enabled: boolean
  urgent_notice_message: string
  business_hours_open: number
  business_hours_close: number
  business_hours_timezone: string
  business_hours_enabled: boolean
}

interface ServiceAvailabilityContextValue {
  maintenanceMode: boolean
  isServiceDisabled: (serviceId: ServiceId) => boolean
  isLoading: boolean
  urgentNotice: { enabled: boolean; message: string }
  businessHours: { open: number; close: number; timezone: string; enabled: boolean }
}

const defaultState: AvailabilityState = {
  maintenance_mode: false,
  disable_med_cert: false,
  disable_repeat_scripts: false,
  disable_consults: false,
  urgent_notice_enabled: false,
  urgent_notice_message: "",
  business_hours_open: 8,
  business_hours_close: 22,
  business_hours_timezone: "Australia/Sydney",
  business_hours_enabled: true,
}

const ServiceAvailabilityContext = createContext<ServiceAvailabilityContextValue>({
  maintenanceMode: false,
  isServiceDisabled: () => false,
  isLoading: true,
  urgentNotice: { enabled: false, message: "" },
  businessHours: { open: 8, close: 22, timezone: "Australia/Sydney", enabled: true },
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
    // Defer until after first paint — don't race with critical resources
    const id = requestIdleCallback
      ? requestIdleCallback(() => doFetch(), { timeout: 2000 })
      : setTimeout(() => doFetch(), 0)

    function doFetch() {
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
    }

    return () => {
      if (requestIdleCallback) cancelIdleCallback(id as number)
      else clearTimeout(id as ReturnType<typeof setTimeout>)
    }
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
    urgentNotice: {
      enabled: state.urgent_notice_enabled === true,
      message: state.urgent_notice_message || "",
    },
    businessHours: {
      open: state.business_hours_open ?? 8,
      close: state.business_hours_close ?? 22,
      timezone: state.business_hours_timezone || "Australia/Sydney",
      enabled: state.business_hours_enabled !== false,
    },
  }

  return (
    <ServiceAvailabilityContext.Provider value={value}>
      {children}
    </ServiceAvailabilityContext.Provider>
  )
}
