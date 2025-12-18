"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface VisualCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function VisualCard({ className, ...props }: VisualCardProps) {
  return (
    <div
      role="region"
      className={cn(
        "group/visual-card relative w-full max-w-[356px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
      {...props}
    />
  )
}

export function VisualCardBody({ className, ...props }: VisualCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 border-t border-zinc-200 p-4 dark:border-zinc-800",
        className
      )}
      {...props}
    />
  )
}

interface VisualCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function VisualCardTitle({ className, ...props }: VisualCardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

interface VisualCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function VisualCardDescription({ className, ...props }: VisualCardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export function VisualCardVisual({ className, ...props }: VisualCardProps) {
  return (
    <div
      className={cn("h-[180px] w-full overflow-hidden", className)}
      {...props}
    />
  )
}

interface DonutVisualProps {
  mainColor?: string
  secondaryColor?: string
  gridColor?: string
  label?: string
  sublabel?: string
}

export function DonutVisual({
  mainColor = "#8b5cf6",
  secondaryColor = "#00E2B5",
  gridColor = "#80808015",
  label = "Data Visualization",
  sublabel = "Displaying stats",
}: DonutVisualProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <div className="relative h-[180px] w-full overflow-hidden rounded-t-xl">
        <DonutLayer hovered={hovered} color={mainColor} secondaryColor={secondaryColor} />
        <LabelLayer color={mainColor} label={label} sublabel={sublabel} />
        <GradientLayer color={mainColor} />
        <EllipseGradient color={mainColor} />
        <GridLayer color={gridColor} />
      </div>
    </>
  )
}

const EllipseGradient: React.FC<{ color: string }> = ({ color }) => (
  <div className="absolute inset-0 z-[5] flex h-full w-full items-center justify-center">
    <svg width="100%" height="100%" viewBox="0 0 356 180" fill="none" preserveAspectRatio="xMidYMid slice">
      <rect width="356" height="180" fill="url(#ellipse-gradient)" />
      <defs>
        <radialGradient
          id="ellipse-gradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(178 98) rotate(90) scale(98 178)"
        >
          <stop stopColor={color} stopOpacity="0.25" />
          <stop offset="0.34" stopColor={color} stopOpacity="0.15" />
          <stop offset="1" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  </div>
)

const GridLayer: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{ "--grid-color": color } as React.CSSProperties}
    className="pointer-events-none absolute inset-0 z-[4] h-full w-full bg-transparent bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:20px_20px] bg-center opacity-70 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
  />
)

interface LayerProps {
  color: string
  secondaryColor?: string
  hovered?: boolean
  label?: string
  sublabel?: string
}

const DonutLayer: React.FC<LayerProps> = ({ hovered, color, secondaryColor }) => {
  const [mainProgress, setMainProgress] = useState(12.5)
  const [secondaryProgress, setSecondaryProgress] = useState(0)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (hovered) {
      timeout = setTimeout(() => {
        setMainProgress(66)
        setSecondaryProgress(100)
      }, 200)
    } else {
      setMainProgress(12.5)
      setSecondaryProgress(0)
    }
    return () => clearTimeout(timeout)
  }, [hovered])

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const mainDashoffset = circumference - (mainProgress / 100) * circumference
  const secondaryDashoffset = circumference - (secondaryProgress / 100) * circumference

  return (
    <div className="ease-[cubic-bezier(0.6,0.6,0,1)] absolute top-0 left-0 z-[7] flex h-[360px] w-full transform items-center justify-center transition-transform duration-500 group-hover/visual-card:-translate-y-[90px] group-hover/visual-card:scale-110">
      <div className="relative flex h-[120px] w-[120px] items-center justify-center text-muted-foreground">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            opacity={0.2}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={secondaryColor}
            strokeWidth="14"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={secondaryDashoffset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.6, 0.6, 0, 1)" }}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="14"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={mainDashoffset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.6, 0.6, 0, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold text-foreground">
            {hovered ? (secondaryProgress > 66 ? secondaryProgress : mainProgress) : mainProgress}%
          </span>
        </div>
      </div>
    </div>
  )
}

const LabelLayer: React.FC<{ color: string; label: string; sublabel: string }> = ({ color, label, sublabel }) => (
  <div className="relative h-full w-full" style={{ "--color": color } as React.CSSProperties}>
    <div className="ease-[cubic-bezier(0.6,0.6,0,1)] absolute inset-0 z-[6] flex w-full translate-y-0 items-start justify-center bg-transparent p-4 transition-transform duration-500 group-hover/visual-card:translate-y-full">
      <div className="ease-[cubic-bezier(0.6,0.6,0,1)] rounded-md border border-zinc-200 bg-white/25 px-2 py-1.5 opacity-100 backdrop-blur-sm transition-opacity duration-500 group-hover/visual-card:opacity-0 dark:border-zinc-800 dark:bg-black/25">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color)]" />
          <p className="text-xs text-foreground">{label}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  </div>
)

const GradientLayer: React.FC<{ color: string }> = ({ color }) => (
  <div className="ease-[cubic-bezier(0.6,0.6,0,1)] absolute inset-0 z-[6] flex translate-y-full items-center justify-center opacity-0 transition-all duration-500 group-hover/visual-card:translate-y-0 group-hover/visual-card:opacity-100">
    <svg width="100%" height="180" viewBox="0 0 356 180" fill="none" preserveAspectRatio="xMidYMid slice">
      <rect width="356" height="180" fill="url(#gradient-layer)" />
      <defs>
        <linearGradient id="gradient-layer" x1="178" y1="0" x2="178" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0.35" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  </div>
)

export { DonutLayer, LabelLayer, GradientLayer, EllipseGradient, GridLayer }
