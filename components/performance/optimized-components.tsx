"use client"

import React, { memo, useMemo, useCallback } from "react"
import { Loader2 } from "lucide-react"

// Generic loading state component
export const LoadingSpinner = memo(({ size = "sm" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = useMemo(() => {
    switch (size) {
      case "sm": return "h-4 w-4"
      case "md": return "h-6 w-6"
      case "lg": return "h-8 w-8"
      default: return "h-4 w-4"
    }
  }, [size])

  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`animate-spin ${sizeClass}`} />
    </div>
  )
})

LoadingSpinner.displayName = "LoadingSpinner"

// Optimized stat card component
interface OptimizedStatCardProps {
  label: string
  value: string | number
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
  }
  status?: "success" | "warning" | "error" | "info" | "neutral"
  onClick?: () => void
}

export const OptimizedStatCard = memo<OptimizedStatCardProps>(({
  label,
  value,
  trend,
  status = "neutral",
  onClick
}) => {
  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  const statusClasses = useMemo(() => {
    const baseClasses = "dashboard-stat-card p-6 rounded-xl border transition-all"
    const statusMap = {
      success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
      warning: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20",
      error: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
      info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20",
      neutral: "border-border bg-card"
    }
    return `${baseClasses} ${statusMap[status]} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`
  }, [status, onClick])

  const trendIcon = useMemo(() => {
    if (!trend) return null
    const direction = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"
    const color = trend.direction === "up" ? "text-green-600" : trend.direction === "down" ? "text-red-600" : "text-gray-600"
    return <span className={`text-sm ${color}`}>{direction} {trend.value}%</span>
  }, [trend])

  return (
    <div className={statusClasses} onClick={handleClick}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trendIcon}
        </div>
      </div>
    </div>
  )
})

OptimizedStatCard.displayName = "OptimizedStatCard"

// Optimized list component with virtual scrolling support
interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function OptimizedList<T>({ 
  items, 
  renderItem, 
  keyExtractor, 
  loading, 
  emptyMessage = "No items found",
  className = ""
}: OptimizedListProps<T>) {
  const memoizedItems = useMemo(() => items, [items])

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  if (memoizedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {memoizedItems.map((item, index) => (
        <React.Fragment key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  )
}

// Optimized search component with debouncing
interface OptimizedSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export const OptimizedSearch = memo<OptimizedSearchProps>(({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className = ""
}) => {
  const [localValue, setLocalValue] = React.useState(value)

  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const debouncedOnChange = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout
      return (newValue: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          onChange(newValue)
        }, debounceMs)
      }
    },
    [onChange, debounceMs]
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }, [debouncedOnChange])

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`}
    />
  )
})

OptimizedSearch.displayName = "OptimizedSearch"

// Optimized image component with lazy loading
interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fallback?: string
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className = "",
  fallback = "/images/placeholder.png"
}) => {
  const [imageSrc, setImageSrc] = React.useState(src)
  const [isLoading, setIsLoading] = React.useState(true)

  const handleError = useCallback(() => {
    setImageSrc(fallback)
    setIsLoading(false)
  }, [fallback])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <LoadingSpinner />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  )
})

OptimizedImage.displayName = "OptimizedImage"

// Optimized chart component wrapper
interface ChartDataPoint {
  time: string | Date
  value: number
}

interface OptimizedChartProps {
  data: ChartDataPoint[]
  type: "line" | "bar" | "pie"
  loading?: boolean
  error?: string
  className?: string
}

export const OptimizedChart = memo<OptimizedChartProps>(({
  data,
  type,
  loading,
  error,
  className = ""
}) => {
  const memoizedData = useMemo(() => data, [data])

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 text-red-500 ${className}`}>
        <p>Error loading chart: {error}</p>
      </div>
    )
  }

  if (memoizedData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className}`}>
        <p>No data available</p>
      </div>
    )
  }

  // Chart implementation would go here
  // For now, return a placeholder
  return (
    <div className={`h-64 flex items-center justify-center border border-border rounded-lg ${className}`}>
      <p className="text-muted-foreground">Chart: {type} with {memoizedData.length} data points</p>
    </div>
  )
})

OptimizedChart.displayName = "OptimizedChart"
