import Link from "next/link"
import { ArrowRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PRICING } from "@/lib/constants"

interface BlogCTACardProps {
  service?: "med-cert" | "prescription" | "consult"
  className?: string
}

const SERVICE_CONFIG = {
  "med-cert": {
    title: "Need a medical certificate?",
    description: "Reviewed by an AHPRA-registered doctor and delivered to your inbox. No appointment needed.",
    href: "/medical-certificate",
    price: PRICING.MED_CERT,
    buttonText: "Get your certificate",
  },
  prescription: {
    title: "Need a repeat prescription?",
    description: "Request a repeat script online. Reviewed by a real doctor, eScript sent to your phone.",
    href: "/prescriptions",
    price: PRICING.REPEAT_SCRIPT,
    buttonText: "Get your script",
  },
  consult: {
    title: "Need to see a doctor?",
    description: "General consults reviewed by AHPRA-registered GPs. No video call required.",
    href: "/general-consult",
    price: PRICING.CONSULT,
    buttonText: "Start your consult",
  },
}

export function BlogCTACard({ service = "med-cert", className }: BlogCTACardProps) {
  const config = SERVICE_CONFIG[service]

  return (
    <div className={cn(
      "rounded-2xl bg-primary/5 border border-primary/15 p-6 sm:p-8 my-10",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground mb-1">
            {config.title}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.description}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
          <Button asChild size="sm">
            <Link href={config.href}>
              {config.buttonText}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            From ${config.price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
