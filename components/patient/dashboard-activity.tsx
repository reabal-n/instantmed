"use client"

import { Calendar, Clock, FileText, Pill } from "lucide-react"
import Link from "next/link"
import type { MouseEvent } from "react"

import { DashboardSection } from "@/components/dashboard/dashboard-section"
import { IntakeCard } from "@/components/patient/intake-card"
import type { Intake } from "@/components/patient/intake-types"
import { Button } from "@/components/ui/button"
import {
  buildPatientIntakeHref,
  PATIENT_INTAKES_HREF,
  PATIENT_PRESCRIPTIONS_HREF,
  REQUEST_REPEAT_SCRIPT_HREF,
} from "@/lib/dashboard/routes"
import { formatDate } from "@/lib/format"

interface Prescription {
  id: string
  medication_name: string
  dosage_instructions: string
  issued_date: string
  expiry_date: string
  status: "active" | "expired"
}

interface DashboardActivityProps {
  intakes: Intake[]
  prescriptions: Prescription[]
  onViewIntake: (event: MouseEvent<HTMLAnchorElement>, intake: Intake) => void
}

export function DashboardActivity({
  intakes,
  prescriptions,
  onViewIntake,
}: DashboardActivityProps) {
  const activePrescriptions = prescriptions.filter(
    (prescription) => prescription.status === "active",
  )

  return (
    <>
      {intakes.length > 0 ? (
        <DashboardSection
          title="Recent requests"
          viewAllHref={intakes.length > 5 ? PATIENT_INTAKES_HREF : undefined}
        >
          <div className="space-y-4">
            {intakes.slice(0, 5).map((intake) => (
              <div key={intake.id}>
                <IntakeCard
                  intake={intake}
                  href={buildPatientIntakeHref(intake.id)}
                  onClick={(event) => onViewIntake(event, intake)}
                />
              </div>
            ))}
          </div>
        </DashboardSection>
      ) : (
        <DashboardSection title="Recent requests">
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-8 text-center">
            <FileText className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              When you submit a request, it&apos;ll show up here.
            </p>
          </div>
        </DashboardSection>
      )}

      {activePrescriptions.length > 0 ? (
        <DashboardSection
          title="Active prescriptions"
          viewAllHref={
            activePrescriptions.length > 3
              ? PATIENT_PRESCRIPTIONS_HREF
              : undefined
          }
        >
          <div className="space-y-4">
            {activePrescriptions.slice(0, 3).map((prescription) => (
              <div
                key={prescription.id}
                className="rounded-xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[transform,box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">
                      {prescription.medication_name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {prescription.dosage_instructions}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Issued {formatDate(prescription.issued_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Renews {formatDate(prescription.expiry_date)}
                      </span>
                    </div>
                  </div>
                  <Link href={REQUEST_REPEAT_SCRIPT_HREF} className="shrink-0">
                    <Button variant="outline" size="sm">
                      <Pill className="mr-2 h-4 w-4" />
                      Renew
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      ) : null}
    </>
  )
}
