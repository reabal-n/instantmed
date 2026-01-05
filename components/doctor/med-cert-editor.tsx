"use client"

import { useState, useTransition, useEffect } from "react"
import { Button, Input } from "@/components/uix"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileText, Save, Eye, CheckCircle, Loader2, AlertTriangle } from "lucide-react"
import { getOrCreateMedCertDraft, saveMedCertDraft, issueMedCertificate } from "@/app/doctor/actions/med-cert"
import type { RequestWithDetails, MedCertDraft } from "@/types/db"

interface MedCertEditorProps {
  request: RequestWithDetails
  existingDraft?: MedCertDraft
}

type DraftForm = Partial<MedCertDraft>

export function MedCertEditor({ request, existingDraft }: MedCertEditorProps) {
  const [draft, setDraft] = useState<DraftForm | null>(() => {
    // Initialize from existingDraft or start as null to trigger load
    return existingDraft || null
  })
  const [loading, setLoading] = useState(!existingDraft)
  const [isSaving, startSave] = useTransition()
  const [isIssuing, startIssue] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showIssueDialog, setShowIssueDialog] = useState(false)

  // Load draft on first render if not provided
  useEffect(() => {
    if (loading && !draft) {
      const mounted = { current: true }
      getOrCreateMedCertDraft(request.id).then((result: { success: boolean; data?: MedCertDraft; error?: string }) => {
        if (mounted.current) {
          if (result.success && result.data) {
            setDraft(result.data)
          } else {
            setMessage({ type: "error", text: result.error || "Failed to load draft" })
          }
          setLoading(false)
        }
      })
      return () => {
        mounted.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, request.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading draft...</span>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <AlertTriangle className="mb-2 inline h-4 w-4" />
        <p>Failed to load medical certificate draft. Please try again.</p>
      </div>
    )
  }

  const handleSaveDraft = () => {
    if (!draft.id) return
    startSave(async () => {
      const result = await saveMedCertDraft(draft.id as string, draft)
      if (result.success) {
        setMessage({ type: "success", text: "Draft saved" })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save draft" })
      }
    })
  }

  const handlePreviewPdf = async () => {
    // Generate a preview PDF URL
    try {
      const response = await fetch("/api/med-cert/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftData: draft,
        }),
      })

      if (response.ok) {
        const data = await response.json() as { url?: string }
        if (data.url) {
          window.open(data.url, "_blank")
        }
      } else {
        setMessage({ type: "error", text: "Failed to generate preview" })
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Failed to generate preview" })
    }
  }

  const handleIssueCertificate = () => {
    // Validate fields first
    const requiredFields: (keyof DraftForm)[] = [
      "patient_full_name",
      "patient_dob",
      "date_from",
      "date_to",
      "reason_summary",
    ]
    const missingFields = requiredFields.filter(
      (field) => !draft[field]
    )

    if (missingFields.length > 0) {
      setMessage({
        type: "error",
        text: `Missing required fields: ${missingFields.join(", ")}`,
      })
      return
    }

    if (draft.date_from && draft.date_to && new Date(draft.date_from) > new Date(draft.date_to)) {
      setMessage({ type: "error", text: "Date from must be before date to" })
      return
    }

    setShowIssueDialog(true)
  }

  const confirmIssueCertificate = () => {
    if (!draft.id) return
    startIssue(async () => {
      const result = await issueMedCertificate(request.id, draft.id as string)
      if (result.success) {
        setMessage({
          type: "success",
          text: "Certificate issued successfully",
        })
        setShowIssueDialog(false)
        // Refresh page after 1 second
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to issue certificate" })
      }
    })
  }

  return (
    <div className="space-y-6 rounded-lg border bg-white p-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Medical Certificate</h3>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Patient Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Patient Information</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Full Name
            </label>
            <Input
              type="text"
              value={draft.patient_full_name ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, patient_full_name: e.target.value })
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <Input
              type="date"
              value={draft.patient_dob ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, patient_dob: e.target.value })
              }
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Certificate Details */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Certificate Details</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificate Type
            </label>
            <Select
              value={draft.certificate_type ?? ""}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  certificate_type: value as "work" | "uni" | "carer",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="uni">Study</SelectItem>
                <SelectItem value="carer">Carer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <Input
              type="date"
              value={draft.date_from ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, date_from: e.target.value })
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <Input
              type="date"
              value={draft.date_to ?? ""}
              onChange={(e) => setDraft({ ...draft, date_to: e.target.value })}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason Summary
          </label>
          <Textarea
            value={draft.reason_summary ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, reason_summary: e.target.value })
            }
            placeholder="E.g., Acute gastroenteritis, advised rest and hydration"
            rows={3}
            className="w-full"
          />
        </div>
      </div>

      {/* Doctor Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Doctor Information</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doctor Typed Name
            </label>
            <Input
              type="text"
              value={draft.doctor_typed_name ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, doctor_typed_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AHPRA Registration Number
            </label>
            <Input
              type="text"
              value={draft.doctor_ahpra ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, doctor_ahpra: e.target.value })
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Signature Asset URL (optional)
          </label>
          <Input
            type="text"
            value={draft.signature_asset_url ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, signature_asset_url: e.target.value })
            }
            placeholder={`${process.env.NEXT_PUBLIC_APP_URL}/images/signature.png`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to use default signature
          </p>
        </div>
      </div>

      {/* Provider Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Provider Information</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider Name
          </label>
          <Input
            type="text"
            value={draft.provider_name ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, provider_name: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider Address
          </label>
          <Textarea
            value={draft.provider_address ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, provider_address: e.target.value })
            }
            rows={2}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleSaveDraft}
          disabled={isSaving}
          variant="outline"
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Draft
        </Button>

        <Button
          onClick={handlePreviewPdf}
          variant="outline"
          className="gap-2"
          disabled={isSaving || isIssuing}
        >
          <Eye className="h-4 w-4" />
          Preview PDF
        </Button>

        <Button
          onClick={handleIssueCertificate}
          disabled={isIssuing || isSaving}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          {isIssuing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Issue Certificate
        </Button>
      </div>

      {/* Issue Confirmation Dialog */}
      <AlertDialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Medical Certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate the PDF, save it to storage, and mark the request as approved.
              This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmIssueCertificate}
              disabled={isIssuing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isIssuing ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                  Issuing...
                </>
              ) : (
                "Issue Certificate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
