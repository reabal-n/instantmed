"use client"

import { Suspense, lazy, type ComponentType } from "react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * LazyComponent - Wrapper for lazy-loaded components with fallback
 * 
 * Provides consistent loading states for dynamically imported components
 * to improve initial page load performance.
 */

interface LazyComponentProps<T extends object> {
  loader: () => Promise<{ default: ComponentType<T> }>
  props: T
  fallback?: React.ReactNode
  fallbackHeight?: string
}

/**
 * Create a lazy-loaded component with automatic suspense handling
 */
export function createLazyComponent<T extends object>(
  loader: () => Promise<{ default: ComponentType<T> }>
) {
  const LazyComp = lazy(loader)
  
  return function LazyWrapper({ 
    fallback, 
    fallbackHeight = "200px",
    ...props 
  }: T & { fallback?: React.ReactNode; fallbackHeight?: string }) {
    const defaultFallback = (
      <div className="animate-pulse" style={{ minHeight: fallbackHeight }}>
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
    )

    return (
      <Suspense fallback={fallback || defaultFallback}>
        <LazyComp {...(props as T)} />
      </Suspense>
    )
  }
}

/**
 * LazySection - Lazy load a section with intersection observer
 * Only loads when the component enters the viewport
 */
import { useEffect, useState, useRef } from "react"

interface LazySectionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
}

export function LazySection({ 
  children, 
  fallback,
  rootMargin = "100px",
  threshold = 0.1
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return (
    <div ref={ref}>
      {isVisible ? children : fallback || (
        <div className="animate-pulse min-h-[200px]">
          <Skeleton className="w-full h-48 rounded-xl" />
        </div>
      )}
    </div>
  )
}

/**
 * LazyImage - Lazy load images with blur placeholder
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
}

export function LazyImage({ 
  src, 
  alt, 
  placeholder,
  className,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "50px" }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef} className="relative overflow-hidden">
      {/* Placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{
            backgroundImage: placeholder ? `url(${placeholder})` : undefined,
            backgroundSize: "cover",
            filter: "blur(10px)",
          }}
        />
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={className}
          onLoad={() => setIsLoaded(true)}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
          {...props}
        />
      )}
    </div>
  )
}
