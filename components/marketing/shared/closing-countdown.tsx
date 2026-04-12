"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { SOCIAL_PROOF } from "@/lib/social-proof"

export function ClosingCountdown() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    function update() {
      const now = new Date()
      const aestOffset = 10 * 60
      const utc = now.getTime() + now.getTimezoneOffset() * 60_000
      const aest = new Date(utc + aestOffset * 60_000)
      const hour = aest.getHours()
      const minute = aest.getMinutes()

      const openHour = SOCIAL_PROOF.operatingHoursStart
      const closeHour = SOCIAL_PROOF.operatingHoursEnd

      if (hour < openHour) {
        const minsUntilOpen = (openHour - hour) * 60 - minute
        const h = Math.floor(minsUntilOpen / 60)
        const m = minsUntilOpen % 60
        setLabel(`Opens in ${h}h ${m}m`)
      } else if (hour >= closeHour) {
        setLabel("Opens at 8am AEST")
      } else {
        const minsUntilClose = (closeHour - hour) * 60 - minute
        if (minsUntilClose <= 120) {
          const h = Math.floor(minsUntilClose / 60)
          const m = minsUntilClose % 60
          setLabel(h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`)
        } else {
          setLabel(null)
        }
      }
    }

    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!label) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  )
}
