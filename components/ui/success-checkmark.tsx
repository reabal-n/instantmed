'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
}

interface SuccessCheckmarkProps {
  className?: string
  size?: keyof typeof sizeMap | number
  show?: boolean
}

export function SuccessCheckmark({ className, size = 'lg', show = true }: SuccessCheckmarkProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size]
  
  if (!show) return null
  
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <CheckCircle 
        className="text-emerald-500 animate-in zoom-in-50 duration-500" 
        size={pixelSize} 
      />
    </div>
  )
}
