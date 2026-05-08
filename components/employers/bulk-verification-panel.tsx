"use client"

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { capture } from "@/lib/analytics/capture"
import { normalizeVerificationCode } from "@/lib/utils/code-normalization"

interface BulkVerifyResult {
  code: string
  valid: boolean
  status?: string
  message?: string
  error?: string
  certificate?: {
    certificateNumber: string | null
    type: string
    issueDate?: string
    validFrom?: string | null
    validTo?: string | null
    patientName: string
    issuingClinic: string
    issuingDoctor: string
  }
}

interface BulkVerifyResponse {
  error?: string
  results?: BulkVerifyResult[]
  summary?: {
    invalid: number
    total: number
    valid: number
  }
}

const EXAMPLE_CODES = "IM-WORK-20260101-04827391\nMC-2026-A1B2C3D4"

function extractCodes(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,;\s]+/)
        .map((item) => normalizeVerificationCode(item))
        .filter(Boolean),
    ),
  )
}

function formatDate(value?: string | null): string {
  if (!value) return "Not shown"
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function BulkVerificationPanel() {
  const [codes, setCodes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<BulkVerifyResult[]>([])

  const parsedCodes = useMemo(() => extractCodes(codes), [codes])
  const validCount = results.filter((result) => result.valid).length

  const handleVerify = async () => {
    setError(null)
    setResults([])

    if (parsedCodes.length === 0) {
      setError("Paste at least one certificate code.")
      return
    }

    if (parsedCodes.length > 25) {
      setError("Verify up to 25 certificate codes at a time.")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/employer/verify-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: parsedCodes }),
      })
      const payload = (await response.json()) as BulkVerifyResponse

      if (!response.ok) {
        setError(payload.error || "Bulk verification failed.")
        capture("employer_bulk_verify_failed", { count: parsedCodes.length })
        return
      }

      setResults(payload.results || [])
      capture("employer_bulk_verified", {
        count: payload.summary?.total || parsedCodes.length,
        valid: payload.summary?.valid || 0,
      })
    } catch {
      setError("Verification is unavailable right now. Try again in a moment.")
      capture("employer_bulk_verify_failed", {
        count: parsedCodes.length,
        network: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      id="bulk-verifier"
      className="rounded-2xl border border-border/60 bg-white p-5 shadow-md shadow-primary/[0.05] dark:bg-card dark:shadow-none sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Bulk certificate check
            </h2>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Paste certificate references or verification codes. We return only
            the details needed to compare the document in front of you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" shape="pill">
            Max 25
          </Badge>
          <Badge variant="outline" shape="pill">
            No diagnosis shown
          </Badge>
          <Badge variant="outline" shape="pill">
            Masked patient name
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <Textarea
            value={codes}
            onValueChange={setCodes}
            minRows={7}
            placeholder={EXAMPLE_CODES}
            className="font-mono text-sm"
            aria-label="Certificate codes"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {parsedCodes.length} code{parsedCodes.length === 1 ? "" : "s"} ready
            </p>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || parsedCodes.length === 0}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Search className="h-4 w-4" aria-hidden />
              )}
              Verify codes
            </Button>
          </div>
          {error && (
            <div className="flex gap-2 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/25 p-4 dark:bg-white/[0.04]">
          {results.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <ShieldCheck className="h-9 w-9 text-muted-foreground/50" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">
                Results appear here
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Verification confirms InstantMed issuance. It does not decide
                workplace entitlement or override your internal policy.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {validCount}/{results.length} verified
                </p>
                <Badge variant={validCount === results.length ? "success" : "warning"} size="sm">
                  Privacy-limited
                </Badge>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {results.map((result) => (
                  <div
                    key={result.code}
                    className="rounded-lg border border-border/60 bg-white px-3 py-3 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none"
                  >
                    <div className="flex items-start gap-3">
                      {result.valid ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs font-medium text-foreground">
                            {result.code}
                          </p>
                          <Badge variant={result.valid ? "success" : "outline"} size="sm">
                            {result.valid ? "Verified" : result.status || "Not verified"}
                          </Badge>
                        </div>
                        {result.valid && result.certificate ? (
                          <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <div>
                              <dt className="font-medium text-foreground">Patient</dt>
                              <dd>{result.certificate.patientName}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground">Type</dt>
                              <dd>{result.certificate.type}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground">Issued</dt>
                              <dd>{formatDate(result.certificate.issueDate)}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground">Period</dt>
                              <dd>
                                {formatDate(result.certificate.validFrom)} to{" "}
                                {formatDate(result.certificate.validTo)}
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {result.message || result.error || "This code did not match an active InstantMed certificate."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
