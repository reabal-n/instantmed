import { describe, it, expect } from "vitest"
import { mapServiceParam, SUPPORTED_SERVICE_SLUGS } from "@/lib/request/step-registry"

/**
 * Unit tests for mapServiceParam function
 * 
 * Tests the URL service parameter mapping for the service hub:
 * - Returns null for no param (show hub)
 * - Returns null for invalid params (show error)
 * - Returns correct service type for valid params
 */

describe("mapServiceParam", () => {
  describe("hub trigger (no param)", () => {
    it("returns null when no param provided", () => {
      expect(mapServiceParam(undefined)).toBeNull()
    })

    it("returns null for empty string", () => {
      // Empty string should be treated as no param
      expect(mapServiceParam("")).toBeNull()
    })
  })

  describe("invalid params", () => {
    it("returns null for unknown service", () => {
      expect(mapServiceParam("invalid-service")).toBeNull()
    })

    it("returns null for random string", () => {
      expect(mapServiceParam("xyz123")).toBeNull()
    })

    it("returns null for partial matches", () => {
      expect(mapServiceParam("med")).toBeNull()
      expect(mapServiceParam("cert")).toBeNull()
      expect(mapServiceParam("script")).toBeNull()
    })
  })

  describe("medical certificate mappings", () => {
    it("maps 'med-cert' to med-cert", () => {
      expect(mapServiceParam("med-cert")).toBe("med-cert")
    })

    it("maps 'medcert' to med-cert", () => {
      expect(mapServiceParam("medcert")).toBe("med-cert")
    })

    it("maps 'medical-certificate' to med-cert", () => {
      expect(mapServiceParam("medical-certificate")).toBe("med-cert")
    })

    it("is case-insensitive", () => {
      expect(mapServiceParam("MED-CERT")).toBe("med-cert")
      expect(mapServiceParam("Med-Cert")).toBe("med-cert")
      expect(mapServiceParam("MEDCERT")).toBe("med-cert")
    })
  })

  describe("prescription mappings", () => {
    it("maps 'prescription' to prescription", () => {
      expect(mapServiceParam("prescription")).toBe("prescription")
    })

    it("maps 'repeat-script' to repeat-script", () => {
      expect(mapServiceParam("repeat-script")).toBe("repeat-script")
    })

    it("maps 'repeat-rx' to repeat-script", () => {
      expect(mapServiceParam("repeat-rx")).toBe("repeat-script")
    })

    it("is case-insensitive", () => {
      expect(mapServiceParam("PRESCRIPTION")).toBe("prescription")
      expect(mapServiceParam("Repeat-Script")).toBe("repeat-script")
    })
  })

  describe("consultation mappings", () => {
    it("maps 'consult' to consult", () => {
      expect(mapServiceParam("consult")).toBe("consult")
    })

    it("maps 'consultation' to consult", () => {
      expect(mapServiceParam("consultation")).toBe("consult")
    })

    it("is case-insensitive", () => {
      expect(mapServiceParam("CONSULT")).toBe("consult")
      expect(mapServiceParam("Consultation")).toBe("consult")
    })
  })

  describe("SUPPORTED_SERVICE_SLUGS", () => {
    it("includes all expected slugs", () => {
      expect(SUPPORTED_SERVICE_SLUGS).toContain("med-cert")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("medcert")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("medical-certificate")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("prescription")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("repeat-script")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("repeat-rx")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("consult")
      expect(SUPPORTED_SERVICE_SLUGS).toContain("consultation")
    })

    it("all supported slugs map to valid service types", () => {
      for (const slug of SUPPORTED_SERVICE_SLUGS) {
        const result = mapServiceParam(slug)
        expect(result).not.toBeNull()
        expect(["med-cert", "prescription", "repeat-script", "consult"]).toContain(result)
      }
    })
  })
})
