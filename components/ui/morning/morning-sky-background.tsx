"use client"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface MorningSkyBackgroundProps {
  className?: string
}

export function MorningSkyBackground({ className }: MorningSkyBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden",
        className
      )}
      style={{ height: "100vh" }}
      aria-hidden="true"
    >
      {/* ===== LIGHT MODE: Morning sky ===== */}
      <div className="absolute inset-0 dark:opacity-0 transition-opacity duration-500">
        {/* Sky gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              #E1EEF5 0%,
              #EDF4F8 20%,
              #F3F7FA 40%,
              #FAFBFC 65%,
              transparent 100%
            )`,
          }}
        />

        {/* Cloud shapes — blur reduced to 8-20px (was 40-60px); CSS kills them entirely on mobile */}
        <div
          className="morning-sky-cloud absolute rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.6) 0%, transparent 70%)",
            width: "40%",
            height: "20%",
            top: "8%",
            left: "15%",
            filter: "blur(20px)",
            animation: prefersReducedMotion
              ? "none"
              : "cloud-drift-1 60s ease-in-out infinite",
          }}
        />
        <div
          className="morning-sky-cloud absolute rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)",
            width: "35%",
            height: "18%",
            top: "15%",
            right: "10%",
            filter: "blur(20px)",
            animation: prefersReducedMotion
              ? "none"
              : "cloud-drift-2 80s ease-in-out infinite",
          }}
        />
        <div
          className="morning-sky-cloud absolute rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)",
            width: "50%",
            height: "15%",
            top: "30%",
            left: "30%",
            filter: "blur(16px)",
            animation: prefersReducedMotion
              ? "none"
              : "cloud-drift-3 70s ease-in-out infinite",
          }}
        />
        {/* Warm dawn accent */}
        <div
          className="morning-sky-cloud absolute rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(240,180,160,0.12) 0%, transparent 70%)",
            width: "30%",
            height: "25%",
            top: "5%",
            right: "5%",
            filter: "blur(16px)",
            animation: prefersReducedMotion
              ? "none"
              : "cloud-drift-2 90s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* ===== DARK MODE: Night sky ===== */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              #0D1526 0%,
              #0B1120 40%,
              rgba(11,17,32,0.8) 70%,
              transparent 100%
            )`,
          }}
        />
        {/* Subtle star specks */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(1px 1px at 20% 15%, rgba(93,184,201,0.4), transparent),
              radial-gradient(1px 1px at 40% 25%, rgba(93,184,201,0.3), transparent),
              radial-gradient(1px 1px at 60% 10%, rgba(93,184,201,0.35), transparent),
              radial-gradient(1px 1px at 80% 30%, rgba(93,184,201,0.25), transparent),
              radial-gradient(1px 1px at 10% 35%, rgba(93,184,201,0.2), transparent),
              radial-gradient(1px 1px at 50% 5%, rgba(93,184,201,0.4), transparent),
              radial-gradient(1px 1px at 70% 20%, rgba(93,184,201,0.3), transparent),
              radial-gradient(1px 1px at 30% 8%, rgba(93,184,201,0.35), transparent)
            `,
          }}
        />
        {/* Teal nebula wash */}
        <div
          className="morning-sky-cloud absolute rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(93,184,201,0.06) 0%, transparent 70%)",
            width: "45%",
            height: "35%",
            top: "10%",
            left: "20%",
            filter: "blur(30px)",
          }}
        />
      </div>
    </div>
  )
}
