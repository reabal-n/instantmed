"use client"

import { useState } from "react"

interface RadioOption {
  id: string
  value: string
  label: string
}

interface AnimatedRadioProps {
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  className?: string
}

export function AnimatedRadio({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  name = "animated-radio",
  className = "",
}: AnimatedRadioProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || "")
  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  const getGliderTransform = () => {
    const index = options.findIndex((option) => option.value === selectedValue)
    return `translateY(${index * 100}%)`
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative flex flex-col pl-3 scale-150">
        {options.map((option) => (
          <div key={option.id} className="relative z-20 py-1">
            <input
              id={option.id}
              name={name}
              type="radio"
              value={option.value}
              checked={selectedValue === option.value}
              onChange={(e) => handleChange(e.target.value)}
              className="absolute w-full h-full m-0 opacity-0 cursor-pointer z-30 appearance-none"
            />
            <label
              htmlFor={option.id}
              className={`cursor-pointer text-xl py-2 px-1 block transition-all duration-300 ease-in-out ${
                selectedValue === option.value
                  ? "text-purple-600 dark:text-purple-300"
                  : "text-gray-600 dark:text-gray-500"
              }`}
            >
              {option.label}
            </label>
          </div>
        ))}

        <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-gray-300 dark:via-neutral-800 to-transparent">
          <div
            className="relative h-1/3 w-full bg-linear-to-b from-transparent via-purple-600 dark:via-purple-500 to-transparent transition-transform duration-500 ease-[cubic-bezier(0.37,1.95,0.66,0.56)]"
            style={{ transform: getGliderTransform() }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 h-3/5 w-[300%] bg-purple-600 dark:bg-purple-500 blur-[10px]" />
            <div className="absolute left-0 h-full w-36 bg-linear-to-r from-purple-600/10 dark:from-purple-500/10 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}
