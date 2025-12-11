"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getIsTestMode } from "@/lib/test-mode"
import { Beaker, Loader2, Plus, CreditCard } from "lucide-react"
import { createTestRequest } from "@/app/actions/test-actions"
import { toast } from "sonner"

interface TestToolsCardProps {
  patientId: string
}

export function TestToolsCard({ patientId }: TestToolsCardProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingPaid, setIsCreatingPaid] = useState(false)
  const [showCard, setShowCard] = useState(false)

  useEffect(() => {
    setShowCard(getIsTestMode())

    const handleChange = () => setShowCard(getIsTestMode())
    window.addEventListener("test-mode-changed", handleChange)
    window.addEventListener("storage", handleChange)

    return () => {
      window.removeEventListener("test-mode-changed", handleChange)
      window.removeEventListener("storage", handleChange)
    }
  }, [])

  if (!showCard) return null

  const handleCreateSample = async () => {
    setIsCreating(true)
    try {
      const result = await createTestRequest(patientId, false)
      if (result.success) {
        toast.success("Sample request created", { description: `Request ID: ${result.requestId?.slice(0, 8)}...` })
      } else {
        toast.error("Failed to create request", { description: result.error })
      }
    } catch (err) {
      toast.error("An error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreatePaidSample = async () => {
    setIsCreatingPaid(true)
    try {
      const result = await createTestRequest(patientId, true)
      if (result.success) {
        toast.success("Paid sample request created", { description: `Request ID: ${result.requestId?.slice(0, 8)}...` })
      } else {
        toast.error("Failed to create request", { description: result.error })
      }
    } catch (err) {
      toast.error("An error occurred")
    } finally {
      setIsCreatingPaid(false)
    }
  }

  return (
    <Card className="border-dashed border-amber-300 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
          <Beaker className="h-4 w-4" />
          Test Tools
        </CardTitle>
        <CardDescription className="text-xs text-amber-700">Only visible in test mode</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start bg-white border-amber-200 hover:bg-amber-100 text-amber-900"
          onClick={handleCreateSample}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create sample request
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start bg-white border-amber-200 hover:bg-amber-100 text-amber-900"
          onClick={handleCreatePaidSample}
          disabled={isCreatingPaid}
        >
          {isCreatingPaid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          Create paid sample
        </Button>
      </CardContent>
    </Card>
  )
}
