'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:border',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-medium group-[.toast]:shadow-md group-[.toast]:hover:shadow-lg group-[.toast]:transition-all',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl group-[.toast]:hover:bg-muted/80',
          closeButton: 'group-[.toast]:bg-background/80 group-[.toast]:border-border group-[.toast]:text-foreground group-[.toast]:hover:bg-muted',
          success: 'group-[.toaster]:border-emerald-200/50 group-[.toaster]:bg-emerald-50/95 group-[.toaster]:text-emerald-900 dark:group-[.toaster]:bg-emerald-950/90 dark:group-[.toaster]:border-emerald-800/50 dark:group-[.toaster]:text-emerald-100',
          error: 'group-[.toaster]:border-red-200/50 group-[.toaster]:bg-red-50/95 group-[.toaster]:text-red-900 dark:group-[.toaster]:bg-red-950/90 dark:group-[.toaster]:border-red-800/50 dark:group-[.toaster]:text-red-100',
          warning: 'group-[.toaster]:border-amber-200/50 group-[.toaster]:bg-amber-50/95 group-[.toaster]:text-amber-900 dark:group-[.toaster]:bg-amber-950/90 dark:group-[.toaster]:border-amber-800/50 dark:group-[.toaster]:text-amber-100',
          info: 'group-[.toaster]:border-primary/50 group-[.toaster]:bg-blue-50/95 group-[.toaster]:text-blue-900 dark:group-[.toaster]:bg-blue-950/90 dark:group-[.toaster]:border-primary/50 dark:group-[.toaster]:text-blue-100',
          loading: 'group-[.toaster]:border-primary/20 group-[.toaster]:bg-background/95',
        },
      }}
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
          ...props.toastOptions?.classNames,
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:border group-[.toaster]:animate-in group-[.toaster]:slide-in-from-right group-[.toaster]:duration-300',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
