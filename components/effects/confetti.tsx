"use client"

import { useEffect, useRef, useCallback } from "react"

interface ConfettiPiece {
  x: number
  y: number
  rotation: number
  color: string
  scale: number
  velocityX: number
  velocityY: number
  rotationSpeed: number
  opacity: number
}

const COLORS = [
  "#2563EB", // Primary teal
  "#4f46e5", // Purple
  "#4f46e5", // Cyan
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#10B981", // Emerald
]

const SHAPES = ["square", "circle", "triangle"] as const

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const piecesRef = useRef<ConfettiPiece[]>([])

  const createPiece = useCallback((x: number, y: number): ConfettiPiece => {
    const angle = Math.random() * Math.PI * 2
    const velocity = 8 + Math.random() * 8
    return {
      x,
      y,
      rotation: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      scale: 0.5 + Math.random() * 0.5,
      velocityX: Math.cos(angle) * velocity,
      velocityY: Math.sin(angle) * velocity - 10,
      rotationSpeed: (Math.random() - 0.5) * 20,
      opacity: 1,
    }
  }, [])

  const fire = useCallback((originX?: number, originY?: number) => {
    // Create canvas if it doesn&apos;t exist
    if (!canvasRef.current) {
      const canvas = document.createElement("canvas")
      canvas.style.position = "fixed"
      canvas.style.top = "0"
      canvas.style.left = "0"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      canvas.style.pointerEvents = "none"
      canvas.style.zIndex = "9999"
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      document.body.appendChild(canvas)
      canvasRef.current = canvas
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Default to center of screen
    const x = originX ?? window.innerWidth / 2
    const y = originY ?? window.innerHeight / 3

    // Create confetti pieces
    const newPieces: ConfettiPiece[] = []
    for (let i = 0; i < 100; i++) {
      newPieces.push(createPiece(x, y))
    }
    piecesRef.current = [...piecesRef.current, ...newPieces]

    // Start animation if not already running
    if (!animationRef.current) {
      const animate = () => {
        if (!canvasRef.current) return
        const ctx = canvasRef.current.getContext("2d")
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        piecesRef.current = piecesRef.current.filter((piece) => {
          // Update physics
          piece.velocityY += 0.3 // Gravity
          piece.x += piece.velocityX
          piece.y += piece.velocityY
          piece.rotation += piece.rotationSpeed
          piece.velocityX *= 0.99 // Air resistance
          piece.opacity -= 0.008

          // Draw piece
          if (piece.opacity > 0) {
            ctx.save()
            ctx.translate(piece.x, piece.y)
            ctx.rotate((piece.rotation * Math.PI) / 180)
            ctx.scale(piece.scale, piece.scale)
            ctx.globalAlpha = piece.opacity
            ctx.fillStyle = piece.color

            // Random shape
            const shapeIndex = Math.floor(piece.rotation) % 3
            const shape = SHAPES[shapeIndex]

            if (shape === "square") {
              ctx.fillRect(-6, -6, 12, 12)
            } else if (shape === "circle") {
              ctx.beginPath()
              ctx.arc(0, 0, 6, 0, Math.PI * 2)
              ctx.fill()
            } else {
              ctx.beginPath()
              ctx.moveTo(0, -8)
              ctx.lineTo(7, 6)
              ctx.lineTo(-7, 6)
              ctx.closePath()
              ctx.fill()
            }

            ctx.restore()
            return true
          }
          return false
        })

        if (piecesRef.current.length > 0) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          // Cleanup
          if (canvasRef.current) {
            document.body.removeChild(canvasRef.current)
            canvasRef.current = null
          }
          animationRef.current = null
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }
  }, [createPiece])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (canvasRef.current && document.body.contains(canvasRef.current)) {
        document.body.removeChild(canvasRef.current)
      }
    }
  }, [])

  return { fire }
}

// Simple component wrapper for declarative usage
export function Confetti({ trigger }: { trigger: boolean }) {
  const { fire } = useConfetti()

  useEffect(() => {
    if (trigger) {
      fire()
    }
  }, [trigger, fire])

  return null
}
