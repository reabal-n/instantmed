"use client"

import { ArrowLeft, Bug, ExternalLink } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ErrorMonitoringClient() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bug className="h-6 w-6 text-destructive" />
            Error Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Application error tracking and resolution
          </p>
        </div>
      </div>

      <Card className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
        <CardHeader>
          <CardTitle className="text-base">Error Tracking</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-muted-foreground text-center">
            Error tracking data is managed in Sentry
          </p>
          <Button asChild>
            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Sentry Dashboard
              <ExternalLink className="h-4 w-4 ml-1.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
