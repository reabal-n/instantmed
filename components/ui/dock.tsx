"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import Link from "next/link"

interface DockItem {
  icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
  active?: boolean
  badge?: number
}

interface DockProps {
  className?: string
  items: DockItem[]
  position?: "bottom" | "top"
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
  active?: boolean
  badge?: number
  className?: string
}

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-1, 1, -1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, href, onClick, active, badge, className }, ref) => {
    const content = (
      <>
        <Icon className={cn(
          "w-5 h-5 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        <span className={cn(
          "absolute -top-10 left-1/2 -translate-x-1/2",
          "px-2.5 py-1.5 rounded-lg text-xs font-medium",
          "bg-popover text-popover-foreground shadow-lg border border-border",
          "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100",
          "transition-all duration-200 whitespace-nowrap pointer-events-none"
        )}>
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="dock-active-indicator"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </>
    )

    const buttonClasses = cn(
      "relative group p-3 rounded-xl",
      "transition-all duration-200",
      active 
        ? "bg-primary/10" 
        : "hover:bg-muted",
      className
    )

    if (href) {
      return (
        <Link href={href} className={buttonClasses}>
          {content}
        </Link>
      )
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.1, y: -3 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={buttonClasses}
      >
        {content}
      </motion.button>
    )
  }
)
DockIconButton.displayName = "DockIconButton"

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className, position = "bottom" }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-50 px-4",
          position === "bottom" ? "bottom-6" : "top-6",
          className
        )}
      >
        <motion.div
          initial="initial"
          animate="animate"
          variants={floatingAnimation}
          className={cn(
            "flex items-center gap-1 p-2 rounded-2xl",
            "backdrop-blur-xl border shadow-lg",
            "bg-background/80 border-border/50",
            "hover:shadow-xl transition-shadow duration-300"
          )}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
              <DockIconButton {...item} />
              {index < items.length - 1 && items[index + 1]?.label === "divider" && (
                <div className="w-px h-6 bg-border mx-1" />
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock, type DockItem, type DockProps }
