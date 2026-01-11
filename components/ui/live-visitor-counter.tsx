"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const AVATARS: string[] = [
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Health%20Worker.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Health%20Worker.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Student.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Office%20Worker.png",
]

const AVATAR_COLORS: string[] = ["#dbeafe", "#dcfce7", "#fce7f3", "#e0e7ff"]

interface LiveVisitorCounterProps {
  className?: string
  minVisitors?: number
  maxVisitors?: number
}

export function LiveVisitorCounter({
  className,
  minVisitors = 10,
  maxVisitors = 20,
}: LiveVisitorCounterProps) {
  const [visitorCount, setVisitorCount] = useState<number>(
    Math.floor(Math.random() * (maxVisitors - minVisitors + 1)) + minVisitors
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorCount(() => {
        return Math.floor(Math.random() * (maxVisitors - minVisitors + 1)) + minVisitors
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [minVisitors, maxVisitors])

  const DigitPlace = ({ place, value }: { place: number; value: number }) => {
    const [offset, setOffset] = useState<number>(0)
    const targetRef = useRef<number>(0)
    const currentRef = useRef<number>(0)

    useEffect(() => {
      const valueRoundedToPlace = Math.floor(value / place)
      targetRef.current = valueRoundedToPlace % 10

      let animationFrame: number
      const animate = () => {
        const diff = targetRef.current - currentRef.current
        if (Math.abs(diff) > 0.01) {
          currentRef.current += diff * 0.15
          setOffset(currentRef.current)
          animationFrame = requestAnimationFrame(animate)
        } else {
          currentRef.current = targetRef.current
          setOffset(targetRef.current)
        }
      }

      animationFrame = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationFrame)
    }, [value, place])

    const shouldDisplay = value >= place

    if (!shouldDisplay) return null

    return (
      <div className="relative h-5 w-3 overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const digitOffset = (10 + num - offset) % 10
          const translateY = digitOffset > 5 ? digitOffset * 20 - 10 * 20 : digitOffset * 20

          return (
            <span
              key={num}
              className="absolute left-0 right-0 text-center text-sm font-bold text-foreground"
              style={{
                transform: `translateY(${translateY}px)`,
                transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {num}
            </span>
          )
        })}
      </div>
    )
  }

  const visibleAvatars = AVATARS.slice(0, 3)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-card/80 backdrop-blur-sm border border-border/50",
        "shadow-sm",
        className
      )}
    >
      {/* Pulse indicator */}
      <div className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </div>

      {/* Counter */}
      <div className="flex items-center">
        {[10, 1].map((place) => (
          <DigitPlace key={place} place={place} value={visitorCount} />
        ))}
      </div>

      {/* Label */}
      <span className="text-xs text-muted-foreground">online now</span>

      {/* Avatar stack */}
      <div className="flex -space-x-1.5">
        {visibleAvatars.map((url, index) => (
          <div
            key={index}
            className="h-5 w-5 rounded-full border border-white dark:border-slate-800 overflow-hidden"
            style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
          >
            <Image
              src={url}
              alt=""
              width={20}
              height={20}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  )
}
