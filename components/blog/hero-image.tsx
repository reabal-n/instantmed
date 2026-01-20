'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface HeroImageProps {
  src: string
  srcDark?: string
  alt: string
  className?: string
  priority?: boolean
}

export function HeroImage({ src, srcDark, alt, className, priority = false }: HeroImageProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use light image as default during SSR to avoid hydration mismatch
  const imageSrc = mounted && resolvedTheme === 'dark' && srcDark ? srcDark : src

  return (
    <div className={className}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className="object-cover"
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
      />
    </div>
  )
}
