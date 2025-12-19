import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import './globals.css'
import '@/styles/mobile.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'InstantMed | Online Medical Certificates & Prescriptions',
    template: '%s | InstantMed',
  },
  description:
    'Get medical certificates and prescriptions online from Australian registered doctors. Fast, secure, and AHPRA compliant telehealth services.',
  keywords: [
    'telehealth',
    'medical certificate',
    'online doctor',
    'prescription',
    'Australia',
    'sick certificate',
    'weight loss',
    'mens health',
    'womens health',
  ],
  authors: [{ name: 'InstantMed' }],
  creator: 'InstantMed',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    siteName: 'InstantMed',
    title: 'InstantMed | Online Medical Certificates & Prescriptions',
    description:
      'Get medical certificates and prescriptions online from Australian registered doctors. Fast, secure, and AHPRA compliant telehealth services.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed | Online Medical Certificates & Prescriptions',
    description:
      'Get medical certificates and prescriptions online from Australian registered doctors.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here
    // google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <TooltipProvider delayDuration={300}>
              {children}
            </TooltipProvider>
          </ToastProvider>
        </ErrorBoundary>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'font-sans',
              title: 'font-medium',
              description: 'text-sm',
            },
          }}
        />
      </body>
    </html>
  )
}
