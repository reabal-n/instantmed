import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'InstantMed | Online Medical Certificates & Prescriptions',
  description:
    'Get medical certificates and prescriptions online from Australian registered doctors. Fast, secure, and AHPRA compliant telehealth services.',
  keywords: [
    'telehealth',
    'medical certificate',
    'online doctor',
    'prescription',
    'Australia',
    'sick certificate',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  )
}
