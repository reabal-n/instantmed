"use client"

import * as React from "react"
import { Card as HeroCard, CardHeader, CardBody, CardFooter } from "@heroui/react"

export interface CardProps {
  children: React.ReactNode
  className?: string
  isPressable?: boolean
  isHoverable?: boolean
  shadow?: "none" | "sm" | "md" | "lg"
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <HeroCard
      className={className}
      classNames={{
        base: "bg-background/60 backdrop-blur-xl border border-default-100 shadow-lg",
      }}
      {...props}
    >
      {children}
    </HeroCard>
  )
}

export { CardHeader, CardBody, CardFooter }
