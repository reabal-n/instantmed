import { describe, expect, it } from "vitest"

import {
  buildPatientDirectoryHref,
  parsePatientDirectorySort,
} from "@/lib/data/patient-directory-sort"

describe("patient directory sort contract", () => {
  it("accepts only the global newest and name sorts with a tolerant newest fallback", () => {
    expect(parsePatientDirectorySort("name")).toBe("name")
    expect(parsePatientDirectorySort(" NAME ")).toBe("name")
    expect(parsePatientDirectorySort(["newest", "name"])).toBe("newest")
    expect(parsePatientDirectorySort("recent_request")).toBe("newest")
    expect(parsePatientDirectorySort("recent_script")).toBe("newest")
    expect(parsePatientDirectorySort("request_type")).toBe("newest")
    expect(parsePatientDirectorySort(undefined)).toBe("newest")
  })

  it("preserves search, page, and sort in directory URLs", () => {
    const href = buildPatientDirectoryHref({
      baseHref: "/admin/patients",
      page: 3,
      search: "  Ada   Lovelace  ",
      sort: "name",
    })
    const url = new URL(href, "https://instantmed.test")

    expect(url.pathname).toBe("/admin/patients")
    expect(url.searchParams.get("page")).toBe("3")
    expect(url.searchParams.get("q")).toBe("Ada Lovelace")
    expect(url.searchParams.get("sort")).toBe("name")
    expect(buildPatientDirectoryHref({
      baseHref: "/doctor/patients",
      page: 1,
      search: "",
      sort: "newest",
    })).toBe("/doctor/patients?sort=newest")
  })
})
