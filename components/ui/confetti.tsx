"use client"

import { useEffect, useRef, useCallback, useState } from "react"

interface ConfettiPiece {
  x: number
  y: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  velocityX: number
  velocityY: number
  gravity: number
  drag: number
  opacity: number
}

interface ConfettiProps {
  trigger?: boolean
  duration?: number
  particleCount?: number
  colors?: string[]
  onComplete?: () => void
}

export function Confetti({
  trigger = false,
  duration = 3000,
  particleCount = 100,
  colors = ["#00E2B5", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"],
  onComplete,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const piecesRef = useRef<ConfettiPiece[]>([])

  const createPiece = useCallback(
    (canvas: HTMLCanvasElement): ConfettiPiece => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      velocityX: (Math.random() - 0.5) * 20,
      velocityY: Math.random() * -20 - 10,
      gravity: 0.5,
      drag: 0.99,
      opacity: 1,
    }),
    [colors],
  )

  useEffect(() => {
    if (!trigger) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create pieces
    piecesRef.current = Array.from({ length: particleCount }, () => createPiece(canvas))

    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      piecesRef.current.forEach((piece) => {
        // Update physics
        piece.velocityX *= piece.drag
        piece.velocityY += piece.gravity
        piece.velocityY *= piece.drag
        piece.x += piece.velocityX
        piece.y += piece.velocityY
        piece.rotation += piece.rotationSpeed
        piece.opacity = Math.max(0, 1 - elapsed / duration)

        // Draw
        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate((piece.rotation * Math.PI) / 180)
        ctx.globalAlpha = piece.opacity
        ctx.fillStyle = piece.color
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6)
        ctx.restore()
      })

      if (elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onComplete?.()
      }
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [trigger, duration, particleCount, createPiece, onComplete])

  if (!trigger) return null

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-100" aria-hidden="true" />
}

// ConfettiButton - Button that triggers confetti on click
interface ConfettiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  options?: {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
  }
  children: React.ReactNode
}

export function ConfettiButton({
  onClick,
  options,
  children,
  className,
  disabled,
  ...props
}: ConfettiButtonProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    setShowConfetti(true)
    onClick?.(e)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-xl bg-linear-to-r from-[#00E2B5] to-[#06B6D4] text-[#0A0F1C] font-semibold shadow-lg shadow-[#00E2B5]/20 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`}
        {...props}
      >
        {children}
      </button>
      <Confetti
        trigger={showConfetti}
        particleCount={options?.particleCount || 100}
        colors={options?.colors || ["#00E2B5", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"]}
        onComplete={() => setShowConfetti(false)}
      />
    </>
  )
}
