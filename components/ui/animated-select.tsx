"use client"

import * as React from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Custom hook for click outside detection
function useClickAway(
  ref: React.RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler])
}

// Types
export interface SelectOption {
  id: string
  label: string
  icon?: React.ElementType
  color?: string
  description?: string
}

export interface AnimatedSelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
  showDividerAfterFirst?: boolean
}

// Icon wrapper with animation
const IconWrapper = ({
  icon: Icon,
  isHovered,
  color,
}: {
  icon?: React.ElementType
  isHovered: boolean
  color?: string
}) => {
  if (!Icon) return null

  return (
    <motion.div
      className="w-5 h-5 mr-2.5 relative flex items-center justify-center"
      initial={false}
      animate={isHovered ? { scale: 1.15 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Icon
        className="w-5 h-5"
        style={isHovered && color ? { color } : undefined}
      />
    </motion.div>
  )
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

export function AnimatedSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  error,
  className,
  showDividerAfterFirst = false,
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [hoveredOption, setHoveredOption] = React.useState<string | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const selectedValue = value !== undefined ? value : internalValue
  const selectedOption = options.find((opt) => opt.id === selectedValue)

  useClickAway(dropdownRef, () => setIsOpen(false))

  const handleSelect = (optionId: string) => {
    if (value === undefined) {
      setInternalValue(optionId)
    }
    onChange?.(optionId)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "Enter" && !isOpen) {
      setIsOpen(true)
    }
  }

  // Calculate hover highlight position
  const getHoverIndex = () => {
    const activeId = hoveredOption || selectedValue
    let index = options.findIndex((c) => activeId === c.id)
    if (index === -1) index = 0
    return index
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("w-full relative", className)} ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-4 h-12 rounded-xl text-sm font-medium",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            // Light mode
            "bg-white border border-border/60",
            "text-foreground",
            "hover:bg-muted/50 hover:border-border",
            "focus:ring-primary/20 focus:ring-offset-background focus:border-primary/50",
            // Dark mode
            "dark:bg-zinc-900/80 dark:border-white/10",
            "dark:text-zinc-100",
            "dark:hover:bg-zinc-800/80 dark:hover:border-white/20",
            "dark:focus:ring-white/10 dark:focus:ring-offset-zinc-950",
            // States
            isOpen && "bg-muted/50 border-primary/50 dark:bg-zinc-800/80 dark:border-white/20",
            error && "border-destructive/50 focus:ring-destructive/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="flex items-center truncate">
            {selectedOption ? (
              <>
                <IconWrapper
                  icon={selectedOption.icon}
                  isHovered={false}
                  color={selectedOption.color}
                />
                <span>{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-5 h-5 ml-2"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                height: "auto",
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                },
              }}
              exit={{
                opacity: 0,
                y: -4,
                height: 0,
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                },
              }}
              className="absolute left-0 right-0 top-full mt-2 z-50"
            >
              <motion.div
                className={cn(
                  "w-full rounded-xl p-1.5 shadow-lg overflow-hidden",
                  // Light mode
                  "bg-white/95 backdrop-blur-xl border border-border/60",
                  "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
                  // Dark mode
                  "dark:bg-zinc-900/95 dark:border-white/10",
                  "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                )}
                initial={{ borderRadius: 12 }}
                animate={{
                  borderRadius: 16,
                  transition: { duration: 0.2 },
                }}
                style={{ transformOrigin: "top" }}
              >
                <motion.div
                  className="relative"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  role="listbox"
                >
                  {/* Hover highlight background */}
                  {options.length > 0 && (
                    <motion.div
                      layoutId="select-hover-highlight"
                      className={cn(
                        "absolute inset-x-1.5 rounded-lg pointer-events-none",
                        "bg-black/5 dark:bg-white/10"
                      )}
                      animate={{
                        y:
                          getHoverIndex() * 44 +
                          (showDividerAfterFirst && getHoverIndex() > 0 ? 12 : 0),
                        height: 44,
                        opacity: hoveredOption || selectedValue ? 1 : 0,
                      }}
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: 0.4,
                      }}
                    />
                  )}

                  {options.map((option, index) => (
                    <React.Fragment key={option.id}>
                      {showDividerAfterFirst && index === 1 && (
                        <motion.div
                          className="mx-3 my-2 border-t border-border/50 dark:border-white/10"
                          variants={itemVariants}
                        />
                      )}
                      <motion.button
                        type="button"
                        onClick={() => handleSelect(option.id)}
                        onMouseEnter={() => setHoveredOption(option.id)}
                        onMouseLeave={() => setHoveredOption(null)}
                        className={cn(
                          "relative flex w-full items-center px-3 py-2.5 text-sm rounded-lg",
                          "transition-colors duration-150",
                          "focus:outline-none",
                          selectedValue === option.id || hoveredOption === option.id
                            ? "text-foreground dark:text-zinc-100"
                            : "text-muted-foreground"
                        )}
                        whileTap={{ scale: 0.98 }}
                        variants={itemVariants}
                        role="option"
                        aria-selected={selectedValue === option.id}
                      >
                        <IconWrapper
                          icon={option.icon}
                          isHovered={hoveredOption === option.id}
                          color={option.color}
                        />
                        <div className="flex-1 text-left">
                          <span className="font-medium">{option.label}</span>
                          {option.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {option.description}
                            </p>
                          )}
                        </div>
                        {selectedValue === option.id && (
                          <Check className="w-4 h-4 text-primary ml-2" />
                        )}
                      </motion.button>
                    </React.Fragment>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>
    </MotionConfig>
  )
}

export default AnimatedSelect
