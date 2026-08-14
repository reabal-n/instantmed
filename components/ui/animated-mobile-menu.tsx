"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import * as React from "react"
import { useEffect, useRef } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function getVisibleDrawerControls(root: HTMLElement | null) {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR)).filter(
    (element) => {
      if (element.closest("[hidden],[inert],[aria-hidden='true']")) return false
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.01 &&
        rect.width > 0 &&
        rect.height > 0
      )
    },
  )
}

const menuColors = [
  { light: "#2563EB", dark: "#60A5FA" },
  { light: "#0891B2", dark: "#22D3EE" },
  { light: "#059669", dark: "#34D399" },
  { light: "#3B82F6", dark: "#93C5FD" },
  { light: "#0D9488", dark: "#5EEAD4" },
  { light: "#D97706", dark: "#FBBF24" },
]

export interface MenuItemData {
  label: string
  href: string
  icon?: React.ReactNode
  description?: string
  onClick?: () => void
  disabled?: boolean
  prefetch?: boolean
}

interface MenuItemProps {
  item: MenuItemData
  index: number
  onClose: () => void
}

const MenuItem = ({ item, index, onClose }: MenuItemProps) => {
  const { theme } = useTheme()
  const colorIndex = index % menuColors.length
  const accentColor = theme === "dark" ? menuColors[colorIndex].dark : menuColors[colorIndex].light

  const handleClick = () => {
    if (item.disabled) return
    item.onClick?.()
    onClose()
  }

  const content = (
    <>
      {item.icon ? (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {item.icon}
        </div>
      ) : (
        <div
          className="h-10 w-10 rounded-xl border-2 transition-colors"
          style={{ backgroundColor: `${accentColor}20`, borderColor: accentColor }}
        />
      )}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-medium",
            item.disabled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {item.label}
        </span>
        {item.description && (
          <span className="text-xs text-muted-foreground">{item.description}</span>
        )}
      </div>
      {!item.disabled && (
        <div
          className="h-2 w-2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: accentColor }}
        />
      )}
    </>
  )

  return (
    <li
      tabIndex={-1}
      className="list-none transition-transform duration-160 motion-reduce:transition-none md:hover:translate-x-1 md:hover:-translate-y-px active:scale-[0.98]"
    >
      {item.disabled ? (
        <div className="flex cursor-not-allowed items-center gap-4 rounded-2xl px-4 py-3.5 opacity-60">
          {content}
        </div>
      ) : (
        <Link
          href={item.href}
          prefetch={item.prefetch}
          onClick={handleClick}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className={cn(
            "group flex items-center gap-4 rounded-2xl px-4 py-3.5",
            "transition-[background-color,box-shadow] duration-200",
            "hover:bg-card/70 hover:shadow-md hover:shadow-primary/10 dark:hover:bg-white/15",
            "active:bg-muted dark:active:bg-white/25",
          )}
        >
          {content}
        </Link>
      )}
    </li>
  )
}

const SectionHeader = ({ title }: { title: string }) => (
  <div className="px-4 pb-2 pt-4">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </span>
  </div>
)

const MenuDivider = () => <div className="mx-4 my-3 h-px bg-border/50" />

export interface AnimatedMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Dependency-light mobile drawer. Transform and opacity transitions stay on
 * the compositor; focus containment and scroll locking remain explicit.
 */
export function AnimatedMobileMenu({
  isOpen,
  onClose,
  children,
  header,
  footer,
}: AnimatedMobileMenuProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isHydrated, setIsHydrated] = React.useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => setIsHydrated(true), [])

  useEffect(() => {
    const wasOpen = wasOpenRef.current

    if (isOpen && !wasOpen) {
      const opener = document.activeElement
      returnFocusRef.current = opener instanceof HTMLElement ? opener : null
      const focusFrame = requestAnimationFrame(() => {
        const firstNavigationLink = contentRef.current?.querySelector<HTMLElement>("ul a[href]")
        const firstControl = firstNavigationLink ?? getVisibleDrawerControls(contentRef.current)[0]
        firstControl?.focus({ preventScroll: true })
      })
      wasOpenRef.current = true
      return () => cancelAnimationFrame(focusFrame)
    }

    if (!isOpen && wasOpen) {
      returnFocusRef.current?.focus({ preventScroll: true })
    }

    wasOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleDrawerKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab") return
      const contentControls = getVisibleDrawerControls(contentRef.current)
      const opener = returnFocusRef.current
      const controls = opener?.isConnected ? [opener, ...contentControls] : contentControls
      if (controls.length === 0) return

      const active = document.activeElement
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      } else if (!(active instanceof HTMLElement) || !controls.includes(active)) {
        event.preventDefault()
        const fallbackControl = event.shiftKey ? last : contentControls[0] ?? first
        fallbackControl.focus({ preventScroll: true })
      }
    }

    document.addEventListener("keydown", handleDrawerKeyboard)
    return () => document.removeEventListener("keydown", handleDrawerKeyboard)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <nav
      data-mobile-menu-hydrated={isHydrated ? "true" : "false"}
      data-mobile-menu-motion={prefersReducedMotion ? "static" : "animated"}
      aria-label="Mobile navigation"
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      className="md:hidden"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-[opacity,visibility] dark:bg-black/40",
          "motion-reduce:!transition-none",
          isOpen
            ? "visible opacity-100 [transition-duration:200ms,0ms]"
            : "invisible opacity-0 [transition-duration:160ms,0ms] [transition-delay:0ms,160ms]",
        )}
      />

      <div
        data-mobile-menu-panel="true"
        aria-hidden="true"
        className={cn(
          "fixed bottom-0 right-0 top-0 z-40 w-full max-w-[300px]",
          "border-l border-border/50 bg-card/85 shadow-[-20px_0_60px_rgb(59,130,246,0.12)] backdrop-blur-2xl",
          "transition-[transform,visibility] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:!transition-none",
          "dark:border-white/15 dark:bg-white/10 dark:shadow-[-20px_0_60px_rgb(93,184,201,0.15)]",
          isOpen
            ? "visible translate-x-0 [transition-duration:220ms,0ms]"
            : "invisible translate-x-full [transition-duration:160ms,0ms] [transition-delay:0ms,160ms]",
        )}
      />

      <div
        id="mobile-navigation-menu"
        data-mobile-menu-content="true"
        ref={contentRef}
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[300px] flex-col",
          "transition-[transform,opacity,visibility] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:!transition-none",
          isOpen
            ? "visible translate-x-0 opacity-100 [transition-duration:220ms,180ms,0ms]"
            : "invisible translate-x-full opacity-0 [transition-duration:160ms,120ms,0ms] [transition-delay:0ms,0ms,160ms]",
        )}
      >
        {header && <div className="border-b border-border/30 p-5">{header}</div>}

        <ul className="flex-1 overflow-y-auto px-2 py-4">{children}</ul>

        {footer && <div className="border-t border-border/30 p-4">{footer}</div>}
      </div>
    </nav>
  )
}

AnimatedMobileMenu.Item = MenuItem
AnimatedMobileMenu.Section = SectionHeader
AnimatedMobileMenu.Divider = MenuDivider
