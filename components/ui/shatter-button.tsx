"use client"

import { useState, useCallback, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface ShatterButtonProps {
  children: ReactNode
  className?: string
  shardCount?: number
  shatterColor?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  asChild?: boolean
}

interface Shard {
  id: number
  x: number
  y: number
  rotation: number
  velocityX: number
  velocityY: number
  size: number
  clipPath: string
}

export function ShatterButton({
  children,
  className = "",
  shardCount = 20,
  shatterColor = "#00E2B5",
  onClick,
  disabled = false,
  type = "button",
}: ShatterButtonProps) {
  const [isShattered, setIsShattered] = useState(false)
  const [shards, setShards] = useState<Shard[]>([])

  const handleClick = useCallback(() => {
    if (isShattered || disabled) return

    const newShards: Shard[] = []
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + Math.random() * 0.5
      const velocity = 100 + Math.random() * 200
      newShards.push({
        id: i,
        x: 0,
        y: 0,
        rotation: Math.random() * 720 - 360,
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity,
        size: 4 + Math.random() * 12,
        clipPath: `polygon(${Math.random() * 50}% 0%, 100% ${Math.random() * 50}%, ${50 + Math.random() * 50}% 100%, 0% ${50 + Math.random() * 50}%)`,
      })
    }

    setShards(newShards)
    setIsShattered(true)
    onClick?.()

    setTimeout(() => {
      setIsShattered(false)
      setShards([])
    }, 1000)
  }, [isShattered, shardCount, onClick, disabled])

  return (
    <div className="relative inline-block">
      <motion.button
        type={type}
        disabled={disabled}
        className={cn(
          "relative px-6 py-3 font-semibold rounded-xl overflow-hidden text-sm",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        animate={{
          scale: isShattered ? 0 : 1,
          opacity: isShattered ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
        whileHover={disabled ? {} : { scale: 1.05 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
        style={{
          background: `linear-gradient(135deg, ${shatterColor}22 0%, ${shatterColor}44 100%)`,
          border: `1px solid ${shatterColor}66`,
          color: shatterColor,
          boxShadow: `0 0 20px ${shatterColor}33, inset 0 0 20px ${shatterColor}11`,
        }}
      >
        {/* Glowing background effect */}
        <motion.div
          className="absolute inset-0 opacity-0"
          whileHover={{ opacity: 1 }}
          style={{
            background: `radial-gradient(circle at center, ${shatterColor}33 0%, transparent 70%)`,
          }}
        />
        <span className="relative z-10">{children}</span>
      </motion.button>

      {/* Shards */}
      <AnimatePresence>
        {shards.map((shard) => (
          <motion.div
            key={shard.id}
            className="absolute pointer-events-none"
            initial={{
              x: 0,
              y: 0,
              rotate: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: shard.velocityX,
              y: shard.velocityY,
              rotate: shard.rotation,
              opacity: 0,
              scale: 0.5,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              left: "50%",
              top: "50%",
              width: shard.size,
              height: shard.size,
              background: shatterColor,
              boxShadow: `0 0 10px ${shatterColor}, 0 0 20px ${shatterColor}`,
              clipPath: shard.clipPath,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Explosion ring */}
      <AnimatePresence>
        {isShattered && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              border: `2px solid ${shatterColor}`,
              boxShadow: `0 0 30px ${shatterColor}`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Link version that wraps the button for navigation
export function ShatterButtonLink({
  children,
  href,
  className = "",
  shardCount = 20,
  shatterColor = "#00E2B5",
}: {
  children: ReactNode
  href: string
  className?: string
  shardCount?: number
  shatterColor?: string
}) {
  const [isShattered, setIsShattered] = useState(false)
  const [shards, setShards] = useState<Shard[]>([])

  const handleClick = useCallback(() => {
    if (isShattered) return

    const newShards: Shard[] = []
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + Math.random() * 0.5
      const velocity = 100 + Math.random() * 200
      newShards.push({
        id: i,
        x: 0,
        y: 0,
        rotation: Math.random() * 720 - 360,
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity,
        size: 4 + Math.random() * 12,
        clipPath: `polygon(${Math.random() * 50}% 0%, 100% ${Math.random() * 50}%, ${50 + Math.random() * 50}% 100%, 0% ${50 + Math.random() * 50}%)`,
      })
    }

    setShards(newShards)
    setIsShattered(true)

    // Navigate after animation starts
    setTimeout(() => {
      window.location.href = href
    }, 150)
  }, [isShattered, shardCount, href])

  return (
    <div className="relative inline-block">
      <motion.button
        className={cn(
          "relative px-6 py-3 font-semibold rounded-xl overflow-hidden text-sm cursor-pointer",
          className
        )}
        onClick={handleClick}
        animate={{
          scale: isShattered ? 0 : 1,
          opacity: isShattered ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: `linear-gradient(135deg, ${shatterColor}22 0%, ${shatterColor}44 100%)`,
          border: `1px solid ${shatterColor}66`,
          color: shatterColor,
          boxShadow: `0 0 20px ${shatterColor}33, inset 0 0 20px ${shatterColor}11`,
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-0"
          whileHover={{ opacity: 1 }}
          style={{
            background: `radial-gradient(circle at center, ${shatterColor}33 0%, transparent 70%)`,
          }}
        />
        <span className="relative z-10">{children}</span>
      </motion.button>

      <AnimatePresence>
        {shards.map((shard) => (
          <motion.div
            key={shard.id}
            className="absolute pointer-events-none"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
            animate={{
              x: shard.velocityX,
              y: shard.velocityY,
              rotate: shard.rotation,
              opacity: 0,
              scale: 0.5,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              left: "50%",
              top: "50%",
              width: shard.size,
              height: shard.size,
              background: shatterColor,
              boxShadow: `0 0 10px ${shatterColor}, 0 0 20px ${shatterColor}`,
              clipPath: shard.clipPath,
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {isShattered && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              border: `2px solid ${shatterColor}`,
              boxShadow: `0 0 30px ${shatterColor}`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
