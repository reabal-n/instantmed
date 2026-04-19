"use client"

import {
  Calendar,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react"

import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PatientInfoCard() {
  const { intake, data } = useIntakeReview()

  return (
    <Card>
      <CardHeader className="py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          Patient
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{intake.patient.full_name}</p>
          </div>
          <div className="flex items-start gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Age / DOB</p>
              <p className="font-medium">
                {data.patientAge != null ? `${data.patientAge}y` : "N/A"} ·{" "}
                {intake.patient.date_of_birth
                  ? new Date(intake.patient.date_of_birth).toLocaleDateString("en-AU")
                  : "Not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Medicare</p>
              <p className="font-medium font-mono text-xs">{data.maskedMedicare}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{intake.patient.phone || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-xs truncate">{intake.patient.email || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">
                {[
                  intake.patient.address_line1,
                  intake.patient.suburb,
                  intake.patient.state,
                  intake.patient.postcode,
                ].filter(Boolean).join(", ") || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
