"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FlowErrorScreenProps {
  /** The raw service param from the URL that was not recognised */
  invalidService: string
}

/**
 * Full-screen error state shown when the URL contains an unknown
 * service param (e.g. /request?service=bogus).
 */
export function FlowErrorScreen({ invalidService }: FlowErrorScreenProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <X className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Unknown service</h1>
        <p className="text-muted-foreground">
          The requested service &ldquo;{invalidService}&rdquo; is not available.
        </p>
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={() => router.push("/request")}>
            Choose a service
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Return home
          </Button>
        </div>
      </div>
    </div>
  )
}
