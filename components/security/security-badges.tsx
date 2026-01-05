"use client"

import { Shield, Lock, CheckCircle2, FileText, Server } from "lucide-react"

const securityCerts = [
  {
    icon: Shield,
    label: "AES-256",
    sublabel: "Encryption",
    color: "#2563EB",
  },
  {
    icon: Lock,
    label: "Australian",
    sublabel: "Privacy Act",
    color: "#4f46e5",
  },
  {
    icon: Server,
    label: "AU Servers",
    sublabel: "Only",
    color: "#4f46e5",
  },
  {
    icon: FileText,
    label: "AHPRA",
    sublabel: "Registered",
    color: "#F59E0B",
  },
  {
    icon: CheckCircle2,
    label: "ISO 27001",
    sublabel: "Compliant",
    color: "#EC4899",
  },
]

export function SecurityBadges() {
  return (
    <div className="flex flex-wrap gap-4 justify-center items-center">
      {securityCerts.map((cert) => (
        <div
          key={cert.label}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-xl border border-white/10 bg-white/5 dark:bg-black/20 hover:bg-white/10 dark:hover:bg-black/30 transition-all duration-300"
        >
          <div
            className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center backdrop-blur-xl"
            style={{
              background: `linear-gradient(135deg, ${cert.color}20, ${cert.color}10)`,
              border: `1px solid ${cert.color}30`,
            }}
          >
            <cert.icon className="h-5 w-5" style={{ color: cert.color }} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-foreground leading-none">{cert.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{cert.sublabel}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SecurityBadgesCompact() {
  return (
    <div className="flex flex-wrap gap-3 justify-center items-center">
      {securityCerts.map((cert) => (
        <div
          key={cert.label}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 dark:bg-black/20 text-xs"
        >
          <cert.icon className="h-3.5 w-3.5" style={{ color: cert.color }} />
          <span className="text-foreground font-medium">{cert.label}</span>
        </div>
      ))}
    </div>
  )
}
