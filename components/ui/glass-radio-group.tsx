"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface GlassRadioOption {
  id: string
  value: string
  label: string
  color?: {
    gradient: string
    glow: string
    inset: string
  }
}

interface GlassRadioGroupProps {
  options: GlassRadioOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  className?: string
}

const defaultColors = [
  {
    gradient: "linear-gradient(135deg, #c0c0c055, #e0e0e0)",
    glow: "rgba(192, 192, 192, 0.5)",
    inset: "rgba(255, 255, 255, 0.4)",
  },
  {
    gradient: "linear-gradient(135deg, #ffd70055, #ffcc00)",
    glow: "rgba(255, 215, 0, 0.5)",
    inset: "rgba(255, 235, 150, 0.4)",
  },
  {
    gradient: "linear-gradient(135deg, #d0e7ff55, #a0d8ff)",
    glow: "rgba(160, 216, 255, 0.5)",
    inset: "rgba(200, 240, 255, 0.4)",
  },
]

export function GlassRadioGroup({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  name = "glass-radio",
  className = "",
}: GlassRadioGroupProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue || options[0]?.value || ""
  )
  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  const getGliderTransform = () => {
    const index = options.findIndex((option) => option.value === selectedValue)
    return `translateX(${index * 100}%)`
  }

  const getSelectedColor = () => {
    const selectedIndex = options.findIndex((option) => option.value === selectedValue)
    const option = options[selectedIndex]
    if (option?.color) {
      return option.color
    }
    return defaultColors[selectedIndex] || defaultColors[0]
  }

  const selectedColor = getSelectedColor()

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className="relative flex rounded-2xl backdrop-blur-xl overflow-hidden w-fit"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          boxShadow:
            "inset 1px 1px 4px rgba(255, 255, 255, 0.2), inset -1px -1px 6px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        {options.map((option) => (
          <React.Fragment key={option.id}>
            <input
              type="radio"
              id={option.id}
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={(e) => handleChange(e.target.value)}
              className="hidden"
            />
            <label
              htmlFor={option.id}
              className={cn(
                "flex-1 flex items-center justify-center min-w-[80px] text-sm px-6 py-3 cursor-pointer font-semibold tracking-wide relative z-10 transition-colors duration-300",
                selectedValue === option.value
                  ? "text-white"
                  : "text-[#e5e5e5] hover:text-white"
              )}
            >
              {option.label}
            </label>
          </React.Fragment>
        ))}

        {/* Glider */}
        <div
          className="absolute top-0 bottom-0 rounded-2xl z-0 transition-all duration-500 ease-[cubic-bezier(0.37,1.95,0.66,0.56)]"
          style={{
            width: `${100 / options.length}%`,
            transform: getGliderTransform(),
            background: selectedColor.gradient,
            boxShadow: `0 0 18px ${selectedColor.glow}, 0 0 10px ${selectedColor.inset} inset`,
          }}
        />
      </div>
    </div>
  )
}
