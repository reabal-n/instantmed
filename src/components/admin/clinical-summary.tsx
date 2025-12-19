'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Copy,
  Check,
  Save,
  Loader2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import {
  generateSummaryData,
  generateSummaryText,
} from '@/lib/clinical-summary/generator'
import type { ClinicalSummaryData } from '@/lib/clinical-summary/types'

interface ClinicalSummaryProps {
  intake: {
    id: string
    reference_number: string
    risk_tier: string
    risk_score: number
    risk_reasons: string[]
    triage_result: string
    created_at: string
  }
  patient: {
    full_name: string
    date_of_birth: string
  }
  service: {
    name: string
    type: string
  }
  answers?: {
    answers: Record<string, unknown>
    has_allergies: boolean
    allergy_details: string
    has_current_medications: boolean
    current_medications: string[]
    has_medical_conditions: boolean
    medical_conditions: string[]
    red_flags: string[]
    yellow_flags: string[]
    bmi?: number
  }
}

export function ClinicalSummary({
  intake,
  patient,
  service,
  answers,
}: ClinicalSummaryProps) {
  const [summaryData, setSummaryData] = useState<ClinicalSummaryData | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Generate summary on mount
  useEffect(() => {
    const data = generateSummaryData({ intake, patient, service, answers })
    setSummaryData(data)
  }, [intake, patient, service, answers])

  const handleCopy = async () => {
    if (!summaryData) return

    const text = generateSummaryText(summaryData)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!summaryData) return

    setIsSaving(true)
    try {
      const text = generateSummaryText(summaryData)
      
      const response = await fetch('/api/admin/save-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId: intake.id,
          summaryText: text,
          summaryData,
        }),
      })

      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Save summary error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!summaryData) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Clinical Summary
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 mr-1 text-green-500" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {saveSuccess ? 'Saved' : 'Save'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="w-4 h-4 mr-1 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chief Request */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Chief Request
          </h4>
          <p className="text-sm">{summaryData.chiefRequest}</p>
        </div>

        <Separator />

        {/* Medical History */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Medical History
          </h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allergies:</span>
              <span className={summaryData.allergies !== 'NKDA' ? 'text-red-600 font-medium' : ''}>
                {summaryData.allergies}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medications:</span>
              <span>{summaryData.currentMedications}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conditions:</span>
              <span>{summaryData.medicalConditions}</span>
            </div>
          </div>
        </div>

        {/* Clinical Findings */}
        {summaryData.clinicalFindings.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Clinical Findings
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {summaryData.clinicalFindings.map((finding, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{finding.label}:</span>
                    <span
                      className={
                        finding.isAbnormal ? 'text-orange-600 font-medium' : ''
                      }
                    >
                      {finding.value}
                      {finding.isAbnormal && ' ⚠'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Flags */}
        {(summaryData.redFlags.length > 0 || summaryData.yellowFlags.length > 0) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Flags
              </h4>
              <div className="space-y-2">
                {summaryData.redFlags.map((flag, i) => (
                  <div
                    key={`red-${i}`}
                    className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {flag}
                  </div>
                ))}
                {summaryData.yellowFlags.map((flag, i) => (
                  <div
                    key={`yellow-${i}`}
                    className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Risk & Recommendation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Risk Assessment:
            </span>
            <Badge
              variant={
                summaryData.riskTier === 'critical'
                  ? 'destructive'
                  : summaryData.riskTier === 'high'
                  ? 'destructive'
                  : summaryData.riskTier === 'moderate'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {summaryData.riskTier.toUpperCase()} ({summaryData.riskScore}/100)
            </Badge>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Recommendation
            </h4>
            <Alert>
              <AlertDescription>{summaryData.recommendation}</AlertDescription>
            </Alert>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
