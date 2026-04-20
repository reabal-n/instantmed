"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

// Module-level dedup — survives component remounts (soft nav, hot reload).
// Only clears on a full page reload, which is acceptable.
const notifiedIds = new Set<string>()

// Play the two-tone notification chime, respecting the doctor's mute preference.
function playNotificationSound() {
  if (typeof window === "undefined") return
  if (localStorage.getItem("instantmed:queue-sound-muted") === "true") return
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio unavailable — silent fallback
  }
}

// Only fire notifications for intakes paid within the last 10 minutes.
// This prevents spurious toasts when doctor notes are saved on old paid
// intakes (every UPDATE on a paid row re-fires the filter).
function isRecentlyPaid(intake: Record<string, unknown>): boolean {
  const paidAt = intake.paid_at as string | null | undefined
  if (!paidAt) return true // No timestamp — assume new, don't suppress
  return Date.now() - new Date(paidAt).getTime() < 10 * 60 * 1000
}

export function IntakeNotificationListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // We subscribe ONLY to INSERT and UPDATE filtered to status=paid.
    //
    // WHY UPDATE and not INSERT: intakes are created as draft and
    // transition to paid via the Stripe webhook, so the paid state
    // arrives as an UPDATE, not an INSERT.
    //
    // WHY recency check: Supabase sends UPDATE events for EVERY column
    // change on a paid row (notes saved, lock extended, etc.). Without
    // the recency guard, saving doctor notes on an existing paid intake
    // fires a spurious "New request ready" toast.
    const channel = supabase
      .channel("doctor-intake-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "intakes", filter: "status=eq.paid" },
        (payload) => {
          const intake = payload.new as Record<string, unknown>
          if (notifiedIds.has(intake.id as string)) return
          if (!isRecentlyPaid(intake)) return
          notifiedIds.add(intake.id as string)
          playNotificationSound()
          toast.info("New request received", {
            description: `${intake.category || "Medical"} request is ready for review`,
            duration: 10000,
          })
          router.refresh()
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "intakes", filter: "status=eq.paid" },
        (payload) => {
          const intake = payload.new as Record<string, unknown>
          if (notifiedIds.has(intake.id as string)) return
          if (!isRecentlyPaid(intake)) return
          notifiedIds.add(intake.id as string)
          playNotificationSound()
          toast.info("New request ready", {
            description: `${intake.category || "Medical"} request payment completed`,
            duration: 10000,
          })
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
