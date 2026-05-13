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

export function isStaffNavItemActive({
  pathname,
  href,
  currentStatus,
  statusFilteredDashboard,
}: {
  pathname: string | null
  href: string
  currentStatus: string | null
  statusFilteredDashboard?: boolean
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

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`)
}
