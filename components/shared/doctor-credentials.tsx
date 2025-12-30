"use client"

import Image from "next/image"
import {
  Shield,
  CheckCircle2,
  Award,
  GraduationCap,
  ExternalLink,
  Star,
  Clock,
  BadgeCheck,
  Stethoscope,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DoctorCredentials {
  id: string
  name: string
  title: string // e.g., "Dr."
  suffix?: string // e.g., "MBBS, FRACGP"
  photoUrl?: string
  ahpraNumber: string
  specialties: string[]
  yearsExperience: number
  university?: string
  rating?: number
  reviewCount?: number
  bio?: string
  languages?: string[]
  location?: string
}

interface DoctorCredentialsCardProps {
  doctor: DoctorCredentials
  variant?: "compact" | "full" | "inline"
  showVerifyLink?: boolean
  className?: string
}

/**
 * Doctor credentials display component
 * Best practice from Doctors on Demand / Abby Health
 * Shows AHPRA verification, credentials, and builds patient trust
 */
export function DoctorCredentialsCard({
  doctor,
  variant = "compact",
  showVerifyLink = true,
  className,
}: DoctorCredentialsCardProps) {
  const ahpraVerifyUrl = `https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx?q=${encodeURIComponent(doctor.ahpraNumber)}`

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          {doctor.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt={doctor.name}
              fill
              className="object-cover"
            />
          ) : (
            <Stethoscope className="h-4 w-4 text-white" />
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {doctor.title} {doctor.name}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="h-3 w-3 text-blue-500" />
            AHPRA Verified
          </div>
        </div>
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border bg-white dark:bg-gray-900 p-4 flex items-start gap-4",
          className
        )}
      >
        {/* Photo */}
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-linear-to-br from-blue-500 to-cyan-500 shrink-0 flex items-center justify-center">
          {doctor.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt={doctor.name}
              fill
              className="object-cover"
            />
          ) : (
            <Stethoscope className="h-7 w-7 text-white" />
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold">
                {doctor.title} {doctor.name}
              </h4>
              {doctor.suffix && (
                <p className="text-xs text-muted-foreground">{doctor.suffix}</p>
              )}
            </div>
            {doctor.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{doctor.rating}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-600" />
              AHPRA Registered
            </Badge>
            <Badge variant="outline" className="text-xs">
              {doctor.yearsExperience}+ years
            </Badge>
          </div>

          {showVerifyLink && (
            <a
              href={ahpraVerifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              Verify credentials
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    )
  }

  // Full variant - with dialog
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "rounded-2xl border bg-white dark:bg-gray-900 p-5 text-left hover:border-primary/50 transition-colors w-full",
            className
          )}
        >
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-linear-to-br from-blue-500 to-cyan-500 shrink-0 flex items-center justify-center">
              {doctor.photoUrl ? (
                <Image
                  src={doctor.photoUrl}
                  alt={doctor.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Stethoscope className="h-10 w-10 text-white" />
              )}
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-lg">
                {doctor.title} {doctor.name}
              </h4>
              {doctor.suffix && (
                <p className="text-sm text-muted-foreground">{doctor.suffix}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <Shield className="h-3 w-3 mr-1" />
                  AHPRA Verified
                </Badge>
                {doctor.rating && (
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                    {doctor.rating} ({doctor.reviewCount} reviews)
                  </Badge>
                )}
              </div>

              {doctor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {doctor.specialties.slice(0, 3).map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              {doctor.photoUrl ? (
                <Image
                  src={doctor.photoUrl}
                  alt={doctor.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Stethoscope className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <span>
                {doctor.title} {doctor.name}
              </span>
              {doctor.suffix && (
                <p className="text-sm font-normal text-muted-foreground">
                  {doctor.suffix}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Verification badge */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <Shield className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                AHPRA Registered Medical Practitioner
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Registration: {doctor.ahpraNumber}
              </p>
            </div>
            <a
              href={ahpraVerifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
            >
              Verify
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{doctor.yearsExperience}+</p>
              <p className="text-xs text-muted-foreground">Years exp.</p>
            </div>
            {doctor.rating && (
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Star className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-lg font-bold">{doctor.rating}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
            )}
            {doctor.reviewCount && (
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Award className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{doctor.reviewCount}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            )}
          </div>

          {/* Education */}
          {doctor.university && (
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Education</p>
                <p className="text-sm text-muted-foreground">{doctor.university}</p>
              </div>
            </div>
          )}

          {/* Specialties */}
          {doctor.specialties.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Specialties</p>
              <div className="flex flex-wrap gap-2">
                {doctor.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {doctor.bio && (
            <div>
              <p className="text-sm font-medium mb-2">About</p>
              <p className="text-sm text-muted-foreground">{doctor.bio}</p>
            </div>
          )}

          {/* Languages */}
          {doctor.languages && doctor.languages.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Languages:</span>
              {doctor.languages.join(", ")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Trust badge strip for checkout / landing pages
 */
export function TrustBadgeStrip({ className }: { className?: string }) {
  const badges = [
    { icon: Shield, label: "AHPRA Registered", color: "text-green-600" },
    { icon: CheckCircle2, label: "Australian Doctors", color: "text-blue-600" },
    { icon: Clock, label: "15 Min Response", color: "text-purple-600" },
    { icon: Award, label: "4.9★ Rating", color: "text-amber-600" },
  ]

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
      {badges.map(({ icon: Icon, label, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-sm">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
