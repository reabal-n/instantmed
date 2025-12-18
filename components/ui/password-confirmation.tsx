"use client"

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface PasswordConfirmationProps {
  password: string
  value: string
  onChange: (value: string) => void
  className?: string
  error?: string
}

export function PasswordConfirmation({
  password,
  value,
  onChange,
  className,
  error,
}: PasswordConfirmationProps) {
  const [shake, setShake] = useState(false)

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newValue = e.target.value
    // Shake if trying to type more than password length when already wrong
    if (
      value.length >= password.length &&
      newValue.length > value.length &&
      password !== value
    ) {
      setShake(true)
    } else {
      onChange(newValue)
    }
  }

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(timer)
    }
  }, [shake])

  const getLetterStatus = (letter: string, index: number) => {
    if (!value[index]) return ''
    return value[index] === letter
      ? 'bg-green-500/30'
      : 'bg-red-500/30'
  }

  const passwordsMatch = password === value && password.length > 0

  const bounceAnimation = {
    x: shake ? [-8, 8, -8, 8, 0] : 0,
    transition: { duration: 0.4 },
  }

  const matchAnimation = {
    scale: passwordsMatch ? [1, 1.02, 1] : 1,
    transition: { duration: 0.2 },
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Visual password indicator */}
      {password.length > 0 && value.length > 0 && (
        <motion.div
          className="h-10 w-full rounded-xl border-2 border-border bg-muted/30 px-2 py-2 overflow-hidden"
          animate={{
            ...bounceAnimation,
            borderColor: passwordsMatch ? '#10B981' : undefined,
          }}
        >
          <div className="relative h-full w-fit overflow-hidden rounded-lg">
            {/* Password dots */}
            <div className="z-10 flex h-full items-center justify-center bg-transparent px-0 py-1 tracking-[0.15em]">
              {password.split('').map((_, index) => (
                <div
                  key={index}
                  className="flex h-full w-3 shrink-0 items-center justify-center"
                >
                  <span className="size-1.5 rounded-full bg-foreground/60" />
                </div>
              ))}
            </div>
            {/* Color overlay for match/mismatch */}
            <div className="absolute bottom-0 left-0 top-0 z-0 flex h-full w-full items-center justify-start">
              {password.split('').map((letter, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "absolute h-full w-3 transition-all duration-200",
                    getLetterStatus(letter, index)
                  )}
                  style={{
                    left: `${index * 12}px`,
                    scaleX: value[index] ? 1 : 0,
                    transformOrigin: 'left',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirm password input */}
      <motion.div
        className="relative"
        animate={matchAnimation}
      >
        <motion.input
          className={cn(
            "h-12 w-full rounded-xl border-2 bg-background px-4 py-3 text-sm tracking-wider outline-none transition-colors",
            "placeholder:tracking-normal placeholder:text-muted-foreground",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            passwordsMatch && "border-green-500 focus:border-green-500",
            error && "border-red-500 focus:border-red-500"
          )}
          type="password"
          placeholder="Confirm your password"
          value={value}
          onChange={handleConfirmPasswordChange}
        />
        {passwordsMatch && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <Check className="h-5 w-5 text-green-500" />
          </motion.div>
        )}
      </motion.div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Match indicator text */}
      {value.length > 0 && !passwordsMatch && password.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length < password.length 
            ? `${password.length - value.length} more characters needed`
            : "Passwords don't match"
          }
        </p>
      )}
    </div>
  )
}

export default PasswordConfirmation
