"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { SuccessCheckmark } from "@/components/ui/success-checkmark"
import { ArrowRight, FileText, Pill, Stethoscope, Sparkles } from "lucide-react"
import Link from "next/link"

interface WelcomeCelebrationProps {
  firstName: string
  onDismiss: () => void
}

const quickActions = [
  {
    icon: FileText,
    title: "Medical Certificate",
    description: "Sick leave for work or uni",
    href: "/medical-certificate/request",
    color: "from-[#00E2B5] to-[#00C9A0]",
  },
  {
    icon: Pill,
    title: "Prescription",
    description: "Repeat scripts & reviews",
    href: "/prescriptions/request",
    color: "from-[#06B6D4] to-[#0891B2]",
  },
  {
    icon: Stethoscope,
    title: "Pathology",
    description: "Blood tests & imaging",
    href: "/referrals/pathology-imaging/request",
    color: "from-[#8B5CF6] to-[#7C3AED]",
  },
]

export function WelcomeCelebration({ firstName, onDismiss }: WelcomeCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowConfetti(true), 100)
    const t2 = setTimeout(() => setShowContent(true), 400)
    const t3 = setTimeout(() => setShowActions(true), 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <>
      <Confetti trigger={showConfetti} duration={3000} particleCount={100} />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F1C]/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-[#00E2B5] to-[#06B6D4] px-6 py-8 text-center">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
            <div className="relative">
              <SuccessCheckmark show={showConfetti} size="lg" />
              <h2 
                className={`text-2xl font-bold text-[#0A0F1C] mt-4 transition-all duration-500 ${
                  showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                Welcome to InstantMed, {firstName}! 🎉
              </h2>
              <p 
                className={`text-[#0A0F1C]/70 mt-2 transition-all duration-500 delay-100 ${
                  showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                Your profile is all set. You're ready to get started.
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-6">
            <p 
              className={`text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2 transition-all duration-500 ${
                showActions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#00E2B5]" />
              What would you like to do?
            </p>
            
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={onDismiss}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-border hover:border-[#00E2B5]/30 hover:bg-[#00E2B5]/5 transition-all duration-300 group ${
                    showActions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${200 + index * 100}ms` }}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00E2B5] group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                I'll explore on my own
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
