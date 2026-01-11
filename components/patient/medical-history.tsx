"use client"

import { useState } from "react"
import { 
  FileText, 
  Pill, 
  Calendar, 
  ChevronDown, 
  AlertCircle,
  Activity,
  Shield,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"

interface MedicalHistoryItem {
  id: string
  type: "prescription" | "medical_certificate" | "referral" | "pathology" | "consultation"
  title: string
  description?: string
  date: string
  status: "active" | "completed" | "expired"
  details?: Record<string, string>
  documentUrl?: string
}

interface MedicalHistoryProps {
  items: MedicalHistoryItem[]
  patientName: string
  showFilters?: boolean
}

const typeIcons = {
  prescription: Pill,
  medical_certificate: FileText,
  referral: FileText,
  pathology: Activity,
  consultation: Calendar,
}

const typeColors = {
  prescription: "bg-purple-100 text-purple-600",
  medical_certificate: "bg-blue-100 text-primary",
  referral: "bg-emerald-100 text-emerald-600",
  pathology: "bg-dawn-100 text-dawn-600",
  consultation: "bg-gray-100 text-gray-600",
}

const statusColors = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600",
}

export function MedicalHistory({ items, patientName, showFilters = true }: MedicalHistoryProps) {
  const [filter, setFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredItems = filter === "all" 
    ? items 
    : items.filter(item => item.type === filter)

  const groupedByMonth = filteredItems.reduce((acc, item) => {
    const monthKey = format(new Date(item.date), "MMMM yyyy")
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(item)
    return acc
  }, {} as Record<string, MedicalHistoryItem[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Medical History</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} records for {patientName}
          </p>
        </div>
        
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "prescription", label: "Scripts" },
              { value: "medical_certificate", label: "Med Certs" },
              { value: "referral", label: "Referrals" },
              { value: "pathology", label: "Pathology" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  filter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No records found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, monthItems]) => (
            <div key={month}>
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {month}
              </h3>
              <div className="space-y-3">
                {monthItems.map((item) => {
                  const Icon = typeIcons[item.type]
                  const isExpanded = expandedId === item.id

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "glass-card rounded-xl overflow-hidden transition-all",
                        isExpanded && "ring-2 ring-primary/20"
                      )}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          typeColors[item.type]
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{item.title}</p>
                            <Badge className={cn("text-xs", statusColors[item.status])}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            {item.description && ` · ${item.description}`}
                          </p>
                        </div>

                        <ChevronDown className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform shrink-0",
                          isExpanded && "rotate-180"
                        )} />
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && item.details && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                            {Object.entries(item.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="font-medium text-foreground">{value}</span>
                              </div>
                            ))}
                            
                            {item.documentUrl && (
                              <div className="pt-3 border-t">
                                <Button variant="outline" size="sm" asChild className="w-full">
                                  <a href={item.documentUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Document
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 text-sm">
        <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Your data is protected</p>
          <p className="text-muted-foreground">
            Medical records are encrypted and stored securely in Australia. Only authorized healthcare 
            providers can access your information.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact medical history for doctor sidebar
 */
interface CompactHistoryProps {
  items: MedicalHistoryItem[]
  maxItems?: number
  onViewAll?: () => void
}

export function CompactMedicalHistory({ items, maxItems = 5, onViewAll }: CompactHistoryProps) {
  const displayItems = items.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">No previous records</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayItems.map((item) => {
        const Icon = typeIcons[item.type]

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              typeColors[item.type]
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.date), "d MMM yyyy")}
              </p>
            </div>
          </div>
        )
      })}

      {items.length > maxItems && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full text-center text-sm text-primary hover:underline py-2"
        >
          View all {items.length} records
        </button>
      )}
    </div>
  )
}

/**
 * Allergies and conditions summary
 */
interface HealthSummaryProps {
  allergies?: string[]
  conditions?: string[]
  medications?: string[]
}

export function HealthSummary({ allergies = [], conditions = [], medications = [] }: HealthSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Allergies Alert */}
      {allergies.length > 0 && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Allergies</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {allergies.map((allergy, i) => (
              <Badge key={i} variant="outline" className="bg-red-100 text-red-700 border-red-200">
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Current Conditions */}
      {conditions.length > 0 && (
        <div className="p-3 rounded-xl bg-dawn-50 border border-dawn-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-dawn-600" />
            <span className="text-sm font-medium text-dawn-700">Conditions</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {conditions.map((condition, i) => (
              <Badge key={i} variant="outline" className="bg-dawn-100 text-dawn-700 border-dawn-200">
                {condition}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Current Medications */}
      {medications.length > 0 && (
        <div className="p-3 rounded-xl bg-blue-50 border border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Pill className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Current Medications</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {medications.map((med, i) => (
              <Badge key={i} variant="outline" className="bg-blue-100 text-primary border-primary">
                {med}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {allergies.length === 0 && conditions.length === 0 && medications.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No health information on file</p>
        </div>
      )}
    </div>
  )
}
