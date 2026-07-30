export type PatientDirectorySort = "newest" | "name"

export type PatientDirectoryOrder = {
  column: "created_at" | "full_name" | "id"
  ascending: boolean
}

export function parsePatientDirectorySort(
  value?: string | string[] | null,
): PatientDirectorySort {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate?.trim().toLowerCase() === "name" ? "name" : "newest"
}

export function buildPatientDirectoryHref({
  baseHref,
  page,
  sort,
}: {
  baseHref: string
  page: number
  sort: PatientDirectorySort
}): string {
  const params = new URLSearchParams()

  if (page > 1) params.set("page", String(page))
  params.set("sort", sort)

  return `${baseHref}?${params.toString()}`
}

export function getPatientDirectoryOrder(
  sort: PatientDirectorySort,
): readonly PatientDirectoryOrder[] {
  return sort === "name"
    ? [
        { column: "full_name", ascending: true },
        { column: "id", ascending: true },
      ]
    : [
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]
}
