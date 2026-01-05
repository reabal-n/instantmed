"use client"

import React, { useEffect, useRef, useState } from "react"

interface ConfettiProps {
  trigger?: boolean
  options?: {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    [key: string]: any
  }
  onComplete?: () => void
}

/**
 * Confetti Component
 * 
 * Triggers confetti animation on success actions
 */
export function Confetti({
  trigger = false,
  options,
  onComplete,
}: ConfettiProps) {
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (trigger && !hasTriggered.current) {
      hasTriggered.current = true

      // Dynamically import canvas-confetti
      import("canvas-confetti").then((confetti) => {
        const defaultOptions = {
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#2563EB", "#4f46e5", "#F59E0B", "#10B981"],
          ...options,
        }

        confetti.default(defaultOptions)

        // Reset after animation completes
        setTimeout(() => {
          hasTriggered.current = false
          onComplete?.()
        }, 3000)
      })
    }
  }, [trigger, options, onComplete])

  return null
}

/**
 * ConfettiButton - Button that triggers confetti on click
 */
interface ConfettiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  options?: {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
  }
  children: React.ReactNode
}

export function ConfettiButton({
  onClick,
  options,
  children,
  className,
  disabled,
  ...props
}: ConfettiButtonProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    setShowConfetti(true)
    onClick?.(e)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </button>
      <Confetti trigger={showConfetti} options={options} onComplete={() => setShowConfetti(false)} />
    </>
  )
}
