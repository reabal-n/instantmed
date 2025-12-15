import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex h-10 w-full min-w-0 rounded-lg px-3 py-2",
        "text-base md:text-sm",
        "placeholder:text-muted-foreground",
        // Glassy background
        "bg-background/50 backdrop-blur-sm",
        "dark:bg-surface/50",
        // Border
        "border border-border",
        "dark:border-border/50",
        // Shadow
        "shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(0,0,0,0.02)]",
        "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(0,0,0,0.1)]",
        // Transitions
        "transition-all duration-200 ease-out",
        // Hover
        "hover:border-border-strong",
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.02)]",
        "dark:hover:border-border",
        "dark:hover:bg-surface-elevated/50",
        // Focus glow (accessible)
        "outline-none",
        "focus-visible:border-primary",
        "focus-visible:ring-2 focus-visible:ring-primary/20",
        "focus-visible:shadow-[0_0_0_4px_var(--primary)/0.1,0_2px_4px_rgba(0,0,0,0.06)]",
        "dark:focus-visible:ring-primary/30",
        "dark:focus-visible:shadow-[0_0_0_4px_var(--primary)/0.15,0_2px_4px_rgba(0,0,0,0.2)]",
        // Error state
        "aria-invalid:border-destructive",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "aria-invalid:shadow-[0_0_0_4px_var(--destructive)/0.1]",
        "dark:aria-invalid:ring-destructive/30",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "disabled:bg-muted disabled:border-muted",
        // Selection
        "selection:bg-primary selection:text-primary-foreground",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "file:inline-flex file:h-7 file:cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

export { Input }
