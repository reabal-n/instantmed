"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { bootstrapAdminUser } from "@/app/actions/test-actions"
import { getIsTestMode, setTestModeOverride, isTestMode as envTestMode } from "@/lib/test-mode"
import { Loader2, ShieldCheck, AlertTriangle, FlaskConical, RotateCcw } from "lucide-react"

export function BootstrapClient() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const [testModeEnabled, setTestModeEnabled] = useState(false)
  const [hasOverride, setHasOverride] = useState(false)

  useEffect(() => {
    setTestModeEnabled(getIsTestMode())
    setHasOverride(localStorage.getItem("test-mode-override") !== null)
  }, [])

  const handleToggleTestMode = (enabled: boolean) => {
    setTestModeOverride(enabled)
    setTestModeEnabled(enabled)
    setHasOverride(true)
  }

  const handleResetToDefault = () => {
    setTestModeOverride(null)
    setTestModeEnabled(envTestMode)
    setHasOverride(false)
  }

  const handleBootstrap = async () => {
    setIsRunning(true)
    setResult(null)
    try {
      const res = await bootstrapAdminUser()
      setResult(res)
    } catch {
      setResult({ success: false, message: "An unexpected error occurred" })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-md">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            Test Mode
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle test mode to enable dummy data and skip payment features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="test-mode" className="text-sm font-medium">
                Enable test mode
              </Label>
              <p className="text-xs text-muted-foreground">
                {hasOverride ? "Manual override active" : `Default: ${envTestMode ? "On" : "Off"}`}
              </p>
            </div>
            <Switch id="test-mode" isSelected={testModeEnabled} onValueChange={handleToggleTestMode} />
          </div>

          {hasOverride && (
            <Button variant="ghost" size="sm" onClick={handleResetToDefault} className="w-full text-xs h-8">
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reset to environment default ({envTestMode ? "On" : "Off"})
            </Button>
          )}

          <div
            className={`rounded-lg p-3 text-xs ${
              testModeEnabled ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-muted text-muted-foreground"
            }`}
          >
            {testModeEnabled ? (
              <>
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                Test mode is ON. Fake Medicare numbers and skip-payment features are available.
              </>
            ) : (
              "Test mode is OFF. Production behavior enabled."
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Bootstrap Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            Admin Bootstrap
          </CardTitle>
          <CardDescription className="text-xs">Set up me@reabal.ai as a doctor with admin access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              Make sure me@reabal.ai has signed up first before running this.
            </p>
          </div>

          <Button
            onClick={handleBootstrap}
            disabled={isRunning || !testModeEnabled}
            className="w-full"
            variant={testModeEnabled ? "default" : "secondary"}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : !testModeEnabled ? (
              "Enable test mode first"
            ) : (
              "Run Bootstrap"
            )}
          </Button>

          {result && (
            <div
              className={`rounded-lg p-3 text-xs ${
                result.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
