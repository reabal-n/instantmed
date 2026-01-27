"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// Backwards-compatible Select that accepts both shadcn/ui and HeroUI APIs
interface SelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  // HeroUI compatibility
  selectedKeys?: string[] | Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  // Additional props that HeroUI Select accepts
  placeholder?: string
  className?: string
  classNames?: Record<string, string>
}

function Select({ 
  selectedKeys, 
  onSelectionChange, 
  className: _className, 
  classNames: _classNames, 
  placeholder: _placeholder, 
  ...props 
}: SelectProps) {
  // Map HeroUI API to Radix API
  let radixValue = props.value
  let radixOnValueChange = props.onValueChange

  if (selectedKeys !== undefined && radixValue === undefined) {
    const keysArray = selectedKeys instanceof Set ? Array.from(selectedKeys) : selectedKeys
    radixValue = keysArray[0]
  }

  if (onSelectionChange && !radixOnValueChange) {
    radixOnValueChange = (value: string) => {
      onSelectionChange(new Set([value]))
    }
  }

  return (
    <SelectPrimitive.Root
      {...props}
      value={radixValue}
      onValueChange={radixOnValueChange}
    />
  )
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between gap-2",
      "rounded-md px-3 py-2",
      "text-sm",
      // Clean surface
      "bg-white dark:bg-slate-900",
      "border border-border",
      "ring-offset-background",
      "transition-all duration-200",
      // Hover state
      "hover:border-slate-300 dark:hover:border-slate-600",
      // Focus state - clean ring
      "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
      "focus:border-primary",
      // Disabled
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Placeholder
      "[&>span]:line-clamp-1",
      "data-[placeholder]:text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden",
        // Clean surface
        "bg-white dark:bg-slate-900",
        "border border-border",
        "rounded-md",
        "shadow-lg",
        "text-popover-foreground",
        // Animation
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

// SelectItem with HeroUI compatibility (accepts `key` as alias for `value`)
interface SelectItemProps extends Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>, "value"> {
  value?: string
  // HeroUI uses `key` prop for item identification
  key?: string
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, value, ...props }, ref) => {
  // Use value prop, falling back to key if provided via props spread
  const itemValue = value ?? (props as { key?: string }).key ?? ""
  
  return (
    <SelectPrimitive.Item
      ref={ref}
      value={itemValue}
      className={cn(
        "relative flex w-full cursor-default select-none items-center",
        "rounded-lg py-1.5 pl-8 pr-2",
        "text-sm",
        "outline-none",
        "transition-colors duration-150",
        // Focus/hover state
        "focus:bg-primary/10 focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-white/20 dark:bg-white/10", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
