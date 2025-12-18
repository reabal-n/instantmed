"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SnappySliderProps {
  values: number[]
  defaultValue: number
  value?: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  label: string
  suffix?: string
  className?: string
  snapping?: boolean
  config?: {
    snappingThreshold?: number
  }
}

const formatNumber = (value: number, step: number = 1): string => {
  const numValue = Number(value)
  if (isNaN(numValue)) return "0"
  const decimalPlaces = step.toString().split('.')[1]?.length || 0
  if (decimalPlaces === 0 && Number.isInteger(numValue)) {
    return numValue.toString()
  }
  return numValue.toFixed(decimalPlaces)
}

export function SnappySlider({
  values,
  defaultValue,
  value,
  min: providedMin,
  max: providedMax,
  step,
  onChange,
  label,
  suffix,
  className,
  snapping = true,
  config = {},
}: SnappySliderProps) {
  const sliderRef = React.useRef<HTMLDivElement>(null)
  const { snappingThreshold = 1 } = config

  const defaultValueArray = [...values, defaultValue].sort((a, b) => a - b)
  
  const sliderValues = providedMin !== undefined && providedMax !== undefined
    ? defaultValueArray.filter(v => v >= providedMin && v <= providedMax)
    : defaultValueArray

  const sliderMin = Math.min(...sliderValues)
  const sliderMax = Math.max(...sliderValues)
  const computedStep = step ?? 1

  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value ?? internalValue

  const sliderPercentage = ((Math.min(Math.max(currentValue, sliderMin), sliderMax) - sliderMin) / (sliderMax - sliderMin)) * 100

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  const handleValueChange = React.useCallback((newValue: number) => {
    setInternalValue(newValue)
    onChange(newValue)
  }, [onChange])

  const handleInteraction = React.useCallback((clientX: number) => {
    const slider = sliderRef.current
    if (!slider) return

    const rect = slider.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const rawValue = percentage * (sliderMax - sliderMin) + sliderMin

    if (snapping) {
      const snapPoints = [...new Set([...defaultValueArray, currentValue])].sort((a, b) => a - b)
      const closestValue = snapPoints.reduce((prev, curr) => {
        return Math.abs(curr - rawValue) < Math.abs(prev - rawValue) ? curr : prev
      })
      
      if (Math.abs(closestValue - rawValue) <= snappingThreshold) {
        handleValueChange(closestValue)
        return
      }
    }

    const steppedValue = Math.round(rawValue / computedStep) * computedStep
    const clampedValue = Math.max(sliderMin, Math.min(sliderMax, steppedValue))
    handleValueChange(clampedValue)
  }, [sliderMin, sliderMax, defaultValueArray, currentValue, computedStep, snapping, snappingThreshold, handleValueChange])

  React.useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      handleInteraction(e.clientX)
      document.body.style.userSelect = 'none'

      const handleMouseMove = (e: MouseEvent) => handleInteraction(e.clientX)
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp, { once: true })
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      handleInteraction(e.touches[0].clientX)

      const handleTouchMove = (e: TouchEvent) => handleInteraction(e.touches[0].clientX)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', handleTouchMove)
      }, { once: true })
    }

    slider.addEventListener('mousedown', handleMouseDown)
    slider.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown)
      slider.removeEventListener('touchstart', handleTouchStart)
      document.body.style.userSelect = ''
    }
  }, [handleInteraction])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatNumber(currentValue, computedStep)}{suffix}
        </span>
      </div>
      
      {/* Slider Track */}
      <div className="relative h-8 pb-4">
        <div ref={sliderRef} className="absolute inset-x-0 top-2 cursor-pointer">
          {/* Track background */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            {/* Progress fill */}
            <div
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${sliderPercentage}%` }}
            />
          </div>
          
          {/* Snap markers */}
          {sliderValues.map((mark, index) => {
            const markPercentage = ((mark - sliderMin) / (sliderMax - sliderMin)) * 100
            if (markPercentage < 0 || markPercentage > 100) return null
            return (
              <div
                key={`${mark}-${index}`}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-background/80 rounded-full"
                style={{ left: `${markPercentage}%`, transform: 'translate(-50%, -50%)' }}
              />
            )
          })}

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full shadow-md border-2 border-background cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
            style={{ left: `${sliderPercentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default SnappySlider
