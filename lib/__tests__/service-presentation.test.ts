import { describe, expect, it } from "vitest"

import {
  ADMIN_SERVICE_FILTER_OPTIONS,
  getServicePresentation,
  matchesAdminServiceFilter,
} from "@/lib/services/service-presentation"

describe("service presentation", () => {
  it("normalizes current and legacy service names for admin display", () => {
    expect(getServicePresentation({ type: "med_certs" })).toMatchObject({
      label: "Medical certificate",
      shortLabel: "Med cert",
      adminFilterValue: "med_certs",
    })
    expect(getServicePresentation({ type: "medical_certificate" })).toMatchObject({
      key: "med_certs",
      adminFilterValue: "med_certs",
    })
    expect(getServicePresentation({ type: "repeat_rx" })).toMatchObject({
      label: "Repeat prescription",
      adminFilterValue: "repeat_rx",
    })
    expect(getServicePresentation({ category: "prescription" })).toMatchObject({
      key: "common_scripts",
      adminFilterValue: "repeat_rx",
    })
    expect(getServicePresentation({ type: "consults" })).toMatchObject({
      shortLabel: "Consult",
      adminFilterValue: "consults",
    })
  })

  it("keeps admin filter options compact", () => {
    expect(ADMIN_SERVICE_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "med_certs",
      "repeat_rx",
      "consults",
    ])
  })

  it("matches admin service filters through aliases", () => {
    expect(matchesAdminServiceFilter({ type: "medical_certificate" }, "med_certs")).toBe(true)
    expect(matchesAdminServiceFilter({ category: "prescription" }, "repeat_rx")).toBe(true)
    expect(matchesAdminServiceFilter({ type: "mens_health" }, "consults")).toBe(true)
    expect(matchesAdminServiceFilter({ type: "med_certs" }, "consults")).toBe(false)
    expect(matchesAdminServiceFilter({ type: "unknown" }, "all")).toBe(true)
  })
})
