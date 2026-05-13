import {
  Building2,
  FileText,
  Mail,
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
import { ADMIN_DOCTOR_IDENTITY_HREF } from "@/lib/dashboard/routes"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin Settings | InstantMed",
  description: "Configuration surfaces for InstantMed admins.",
}

interface SettingsLink {
  label: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
}

interface SettingsGroup {
  title: string
  description: string
  links: SettingsLink[]
}

const settingsGroups: SettingsGroup[] = [
  {
    title: "Clinical setup",
    description: "The small set of controls that shape how requests are reviewed and fulfilled.",
    links: [
      {
        label: "Clinic identity",
        description: "Provider details, clinic profile, and public-facing identity.",
        href: "/admin/clinic",
        icon: Building2,
      },
      {
        label: "Doctors",
        description: "Doctor records, provider numbers, and operational availability.",
        href: "/admin/doctors",
        icon: Stethoscope,
      },
      {
        label: "Your doctor identity",
        description: "Account security, availability, signature, and Parchment prescribing setup.",
        href: ADMIN_DOCTOR_IDENTITY_HREF,
        icon: UserCog,
      },
      {
        label: "Services",
        description: "Service catalogue, pricing visibility, and request configuration.",
        href: "/admin/services",
        icon: Settings,
      },
      {
        label: "Feature flags",
        description: "Roll out operational features deliberately.",
        href: "/admin/features",
        icon: ToggleLeft,
      },
    ],
  },
  {
    title: "Communications",
    description: "Template controls for patient-facing communication.",
    links: [
      {
        label: "Email templates",
        description: "Transactional email templates and copy.",
        href: "/admin/emails",
        icon: Mail,
      },
      {
        label: "Certificate templates",
        description: "Medical certificate layout and template configuration.",
        href: "/admin/settings/templates",
        icon: FileText,
      },
    ],
  },
]

export default async function AdminSettingsPage() {
  await requireRole(["admin"], { redirectTo: "/admin" })

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Admin Settings"
        description="Clinic, service, doctor, and template configuration."
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
              redirectPath="/admin/settings#account-security"
              className="rounded-xl border border-border/40 bg-white p-4 dark:bg-card"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {settingsGroups.map((group) => (
          <Card key={group.title} className="rounded-xl border-border/50">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5">
              {group.links.map((item) => (
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
        ))}
      </div>
    </div>
  )
}
