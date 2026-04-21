"use client"

const STORAGE_KEY = "doctor_approval_sound_enabled"

export function isApprovalSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === "1"
}

export function setApprovalSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0")
}

/**
 * Soft two-note "ding" cue played on successful approval. Uses Web Audio API
 * so there is no asset to ship and zero network cost. Respects the per-doctor
 * enable flag and `prefers-reduced-motion` (which implies the user is avoiding
 * sensory feedback in general). No-op on SSR.
 */
export function playApprovalSound(): void {
  if (typeof window === "undefined") return
  if (!isApprovalSoundEnabled()) return
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if (prefersReduced) return

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return

  try {
    const ctx = new Ctor()
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.18
    master.connect(ctx.destination)

    const tone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(1, now + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
      osc.connect(gain).connect(master)
      osc.start(now + start)
      osc.stop(now + start + duration + 0.02)
    }

    tone(880, 0, 0.22)
    tone(1318.5, 0.09, 0.32)

    setTimeout(() => {
      ctx.close().catch(() => {})
    }, 600)
  } catch {
    // Audio unavailable — silent fail is correct
  }
}
