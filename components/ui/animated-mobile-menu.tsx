"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

// Hook to get container dimensions
const useDimensions = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })

  useEffect(() => {
    if (ref.current) {
      setDimensions({
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      })
    }
  }, [ref])

  return dimensions
}

// Sidebar background animation variants
const sidebarVariants: Variants = {
  open: (height = 1000) => ({
    clipPath: `circle(${height * 2 + 200}px at calc(100% - 44px) 44px)`,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  }),
  closed: {
    clipPath: "circle(0px at calc(100% - 44px) 44px)",
    transition: {
      delay: 0.15,
      duration: 0.3,
      ease: "easeOut",
    },
  },
}

// Navigation list animation variants
const navVariants: Variants = {
  open: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
}

// Individual menu item animation variants
const itemVariants: Variants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
    },
  },
}

// Path component for animated hamburger icon
interface PathProps {
  d?: string
  variants: Variants
  transition?: { duration: number }
  className?: string
  stroke?: string
}

const Path = ({ className, ...props }: PathProps) => (
  <motion.path
    fill="transparent"
    strokeWidth="2.5"
    strokeLinecap="round"
    className={className}
    {...props}
  />
)

// Animated hamburger toggle button
interface MenuToggleProps {
  toggle: () => void
  isOpen: boolean
}

export const MenuToggle = ({ toggle, isOpen }: MenuToggleProps) => {
  const { theme } = useTheme()
  const strokeColor = theme === "dark" ? "hsl(0, 0%, 90%)" : "hsl(0, 0%, 18%)"

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative z-50 flex items-center justify-center",
        "h-10 w-10 rounded-xl",
        "bg-transparent",
        "hover:bg-white/50 dark:hover:bg-white/10",
        "transition-colors duration-200",
        "outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      )}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      <svg width="20" height="20" viewBox="0 0 23 23">
        <Path
          variants={{
            closed: { d: "M 2 2.5 L 20 2.5" },
            open: { d: "M 3 16.5 L 17 2.5" },
          }}
          stroke={strokeColor}
        />
        <Path
          d="M 2 9.423 L 20 9.423"
          variants={{
            closed: { opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.1 }}
          stroke={strokeColor}
        />
        <Path
          variants={{
            closed: { d: "M 2 16.346 L 20 16.346" },
            open: { d: "M 3 2.5 L 17 16.346" },
          }}
          stroke={strokeColor}
        />
      </svg>
    </button>
  )
}

// Menu item colors for visual variety
const menuColors = [
  { light: "#6366f1", dark: "#818cf8" }, // Indigo
  { light: "#8b5cf6", dark: "#a78bfa" }, // Violet  
  { light: "#ec4899", dark: "#f472b6" }, // Pink
  { light: "#06b6d4", dark: "#22d3ee" }, // Cyan
  { light: "#10b981", dark: "#34d399" }, // Emerald
  { light: "#f59e0b", dark: "#fbbf24" }, // Amber
]

// Menu item component
export interface MenuItemData {
  label: string
  href: string
  icon?: React.ReactNode
  description?: string
  onClick?: () => void
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
    item.onClick?.()
    onClose()
  }

  return (
    <motion.li
      variants={itemVariants}
      whileHover={{ y: -2, x: 8 }}
      whileTap={{ scale: 0.98 }}
      className="list-none"
    >
      <Link
        href={item.href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-4 px-4 py-3.5 rounded-2xl",
          "transition-all duration-300",
          // Glass hover effect
          "hover:bg-white/70 dark:hover:bg-white/15",
          "hover:shadow-[0_4px_20px_rgb(59,130,246,0.1)]",
          "active:bg-white/90 dark:active:bg-white/25",
          "group"
        )}
      >
        {item.icon ? (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            {item.icon}
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-xl transition-colors"
            style={{ backgroundColor: `${accentColor}20`, borderColor: accentColor, borderWidth: 2 }}
          />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground block">{item.label}</span>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </div>
        <motion.div
          className="w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: accentColor }}
        />
      </Link>
    </motion.li>
  )
}

// Section header component
interface SectionHeaderProps {
  title: string
}

const SectionHeader = ({ title }: SectionHeaderProps) => (
  <motion.div
    variants={itemVariants}
    className="px-4 pt-4 pb-2"
  >
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {title}
    </span>
  </motion.div>
)

// Divider component
const MenuDivider = () => (
  <motion.div
    variants={itemVariants}
    className="my-3 mx-4 h-px bg-border/50"
  />
)

// Main animated mobile menu component
export interface AnimatedMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function AnimatedMobileMenu({
  isOpen,
  onClose,
  children,
  header,
  footer,
}: AnimatedMobileMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { height } = useDimensions(containerRef)

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <motion.nav
      initial={false}
      animate={isOpen ? "open" : "closed"}
      custom={height}
      ref={containerRef}
      className="md:hidden"
    >
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Animated background panel - Glass with glow */}
      <motion.div
        variants={sidebarVariants}
        className={cn(
          "fixed top-0 right-0 bottom-0 z-40 w-[300px]",
          // Glass surface
          "bg-white/85 dark:bg-slate-900/80",
          "backdrop-blur-2xl",
          // Border
          "border-l border-white/50 dark:border-white/15",
          // Glow shadow
          "shadow-[-20px_0_60px_rgb(59,130,246,0.15)] dark:shadow-[-20px_0_60px_rgb(139,92,246,0.2)]"
        )}
      />

      {/* Menu content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[300px] flex flex-col"
          >
            {/* Header */}
            {header && (
              <motion.div
                variants={itemVariants}
                className="p-5 border-b border-border/30"
              >
                {header}
              </motion.div>
            )}

            {/* Scrollable menu items */}
            <motion.ul
              variants={navVariants}
              className="flex-1 overflow-y-auto py-4 px-2"
            >
              {children}
            </motion.ul>

            {/* Footer */}
            {footer && (
              <motion.div
                variants={itemVariants}
                className="p-4 border-t border-border/30"
              >
                {footer}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// Export sub-components for composition
AnimatedMobileMenu.Item = MenuItem
AnimatedMobileMenu.Section = SectionHeader
AnimatedMobileMenu.Divider = MenuDivider
