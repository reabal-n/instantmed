"use client"

import { motion } from "framer-motion"
import { FileText, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface DoctorNotesPreviewProps {
  serviceType: string | null
  collectedData: Record<string, unknown>
  flags?: string[]
}

export function DoctorNotesPreview({ serviceType, collectedData, flags = [] }: DoctorNotesPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!serviceType || Object.keys(collectedData).length === 0) {
    return null
  }
  
  const summary = generateSummary(serviceType, collectedData, flags)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/50 border border-border rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Doctor summary preview</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 pb-3"
        >
          <p className="text-xs text-muted-foreground mb-2">
            This is what your doctor will see
          </p>
          <div className="bg-background rounded-md p-3 text-sm space-y-2">
            {summary.map((line, idx) => (
              <div key={idx} className={cn(
                "flex gap-2",
                line.isFlag && "text-amber-600 dark:text-amber-400"
              )}>
                <span className="text-muted-foreground">•</span>
                <span>
                  <span className="font-medium">{line.label}:</span>{" "}
                  {line.value}
                </span>
              </div>
            ))}
            {flags.length > 0 && (
              <div className="pt-2 border-t border-border mt-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {flags.length} item{flags.length > 1 ? 's' : ''} flagged for review
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

interface SummaryLine {
  label: string
  value: string
  isFlag?: boolean
}

function generateSummary(
  serviceType: string,
  data: Record<string, unknown>,
  flags: string[]
): SummaryLine[] {
  const lines: SummaryLine[] = []
  
  // Service type
  const serviceLabels: Record<string, string> = {
    'med_cert': 'Medical Certificate',
    'medical_certificate': 'Medical Certificate',
    'repeat_rx': 'Repeat Prescription',
    'repeat_prescription': 'Repeat Prescription',
    'new_rx': 'New Prescription',
    'new_prescription': 'New Prescription',
    'consult': 'GP Consult',
    'general_consult': 'GP Consult',
  }
  lines.push({ label: 'Request', value: serviceLabels[serviceType] || serviceType })
  
  // Service-specific fields
  if (serviceType.includes('cert')) {
    if (data.purpose || data.certType) {
      lines.push({ label: 'Purpose', value: String(data.purpose || data.certType) })
    }
    if (data.startDate || data.dateFrom) {
      const duration = data.durationDays || data.duration || '1'
      lines.push({ 
        label: 'Duration', 
        value: `${duration} day${Number(duration) > 1 ? 's' : ''} from ${data.startDate || data.dateFrom}`,
        isFlag: Number(duration) >= 4 || flags.includes('duration_concern')
      })
    }
    if (data.symptoms || data.primarySymptoms) {
      const symptoms = Array.isArray(data.symptoms) ? data.symptoms : 
                       Array.isArray(data.primarySymptoms) ? data.primarySymptoms.map((s: { category?: string }) => s.category) :
                       [data.symptoms]
      lines.push({ label: 'Symptoms', value: symptoms.join(', ') })
    }
  }
  
  if (serviceType.includes('rx') || serviceType.includes('prescription')) {
    if (data.medication || data.medicationName) {
      const med = typeof data.medication === 'object' 
        ? (data.medication as { name?: string }).name 
        : data.medication || data.medicationName
      lines.push({ label: 'Medication', value: String(med) })
    }
    if (data.treatmentDuration || data.medicationDuration) {
      const dur = data.treatmentDuration || data.medicationDuration
      lines.push({ 
        label: 'On medication', 
        value: formatDuration(String(dur)),
        isFlag: String(dur).includes('under') || String(dur).includes('<3')
      })
    }
    if (data.conditionControl || data.controlLevel) {
      const control = data.conditionControl || data.controlLevel
      lines.push({ 
        label: 'Control', 
        value: formatControl(String(control)),
        isFlag: String(control).includes('poor')
      })
    }
  }
  
  if (serviceType.includes('consult')) {
    if (data.concern || data.concernSummary) {
      lines.push({ label: 'Concern', value: String(data.concern || data.concernSummary) })
    }
    if (data.urgency) {
      lines.push({ 
        label: 'Urgency', 
        value: String(data.urgency),
        isFlag: data.urgency === 'urgent'
      })
    }
    if (data.consultType) {
      lines.push({ label: 'Preference', value: String(data.consultType) })
    }
  }
  
  return lines
}

function formatDuration(duration: string): string {
  const map: Record<string, string> = {
    'under_3m': 'Under 3 months',
    '<3m': 'Under 3 months',
    'under_3_months': 'Under 3 months',
    '3_12m': '3-12 months',
    '3-12m': '3-12 months',
    '3_to_12_months': '3-12 months',
    'over_1y': 'Over 1 year',
    '>1y': 'Over 1 year',
    'over_1_year': 'Over 1 year',
  }
  return map[duration] || duration
}

function formatControl(control: string): string {
  const map: Record<string, string> = {
    'well': 'Well controlled',
    'well_controlled': 'Well controlled',
    'partial': 'Partially controlled',
    'partially_controlled': 'Partially controlled',
    'poor': 'Poorly controlled',
    'poorly_controlled': 'Poorly controlled',
  }
  return map[control] || control
}
