"use client"

import { Shield, Clock, Star, Users, CheckCircle2 } from "lucide-react"

interface TrustBannerProps {
  variant?: "default" | "compact" | "minimal"
  showRating?: boolean
  showPatients?: boolean
  className?: string
}

export function TrustBanner({ 
  variant = "default", 
  showRating = true, 
  showPatients = true,
  className = "" 
}: TrustBannerProps) {
  if (variant === "minimal") {
    return (
      <div className={`flex items-center justify-center gap-4 text-xs text-muted-foreground ${className}`}>
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5 text-[#00E2B5]" />
          AHPRA registered
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-[#06B6D4]" />
          ~1 hour
        </span>
        {showRating && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
            4.9/5
          </span>
        )}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
          <Shield className="h-3.5 w-3.5 text-[#00E2B5]" />
          <span>AHPRA doctors</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 text-[#06B6D4]" />
          <span>Usually ~1hr</span>
        </div>
        {showRating && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
            <span>4.9/5</span>
          </div>
        )}
        {showPatients && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span>10K+ patients</span>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`rounded-xl border bg-white/50 backdrop-blur-sm p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
        <span className="text-sm font-medium text-foreground">Why 10,000+ Aussies trust InstantMed</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00E2B5]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4 text-[#00E2B5]" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Real doctors</p>
            <p className="text-[10px] text-muted-foreground">AHPRA registered</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-[#06B6D4]" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Fast response</p>
            <p className="text-[10px] text-muted-foreground">Usually ~1 hour</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <Star className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Highly rated</p>
            <p className="text-[10px] text-muted-foreground">4.9/5 (200+ reviews)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-[#8B5CF6]" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Trusted</p>
            <p className="text-[10px] text-muted-foreground">10,000+ patients</p>
          </div>
        </div>
      </div>
    </div>
  )
}
