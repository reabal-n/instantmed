"use client"

import { useState } from "react"
import {
  User,
  Calendar,
  Pill,
  AlertTriangle,
  Heart,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface MedicalHistoryData {
  // Demographics
  fullName: string
  dateOfBirth: string
  age: number
  sex?: string
  
  // Medical
  allergies: string[]
  currentMedications: string[]
  chronicConditions: string[]
  
  // History with InstantMed
  previousRequests: {
    id: string
    type: string
    date: string
    status: string
  }[]
  
  // Flags
  hasAllergies: boolean
  hasChronicConditions: boolean
  isNewPatient: boolean
  
  // Medicare
  medicareNumber?: string
  medicareIrn?: string
}

interface MedicalHistorySummaryProps {
  data: MedicalHistoryData
  className?: string
  defaultExpanded?: boolean
}

/**
 * Compact medical history summary for doctor review
 * Best practice: shows critical info at a glance
 */
export function MedicalHistorySummary({
  data,
  className,
  defaultExpanded = false,
}: MedicalHistorySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const hasRedFlags = data.allergies.length > 0 || data.chronicConditions.length > 0

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden",
        hasRedFlags ? "border-dawn-200 bg-dawn-50/30" : "border-gray-200 bg-white",
        className
      )}
    >
      {/* Header - Always visible */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
            {data.fullName.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{data.fullName}</h3>
              {data.isNewPatient && (
                <Badge variant="secondary" className="text-xs">New Patient</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {data.age} y/o
              </span>
              {data.sex && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {data.sex}
                </span>
              )}
              {data.medicareNumber && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Medicare ✓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick flags */}
        <div className="flex items-center gap-2">
          {data.hasAllergies && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Allergies
            </Badge>
          )}
          {data.hasChronicConditions && (
            <Badge variant="outline" className="border-dawn-500 text-dawn-700 flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Conditions
            </Badge>
          )}
        </div>
      </div>

      {/* Critical Info Strip - Always visible if present */}
      {(data.allergies.length > 0 || data.currentMedications.length > 0) && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {data.allergies.map((allergy) => (
            <Badge
              key={allergy}
              variant="destructive"
              className="text-xs"
            >
              ⚠️ {allergy}
            </Badge>
          ))}
          {data.currentMedications.slice(0, 3).map((med) => (
            <Badge
              key={med}
              variant="secondary"
              className="text-xs"
            >
              💊 {med}
            </Badge>
          ))}
          {data.currentMedications.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{data.currentMedications.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Expandable section */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2 border-t bg-gray-50/50 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-gray-100/50 transition-colors">
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Less details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Full medical history
              </>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 border-t space-y-4">
            {/* Chronic Conditions */}
            {data.chronicConditions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-dawn-500" />
                  Chronic Conditions
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.chronicConditions.map((condition) => (
                    <Badge key={condition} variant="outline" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* All Medications */}
            {data.currentMedications.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-blue-500" />
                  Current Medications
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.currentMedications.map((med) => (
                    <Badge key={med} variant="secondary" className="text-xs">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Requests */}
            {data.previousRequests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  Recent Requests ({data.previousRequests.length})
                </h4>
                <div className="space-y-2">
                  {data.previousRequests.slice(0, 5).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{request.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs">{request.date}</span>
                        <Badge
                          variant={request.status === "approved" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medicare Info */}
            {data.medicareNumber && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Medicare</span>
                  <span className="font-mono">
                    {data.medicareNumber} / {data.medicareIrn || "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/**
 * Compact version for inline display
 */
export function MedicalHistoryBadges({ data }: { data: MedicalHistoryData }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="text-xs">
        {data.age}y/o {data.sex || ""}
      </Badge>
      {data.hasAllergies && (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {data.allergies.length} Allerg{data.allergies.length > 1 ? "ies" : "y"}
        </Badge>
      )}
      {data.currentMedications.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Pill className="h-3 w-3 mr-1" />
          {data.currentMedications.length} Med{data.currentMedications.length > 1 ? "s" : ""}
        </Badge>
      )}
      {data.previousRequests.length > 0 && (
        <Badge variant="outline" className="text-xs">
          <FileText className="h-3 w-3 mr-1" />
          {data.previousRequests.length} prev
        </Badge>
      )}
    </div>
  )
}
