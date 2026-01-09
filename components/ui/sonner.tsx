'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        ...props.toastOptions,
        classNames: {
          // Base toast - Glass surface with colored glow
          toast: 'group toast group-[.toaster]:bg-white/85 dark:group-[.toaster]:bg-gray-900/80 group-[.toaster]:text-foreground group-[.toaster]:border-white/50 dark:group-[.toaster]:border-white/15 group-[.toaster]:shadow-[0_8px_30px_rgb(59,130,246,0.15)] dark:group-[.toaster]:shadow-[0_8px_30px_rgb(139,92,246,0.15)] group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:border group-[.toaster]:animate-in group-[.toaster]:slide-in-from-right group-[.toaster]:duration-300',
          description: 'group-[.toast]:text-muted-foreground',
          // Action button with pill shape and glow
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:font-medium group-[.toast]:shadow-[0_4px_20px_rgb(59,130,246,0.3)] group-[.toast]:hover:shadow-[0_4px_25px_rgb(59,130,246,0.4)] group-[.toast]:transition-all',
          cancelButton: 'group-[.toast]:bg-white/50 dark:group-[.toast]:bg-gray-800/50 group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:backdrop-blur-sm group-[.toast]:hover:bg-white/70 dark:group-[.toast]:hover:bg-gray-800/70',
          closeButton: 'group-[.toast]:bg-white/80 dark:group-[.toast]:bg-gray-800/80 group-[.toast]:border-white/50 dark:group-[.toast]:border-white/15 group-[.toast]:text-foreground group-[.toast]:backdrop-blur-sm group-[.toast]:hover:bg-white dark:group-[.toast]:hover:bg-gray-800 group-[.toast]:rounded-full',
          // Success - Emerald glow
          success: 'group-[.toaster]:border-emerald-300/50 dark:group-[.toaster]:border-emerald-700/50 group-[.toaster]:bg-emerald-50/90 dark:group-[.toaster]:bg-emerald-950/80 group-[.toaster]:text-emerald-900 dark:group-[.toaster]:text-emerald-100 group-[.toaster]:shadow-[0_8px_30px_rgb(34,197,94,0.2)]',
          // Error - Red glow
          error: 'group-[.toaster]:border-red-300/50 dark:group-[.toaster]:border-red-700/50 group-[.toaster]:bg-red-50/90 dark:group-[.toaster]:bg-red-950/80 group-[.toaster]:text-red-900 dark:group-[.toaster]:text-red-100 group-[.toaster]:shadow-[0_8px_30px_rgb(239,68,68,0.2)]',
          // Warning - Amber glow
          warning: 'group-[.toaster]:border-amber-300/50 dark:group-[.toaster]:border-amber-700/50 group-[.toaster]:bg-amber-50/90 dark:group-[.toaster]:bg-amber-950/80 group-[.toaster]:text-amber-900 dark:group-[.toaster]:text-amber-100 group-[.toaster]:shadow-[0_8px_30px_rgb(245,158,11,0.2)]',
          // Info - Blue glow
          info: 'group-[.toaster]:border-blue-300/50 dark:group-[.toaster]:border-blue-700/50 group-[.toaster]:bg-blue-50/90 dark:group-[.toaster]:bg-blue-950/80 group-[.toaster]:text-blue-900 dark:group-[.toaster]:text-blue-100 group-[.toaster]:shadow-[0_8px_30px_rgb(59,130,246,0.2)]',
          // Loading - Subtle glow
          loading: 'group-[.toaster]:border-primary/20 group-[.toaster]:bg-white/90 dark:group-[.toaster]:bg-gray-900/80 group-[.toaster]:shadow-[0_8px_30px_rgb(59,130,246,0.1)]',
          ...props.toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
