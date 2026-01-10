"use client"

import * as React from "react"
import { CheckCircle2, Info, XCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "info" | "success" | "warning" | "destructive"
  icon?: React.ReactNode
  showIcon?: boolean
}

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
}

const variantStyles = {
  default: "bg-background text-foreground border-default-200",
  info: "border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  success: "border-success bg-success/10 text-success dark:bg-success/20 dark:text-success",
  warning: "border-warning bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning",
  destructive: "border-danger bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger",
}

function Alert({
  className,
  variant = "default",
  icon,
  showIcon = true,
  children,
  ...props
}: AlertProps) {
  const IconComponent = iconMap[variant || "default"]

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-3",
        "[&>svg~*]:pl-6 [&>svg+div]:translate-y-[-2px]",
        "[&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3 [&>svg]:text-foreground",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {showIcon && (icon || <IconComponent className="size-3.5" />)}
      {children}
    </div>
  )
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

// Export alertVariants for backward compatibility
const alertVariants = {
  default: "default",
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "destructive",
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
