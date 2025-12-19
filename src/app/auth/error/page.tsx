'use client'

import Link from 'next/link'
import { Stethoscope, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <CardContent className="p-8 text-center">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
          </Link>

          {/* Error Icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2 tracking-tight">Authentication Error</h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t complete the sign-in process. This might happen if:
          </p>

          <ul className="text-sm text-muted-foreground text-left space-y-2 mb-6 bg-slate-50 rounded-lg p-4">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              The authentication link has expired
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              The link was already used
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              There was a problem with Google Sign-In
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Your browser blocked the authentication
            </li>
          </ul>

          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </Link>
            
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-12">
                <ArrowRight className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            If this problem persists, please contact{' '}
            <a href="mailto:support@instantmed.com.au" className="text-teal-600 hover:underline">
              support@instantmed.com.au
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
