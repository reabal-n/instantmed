"use client"

import { Building2, Eye, FileText, Info, Pencil } from "lucide-react"
import Link from "next/link"
import { useCallback, useState } from "react"

import type { CertificateDetailsData } from "@/app/actions/certificate-details"
import {
  CertificatePreview,
  generatePreviewData,
} from "@/components/admin/certificate-preview"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
} from "@/components/operator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ABN,
  COMPANY_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
} from "@/lib/constants"
import { ADMIN_CLINIC_HREF, STAFF_SETTINGS_HREF } from "@/lib/dashboard/routes"
import type { ClinicIdentity, TemplateConfig } from "@/types/certificate-template"
import {
  DEFAULT_PREVIEW_SCENARIOS,
  DEFAULT_TEMPLATE_CONFIG,
} from "@/types/certificate-template"

interface CertificateDetailsClientProps {
  initialData: CertificateDetailsData
}

const FALLBACK_CLINIC_IDENTITY: ClinicIdentity = {
  id: "preview",
  clinic_name: COMPANY_NAME,
  trading_name: "InstantMed",
  address_line_1: "Level 1/457-459 Elizabeth Street",
  address_line_2: null,
  suburb: "Surry Hills",
  state: "NSW",
  postcode: "2010",
  abn: ABN,
  phone: CONTACT_PHONE,
  email: CONTACT_EMAIL,
  logo_storage_path: null,
  footer_disclaimer:
    "This medical certificate was issued via InstantMed telehealth services.",
  is_active: true,
  created_at: "",
  updated_at: "",
  created_by: null,
  updated_by: null,
}

function formatAddress(clinic: ClinicIdentity) {
  const firstLine = [clinic.address_line_1, clinic.address_line_2]
    .filter(Boolean)
    .join(", ")
  const suburbLine = [clinic.suburb, clinic.state, clinic.postcode]
    .filter(Boolean)
    .join(" ")

  return [firstLine, suburbLine].filter(Boolean).join(", ")
}

function detailRows(clinic: ClinicIdentity) {
  return [
    { label: "Legal name", value: clinic.clinic_name },
    { label: "Trading name", value: clinic.trading_name || "Not set" },
    { label: "ABN", value: clinic.abn || "Not set" },
    { label: "Address", value: formatAddress(clinic) || "Not set" },
    { label: "Phone", value: clinic.phone || "Not shown" },
    { label: "Email", value: clinic.email || "Not shown" },
  ]
}

export function CertificateDetailsClient({
  initialData,
}: CertificateDetailsClientProps) {
  const activeTemplate = initialData.activeTemplate
  const templateConfig =
    (activeTemplate?.config as TemplateConfig | undefined) ??
    DEFAULT_TEMPLATE_CONFIG
  const clinicIdentity =
    initialData.clinicIdentity ?? FALLBACK_CLINIC_IDENTITY
  const [scenarios, setScenarios] = useState<Record<string, boolean>>(
    Object.fromEntries(
      DEFAULT_PREVIEW_SCENARIOS.map((scenario) => [
        scenario.id,
        scenario.enabled,
      ]),
    ) as Record<string, boolean>,
  )

  const toggleScenario = useCallback((id: string) => {
    setScenarios((current) => ({ ...current, [id]: !current[id] }))
  }, [])

  const previewData = generatePreviewData(scenarios)

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Certificate details"
        description="Read-only certificate preview. Edit legal clinic identity in Clinic setup. Email templates live in Email delivery."
        backHref={STAFF_SETTINGS_HREF}
        actions={
          <Button asChild variant="outline">
            <Link href={ADMIN_CLINIC_HREF}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              Edit clinic details
            </Link>
          </Button>
        }
      />

      <OperatorScrollArea>
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" aria-hidden />
                  Clinic details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <p>
                      These details are pulled from Clinic setup and used when
                      generated certificates are issued.
                    </p>
                  </div>
                </div>
                <dl className="divide-y divide-border/60 text-sm">
                  {detailRows(clinicIdentity).map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[112px_1fr] gap-3 py-2"
                    >
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="min-w-0 break-words text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" aria-hidden />
                  Certificate config
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Active version
                  </span>
                  <span>
                    {activeTemplate ? `v${activeTemplate.version}` : "Default"}
                  </span>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Source
                  </span>
                  <span>Checked-in static PDF</span>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Editing
                  </span>
                  <span>Layout changes stay in code review, not admin UI.</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4 text-primary" aria-hidden />
                  Preview checks
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {DEFAULT_PREVIEW_SCENARIOS.map((scenario) => (
                  <Button
                    key={scenario.id}
                    type="button"
                    variant={scenarios[scenario.id] ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleScenario(scenario.id)}
                  >
                    {scenario.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4 text-primary" aria-hidden />
                  PDF preview
                </CardTitle>
                {activeTemplate ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    Active version: v{activeTemplate.version}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="bg-muted/20 p-4">
              <div className="mx-auto max-w-[720px]">
                <CertificatePreview
                  clinicIdentity={clinicIdentity}
                  config={templateConfig}
                  previewData={previewData}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
