"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

// Module-level dedup — survives component remounts (soft nav, hot reload).
// Only clears on a full page reload, which is acceptable.
const notifiedIds = new Set<string>()
const PAID_REQUEST_TOAST_WINDOW_MS = 10 * 60 * 1000
const PAYMENT_WRITE_DRIFT_MS = 30 * 1000

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

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// Supabase replays every update on a paid row. Only notify when the paid_at
// write is fresh and the row update happened at the same time as payment.
function isFreshPaidRequestNotification(intake: Record<string, unknown>): boolean {
  const paidAt = parseDate(intake.paid_at)
  if (!paidAt) return false

  const ageMs = Date.now() - paidAt.getTime()
  if (ageMs < -PAYMENT_WRITE_DRIFT_MS || ageMs > PAID_REQUEST_TOAST_WINDOW_MS) return false

  const updatedAt = parseDate(intake.updated_at)
  if (!updatedAt) return true

  return Math.abs(updatedAt.getTime() - paidAt.getTime()) <= PAYMENT_WRITE_DRIFT_MS
}

export function IntakeNotificationListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Intakes are created as draft and become reviewable when Stripe marks
    // them paid, so the useful signal is the fresh paid-row update.
    const channel = supabase
      .channel("doctor-intake-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "intakes", filter: "status=eq.paid" },
        (payload) => {
          const intake = payload.new as Record<string, unknown>
          const intakeId = typeof intake.id === "string" ? intake.id : null
          if (!intakeId || notifiedIds.has(intakeId)) return
          if (!isFreshPaidRequestNotification(intake)) return

          notifiedIds.add(intakeId)
          playNotificationSound()
          toast.info("New request ready", {
            id: `doctor-new-request-${intakeId}`,
            description: `${intake.category || "Medical"} request is ready for review`,
            duration: 8000,
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
