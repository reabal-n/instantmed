import { describe, expect, it } from "vitest"

import {
  getServiceLifecycle,
  isActivePatientServiceType,
  isCompatibilityOnlyServiceType,
  isFuturePatientServiceType,
  SERVICE_LIFECYCLE,
  SERVICE_TYPES,
  supportsDraftGeneration,
} from "@/lib/constants/service-types"
import type { ServiceType } from "@/types/db"

const allDbServiceTypes = Object.values(SERVICE_TYPES)

describe("DB service model contract", () => {
  it("classifies every DB service type exactly once", () => {
    expect(Object.keys(SERVICE_LIFECYCLE).sort()).toEqual([...allDbServiceTypes].sort())
  })

  it("separates active, future, and compatibility-only service rows", () => {
    const activeServices: ServiceType[] = ["med_certs", "common_scripts", "mens_health", "womens_health"]
    const futureServices: ServiceType[] = ["weight_loss"]
    const compatibilityOnlyServices: ServiceType[] = ["referrals", "pathology"]

    for (const serviceType of activeServices) {
      expect(getServiceLifecycle(serviceType)).toBe("active")
      expect(isActivePatientServiceType(serviceType)).toBe(true)
      expect(isFuturePatientServiceType(serviceType)).toBe(false)
      expect(isCompatibilityOnlyServiceType(serviceType)).toBe(false)
    }

    for (const serviceType of futureServices) {
      expect(getServiceLifecycle(serviceType)).toBe("future")
      expect(isActivePatientServiceType(serviceType)).toBe(false)
      expect(isFuturePatientServiceType(serviceType)).toBe(true)
      expect(isCompatibilityOnlyServiceType(serviceType)).toBe(false)
    }

    for (const serviceType of compatibilityOnlyServices) {
      expect(getServiceLifecycle(serviceType)).toBe("compatibility_only")
      expect(isActivePatientServiceType(serviceType)).toBe(false)
      expect(isFuturePatientServiceType(serviceType)).toBe(false)
      expect(isCompatibilityOnlyServiceType(serviceType)).toBe(true)
    }
  })

  it("keeps compatibility-only rows eligible for draft generation but not acquisition", () => {
    expect(supportsDraftGeneration("referrals")).toBe(true)
    expect(supportsDraftGeneration("pathology")).toBe(true)
    expect(isCompatibilityOnlyServiceType("referrals")).toBe(true)
    expect(isCompatibilityOnlyServiceType("pathology")).toBe(true)
  })
})
