"use client"

import * as React from "react"
import { RadioGroup as HeroRadioGroup, Radio, type RadioGroupProps as HeroRadioGroupProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface RadioGroupProps extends HeroRadioGroupProps {
  className?: string
}

function RadioGroup({
  className,
  ...props
}: RadioGroupProps) {
  return (
    <HeroRadioGroup
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof Radio> & { className?: string }) {
  return (
    <Radio
      value={value}
      radius="full"
      classNames={{
        base: cn("max-w-fit", className),
        label: "text-foreground",
      }}
      {...props}
    >
      {children}
    </Radio>
  )
}

export { RadioGroup, RadioGroupItem }
