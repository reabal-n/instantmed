import {
  Building2,
  FileText,
  Settings,
  Stethoscope,
  ToggleLeft,
  UserCog,
} from "lucide-react"
import Link from "next/link"
import type { ComponentType } from "react"

import { GoogleAccountLinkCard } from "@/components/account/google-account-link-card"
import { DashboardPageHeader } from "@/components/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth/helpers"
import {
  ADMIN_CERTIFICATE_TEMPLATES_HREF,
  ADMIN_CLINIC_HREF,
  ADMIN_DOCTOR_IDENTITY_HREF,
  ADMIN_DOCTORS_HREF,
  ADMIN_FEATURES_HREF,
  ADMIN_SERVICES_HREF,
  STAFF_SETTINGS_HREF,
} from "@/lib/dashboard/routes"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Clinic Setup | InstantMed",
  description: "Essential clinic, service, and doctor setup for InstantMed admins.",
}

interface SettingsLink {
  label: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
}

const settingsLinks: SettingsLink[] = [
  {
    label: "Clinic profile",
    description: "Provider details, public identity, and clinic contact information.",
    href: ADMIN_CLINIC_HREF,
    icon: Building2,
  },
  {
    label: "Doctor setup",
    description: "Future doctor records, provider numbers, and readiness checks.",
    href: ADMIN_DOCTORS_HREF,
    icon: Stethoscope,
  },
  {
    label: "Your prescribing identity",
    description: "Account security, availability, signature, and Parchment prescribing setup.",
    href: ADMIN_DOCTOR_IDENTITY_HREF,
    icon: UserCog,
  },
  {
    label: "Services",
    description: "Service catalogue, pricing visibility, and request configuration.",
    href: ADMIN_SERVICES_HREF,
    icon: Settings,
  },
  {
    label: "Platform controls",
    description: "Kill switches, capacity controls, and launch gates.",
    href: ADMIN_FEATURES_HREF,
    icon: ToggleLeft,
  },
  {
    label: "Certificate templates",
    description: "Medical certificate layout and template configuration.",
    href: ADMIN_CERTIFICATE_TEMPLATES_HREF,
    icon: FileText,
  },
]

export default async function AdminSettingsPage() {
  await requireRole(["admin"])

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Clinic setup"
        description="The essential setup surfaces for running InstantMed. Incident recovery stays in Ops."
        className="mb-0"
      />

      <div id="account-security" className="scroll-mt-24">
        <Card className="rounded-xl border-border/50">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base">Account access</CardTitle>
            <CardDescription>
              Keep admin login tied to the same InstantMed account across email and Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <GoogleAccountLinkCard
              accountLabel="admin"
              redirectPath={`${STAFF_SETTINGS_HREF}#account-security`}
              className="rounded-xl border border-border/40 bg-white p-4 dark:bg-card"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/50">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Email delivery lives in the email hub. Recovery work lives in Ops.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 px-5 pb-5 md:grid-cols-2">
          {settingsLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 rounded-lg border border-border/40 px-3 py-3 transition-[background-color,border-color] hover:border-primary/30 hover:bg-muted/35"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground group-hover:text-primary">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
