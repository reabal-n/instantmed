"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

interface EmailTab {
  href: string
  label: string
  /** Custom matcher; falls back to exact path match. */
  matches?: (pathname: string) => boolean
}

const TABS: EmailTab[] = [
  {
    href: "/admin/emails",
    label: "Templates",
    matches: (p) => p === "/admin/emails" || p.startsWith("/admin/emails/edit"),
  },
  {
    href: "/admin/emails/hub",
    label: "Hub",
  },
  {
    href: "/admin/emails/analytics",
    label: "Analytics",
  },
]

/**
 * Tab strip for the /admin/emails section. Active state is derived
 * from the current pathname so the strip works for all three sub-
 * routes plus their nested editor screens (e.g. /admin/emails/edit/[id]).
 */
export function EmailTabsNav() {
  const pathname = usePathname() ?? ""

  return (
    <nav
      aria-label="Email sections"
      className="flex w-fit gap-1 rounded-lg bg-muted/50 p-1"
    >
      {TABS.map((tab) => {
        const active = tab.matches
          ? tab.matches(pathname)
          : pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color]",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
