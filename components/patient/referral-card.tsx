"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Gift, Copy, Check, Users, DollarSign } from "@/lib/icons"
import { toast } from "sonner"

interface ReferralStats {
  referralCode: string
  creditBalance: number
  totalReferrals: number
  completedReferrals: number
}

export function ReferralCard({ patientId }: { patientId: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReferralData() {
      try {
        const res = await fetch(`/api/patient/referral?patientId=${patientId}`)
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchReferralData()
  }, [patientId])

  const copyLink = async () => {
    if (!stats) return
    const link = `${window.location.origin}?ref=${stats.referralCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success("Link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-8 bg-muted rounded w-2/3" />
      </div>
    )
  }

  if (!stats) return null

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}?ref=${stats.referralCode}`

  return (
    <div className="rounded-xl border bg-linear-to-br from-primary/5 to-primary/10 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Gift className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Give $5, Get $5</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        Share your link with friends. When they complete their first request, you both get $5 credit.
      </p>

      {/* Referral link */}
      <div className="flex gap-2 mb-5">
        <Input readOnly value={referralLink} className="text-sm bg-background/50" />
        <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0 bg-transparent" aria-label="Copy referral link">
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-background/60 p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Credit balance</span>
          </div>
          <p className="text-xl font-semibold text-foreground">${(stats.creditBalance / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-background/60 p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Friends referred</span>
          </div>
          <p className="text-xl font-semibold text-foreground">{stats.completedReferrals}</p>
        </div>
      </div>
    </div>
  )
}
