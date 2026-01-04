"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface RippleButtonProps {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  /** Ripple color */
  rippleColor?: string
}

/**
 * Button with ripple effect on click
 */
export function RippleButton({
  children,
  onClick,
  className,
  disabled,
  type = "button",
  rippleColor = "rgba(255, 255, 255, 0.4)",
}: RippleButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate ripple size based on button dimensions
    const size = Math.max(rect.width, rect.height) * 2

    const ripple = document.createElement("span")
    ripple.className = "ripple-effect"
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background-color: ${rippleColor};
      transform: translate(-50%, -50%);
      animation: ripple-animation 0.6s ease-out forwards;
      pointer-events: none;
      --ripple-size: ${size}px;
    `

    button.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 600)

    onClick?.(e)
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden",
        className
      )}
    >
      {children}
    </button>
  )
}

/**
 * Animated checkbox with smooth check animation
 */
export function AnimatedCheckbox({
  checked,
  onChange,
  label,
  className,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <motion.div
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
            checked
              ? "bg-primary border-primary"
              : "bg-background border-border hover:border-primary/50"
          )}
          whileTap={{ scale: 0.9 }}
        >
          <motion.svg
            className="w-3 h-3 text-primary-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={checked ? "checked" : "unchecked"}
          >
            <motion.path
              d="M5 12l5 5L20 7"
              variants={{
                unchecked: { pathLength: 0, opacity: 0 },
                checked: { pathLength: 1, opacity: 1 },
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>
      </div>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  )
}

/**
 * Animated radio button
 */
export function AnimatedRadio({
  checked,
  onChange,
  label,
  name,
  value,
  className,
  disabled,
}: {
  checked: boolean
  onChange: (value: string) => void
  label?: string
  name: string
  value: string
  className?: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={() => !disabled && onChange(value)}
          disabled={disabled}
          className="sr-only"
        />
        <motion.div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
            checked
              ? "border-primary"
              : "border-border hover:border-primary/50"
          )}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            className="w-2.5 h-2.5 rounded-full bg-primary"
            initial={false}
            animate={checked ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </motion.div>
      </div>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  )
}

/**
 * Animated toggle switch
 */
export function AnimatedSwitch({
  checked,
  onChange,
  label,
  className,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  )
}

export default RippleButton
