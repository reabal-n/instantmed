export function getStaffNavHrefPath(href: string): string {
  return href.split(/[?#]/)[0] || "/"
}

export function getStaffNavHrefStatus(href: string): string | null {
  const query = href.split("?")[1]?.split("#")[0]
  if (!query) return null
  return new URLSearchParams(query).get("status")
}

export function hasStatusFilteredDashboardItems(hrefs: string[]): boolean {
  return hrefs.some(
    (href) => getStaffNavHrefPath(href) === "/dashboard" && getStaffNavHrefStatus(href),
  )
}

const NAV_PATH_ALIASES: Record<string, string[]> = {
  "/admin/patients": ["/doctor/patients"],
}

function getEquivalentPaths(href: string): string[] {
  const hrefPath = getStaffNavHrefPath(href)
  return [hrefPath, ...(NAV_PATH_ALIASES[hrefPath] ?? [])]
}

function matchesPath(pathname: string, href: string): boolean {
  return getEquivalentPaths(href).some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function hasMoreSpecificPathMatch(pathname: string, href: string, allHrefs: readonly string[]): boolean {
  const hrefPath = getStaffNavHrefPath(href)
  const hrefStatus = getStaffNavHrefStatus(href)

  return allHrefs.some((candidateHref) => {
    if (candidateHref === href) return false
    if (getStaffNavHrefStatus(candidateHref) !== hrefStatus) return false
    if (!matchesPath(pathname, candidateHref)) return false

    const candidatePath = getStaffNavHrefPath(candidateHref)
    return candidatePath !== hrefPath && candidatePath.startsWith(`${hrefPath}/`)
  })
}

export function isStaffNavItemActive({
  pathname,
  href,
  currentStatus,
  statusFilteredDashboard,
  allHrefs,
}: {
  pathname: string | null
  href: string
  currentStatus: string | null
  statusFilteredDashboard?: boolean
  allHrefs?: readonly string[]
}): boolean {
  if (!pathname) return false

  const hrefPath = getStaffNavHrefPath(href)
  const hrefStatus = getStaffNavHrefStatus(href)

  if (hrefStatus) {
    return pathname === hrefPath && currentStatus === hrefStatus
  }

  if (hrefPath === "/dashboard") {
    return pathname === "/dashboard" && (!statusFilteredDashboard || !currentStatus)
  }

  if (!matchesPath(pathname, href)) return false

  return !allHrefs || !hasMoreSpecificPathMatch(pathname, href, allHrefs)
}
