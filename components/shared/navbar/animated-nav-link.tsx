"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export interface AnimatedNavLinkProps {
  href: string
  children: React.ReactNode
  icon?: React.ReactNode
  isActive?: boolean
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function AnimatedNavLink({ href, children, icon, isActive, onClick }: AnimatedNavLinkProps) {
  return (
    <div className="relative">
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative z-10",
          isActive
            ? "text-foreground bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {icon}
        {children}
      </Link>
      {isActive && (
        <div className="absolute inset-0 rounded-lg bg-primary/10 -z-10">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
            <div className="absolute w-8 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-1" />
          </div>
        </div>
      )}
    </div>
  )
}
