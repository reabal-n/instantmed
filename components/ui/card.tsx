"use client"

import * as React from "react"
import { Card as HeroCard, CardHeader, CardBody, CardFooter } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface CardProps extends React.ComponentProps<typeof HeroCard> {
  children?: React.ReactNode
}

function Card({ className, children, ...props }: CardProps) {
  return (
    <HeroCard
      className={cn("bg-card text-card-foreground", className)}
      classNames={{
        base: "bg-background/60 backdrop-blur-xl border border-default-100 shadow-lg rounded-xl",
      }}
      {...props}
    >
      {children}
    </HeroCard>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard.Header
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-default-500 text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard.Body
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard.Footer
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
