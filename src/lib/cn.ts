import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility for merging Tailwind CSS classes with proper conflict resolution
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 *
 * @example
 * cn('px-4 py-2', 'px-6') // => 'py-2 px-6'
 * cn('text-red-500', isError && 'text-green-500') // => conditional classes
 * cn({ 'bg-blue-500': isActive, 'bg-gray-500': !isActive }) // => object syntax
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
