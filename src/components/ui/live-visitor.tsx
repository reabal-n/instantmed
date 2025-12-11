"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"

const AVATARS: string[] = [
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Technologist.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Student.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Mechanic.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Student.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Teacher.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Technologist.png",
  "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Person%20With%20Blond%20Hair.png",
]

const AVATAR_COLORS: string[] = ["#dbeafe", "#dcfce7", "#fce7f3", "#ffedd5", "#f3f4f6"]

interface DigitPlaceProps {
  place: number
  value: number
}

const LiveVisitorCounter = () => {
  const [visitorCount, setVisitorCount] = useState<number>(12)
  const MIN_COUNT = 5
  const MAX_COUNT = 20
  const MAX_AVATARS = 5

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorCount((prev) => {
        const change = Math.floor(Math.random() * 5) - 2 // -2 to +2 change
        const newCount = prev + change
        return Math.max(MIN_COUNT, Math.min(MAX_COUNT, newCount))
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const DigitPlace: React.FC<DigitPlaceProps> = ({ place, value }) => {
    const [offset, setOffset] = useState<number>(0)
    const targetRef = useRef<number>(0)
    const currentRef = useRef<number>(0)

    useEffect(() => {
      const valueRoundedToPlace = Math.floor(value / place)
      targetRef.current = valueRoundedToPlace % 10

      // Smooth transition using requestAnimationFrame
      let animationFrame: number
      const animate = () => {
        const diff = targetRef.current - currentRef.current
        if (Math.abs(diff) > 0.01) {
          currentRef.current += diff * 0.15 // Smooth easing
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
      <div className="relative h-5 w-4 overflow-hidden inline-block">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          let digitOffset = (10 + num - offset) % 10
          let translateY = digitOffset * 20

          if (digitOffset > 5) {
            translateY -= 10 * 20
          }

          return (
            <span
              key={num}
              className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground"
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

  const visibleAvatars = AVATARS.slice(0, avatarConfig.displayLimit)

  return (
    <div className="glass-card rounded-2xl p-5 border border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">Live Visitors</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {[10000, 1000, 100, 10, 1].map((place) => (
            <DigitPlace key={place} place={place} value={visitorCount} />
          ))}
        </div>

        <div className="flex items-center -space-x-2">
          {visibleAvatars.map((url, index) => (
            <div
              key={index}
              className="relative w-8 h-8 rounded-full border-2 border-background overflow-hidden animate-in fade-in slide-in-from-right"
              style={{
                zIndex: 10 + index,
                backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                animationDelay: `${index * 120}ms`,
                animationDuration: "0.5s",
              }}
            >
              <img src={url} alt={`Visitor ${index}`} className="w-full h-full object-cover" />
            </div>
          ))}
          {avatarConfig.showPlus && (
            <div
              className="relative w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground animate-in fade-in slide-in-from-right"
              style={{ zIndex: 20, animationDelay: `${visibleAvatars.length * 120}ms` }}
            >
              <span>+</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LiveVisitorCounter
