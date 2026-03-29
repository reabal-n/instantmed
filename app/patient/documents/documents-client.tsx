"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Download,
  Receipt,
  Calendar,
  ChevronRight,
  FolderOpen,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"
import { EmptyState } from "@/components/ui/empty-state"
import { PatientErrorAlert } from "@/components/patient/error-alert"

interface Certificate {
  id: string
  type: "certificate"
  serviceType: string
  serviceName: string
  url: string | null
  generatedAt: string
}

interface ReceiptDoc {
  id: string
  type: "receipt"
  serviceType: string | null
  serviceName: string
  amount: number | null
  paidAt: string
  stripeSessionId: string | null
}

interface DocumentsClientProps {
  documents: {
    certificates: Certificate[]
    receipts: ReceiptDoc[]
  }
  error?: string | null
}


export function DocumentsClient({ documents, error }: DocumentsClientProps) {
  const { certificates, receipts } = documents
  const totalDocs = certificates.length + receipts.length
  const [activeTab, setActiveTab] = useState("certificates")

  return (
      <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
              <p className="text-muted-foreground mt-1">
                {totalDocs} document{totalDocs !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          {/* Error State */}
          {error && <PatientErrorAlert error={error} className="mb-6" />}

          {totalDocs === 0 && !error ? (
            <EmptyState
              icon={FolderOpen}
              title="No documents yet"
              description="Once you complete a request and it's approved, your documents will appear here."
              action={{ label: "Start a request", href: "/request" }}
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="certificates" className="flex-1">
                  <FileText className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
                  Certificates ({certificates.length})
                </TabsTrigger>
                <TabsTrigger value="receipts" className="flex-1">
                  <Receipt className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
                  Receipts ({receipts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="certificates" className="mt-0 space-y-3">
                {certificates.length === 0 ? (
                  <Card className="rounded-xl border-border/50">
                    <CardContent className="py-6 px-4 text-center text-muted-foreground">
                      No certificates available yet.
                    </CardContent>
                  </Card>
                ) : (
                  certificates.map((cert) => (
                    <Card key={cert.id} className="rounded-xl border-border/50 hover:border-primary/50 hover:shadow-sm transition-all">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-info-light flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-info" />
                          </div>
                          <div>
                            <p className="font-medium">{cert.serviceName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(cert.generatedAt)}
                            </div>
                          </div>
                        </div>
                        {cert.url ? (
                          <Button variant="outline" size="sm" asChild>
                            <a href={cert.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="outline">Processing</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="receipts" className="mt-0 space-y-3">
                {receipts.length === 0 ? (
                  <Card className="rounded-xl border-border/50">
                    <CardContent className="py-6 px-4 text-center text-muted-foreground">
                      No receipts available yet.
                    </CardContent>
                  </Card>
                ) : (
                  receipts.map((receipt) => (
                    <Card key={receipt.id} className="rounded-xl border-border/50 hover:border-primary/50 hover:shadow-sm transition-all">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-success-light/40 flex items-center justify-center shrink-0">
                            <Receipt className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">{receipt.serviceName}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{receipt.amount ? formatCurrency(receipt.amount) : "-"}</span>
                              <span>•</span>
                              <span>
                                {formatDate(receipt.paidAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {receipt.stripeSessionId && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/patient/intakes/${receipt.id}`}>
                              <ChevronRight className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
  )
}
