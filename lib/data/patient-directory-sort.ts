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
  search,
  sort,
}: {
  baseHref: string
  page: number
  search: string
  sort: PatientDirectorySort
}): string {
  const params = new URLSearchParams()
  const normalizedSearch = search.replace(/\s+/g, " ").trim()

  if (page > 1) params.set("page", String(page))
  if (normalizedSearch) params.set("q", normalizedSearch)
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

export function createPatientDirectoryNavigationCoordinator({
  initialSort,
  navigate,
  searchDelayMs = 350,
}: {
  initialSort: PatientDirectorySort
  navigate: (href: string) => void
  searchDelayMs?: number
}) {
  let currentSort = initialSort
  let pendingSearch: ReturnType<typeof setTimeout> | null = null

  const cancelPendingSearch = () => {
    if (pendingSearch === null) return
    clearTimeout(pendingSearch)
    pendingSearch = null
  }

  return {
    cancelPendingSearch,
    setSort(sort: PatientDirectorySort) {
      currentSort = sort
    },
    scheduleSearch({
      baseHref,
      search,
    }: {
      baseHref: string
      search: string
    }) {
      cancelPendingSearch()
      pendingSearch = setTimeout(() => {
        pendingSearch = null
        navigate(buildPatientDirectoryHref({
          baseHref,
          page: 1,
          search,
          sort: currentSort,
        }))
      }, searchDelayMs)
    },
    changeSort({
      baseHref,
      search,
      sort,
    }: {
      baseHref: string
      search: string
      sort: PatientDirectorySort
    }) {
      currentSort = sort
      cancelPendingSearch()
      navigate(buildPatientDirectoryHref({
        baseHref,
        page: 1,
        search,
        sort,
      }))
    },
  }
}
