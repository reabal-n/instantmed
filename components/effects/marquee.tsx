"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface MarqueeProps {
  children: ReactNode
  className?: string
  speed?: number // Duration in seconds
  direction?: "left" | "right"
  pauseOnHover?: boolean
  gap?: number
}

export function Marquee({
  children,
  className,
  speed = 30,
  direction = "left",
  pauseOnHover = true,
  gap = 40,
}: MarqueeProps) {
  const isLeft = direction === "left"

  return (
    <div
      className={cn(
        "flex overflow-hidden mask-[linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]",
        pauseOnHover && "group",
        className
      )}
    >
      <motion.div
        className="flex shrink-0 items-center"
        style={{ gap }}
        animate={{
          x: isLeft ? ["0%", "-100%"] : ["-100%", "0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        {...(pauseOnHover && {
          whileHover: { animationPlayState: "paused" },
        })}
      >
        {children}
        {children}
      </motion.div>
      <motion.div
        className="flex shrink-0 items-center"
        style={{ gap }}
        animate={{
          x: isLeft ? ["0%", "-100%"] : ["-100%", "0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        {...(pauseOnHover && {
          whileHover: { animationPlayState: "paused" },
        })}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}

// Vertical marquee variant
interface VerticalMarqueeProps {
  children: ReactNode
  className?: string
  speed?: number
  direction?: "up" | "down"
  pauseOnHover?: boolean
  gap?: number
}

export function VerticalMarquee({
  children,
  className,
  speed = 20,
  direction = "up",
  pauseOnHover = true,
  gap = 20,
}: VerticalMarqueeProps) {
  const isUp = direction === "up"

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden mask-[linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)]",
        pauseOnHover && "group",
        className
      )}
    >
      <motion.div
        className="flex flex-col shrink-0"
        style={{ gap }}
        animate={{
          y: isUp ? ["0%", "-100%"] : ["-100%", "0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
        {children}
      </motion.div>
      <motion.div
        className="flex flex-col shrink-0"
        style={{ gap }}
        animate={{
          y: isUp ? ["0%", "-100%"] : ["-100%", "0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}

// Logo cloud / ticker with smooth animation
interface LogoTickerProps {
  logos: { src: string; alt: string; href?: string }[]
  className?: string
  speed?: number
  grayscale?: boolean
}

export function LogoTicker({
  logos,
  className,
  speed = 40,
  grayscale = true,
}: LogoTickerProps) {
  return (
    <Marquee speed={speed} className={className}>
      {logos.map((logo, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-center h-12 px-8",
            grayscale && "grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
          )}
        >
          {logo.href ? (
            <a href={logo.href} target="_blank" rel="noopener noreferrer">
              <Image src={logo.src} alt={logo.alt} width={100} height={32} className="h-8 w-auto object-contain" unoptimized />
            </a>
          ) : (
            <Image src={logo.src} alt={logo.alt} width={100} height={32} className="h-8 w-auto object-contain" unoptimized />
          )}
        </div>
      ))}
    </Marquee>
  )
}

// Text ticker for announcements
interface TextTickerProps {
  items: string[]
  className?: string
  speed?: number
  separator?: ReactNode
}

export function TextTicker({
  items,
  className,
  speed = 25,
  separator = <span className="mx-4 text-muted-foreground">•</span>,
}: TextTickerProps) {
  return (
    <Marquee speed={speed} className={className}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span>{item}</span>
          {i < items.length - 1 && separator}
        </span>
      ))}
    </Marquee>
  )
}
