"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export interface AnimatedNavLinkProps {
  href: string
  children: React.ReactNode
  icon?: React.ReactNode
  isActive?: boolean
  prefetch?: boolean
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function AnimatedNavLink({ href, children, icon, isActive, prefetch, onClick }: AnimatedNavLinkProps) {
  return (
    <div className="relative">
      <Link
        href={href}
        prefetch={prefetch}
        onClick={onClick}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 min-h-11 px-3 py-2 text-base font-medium rounded-lg transition-colors relative z-10",
          isActive
            ? "text-foreground underline underline-offset-8 decoration-primary/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {icon}
        {children}
      </Link>

    </div>
  )
}
