"use client"

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
  ExternalLink,
  FolderOpen,
  ArrowLeft,
} from "lucide-react"

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
  serviceType: string
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
}


function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100)
}

export function DocumentsClient({ documents }: DocumentsClientProps) {
  const { certificates, receipts } = documents
  const totalDocs = certificates.length + receipts.length

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/patient">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
              <p className="text-sm text-muted-foreground">
                {totalDocs} document{totalDocs !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          {totalDocs === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  Once you complete a request and it&apos;s approved, your documents will appear here.
                </p>
                <Button asChild>
                  <Link href="/request">Start a request</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="certificates" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="certificates" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Certificates ({certificates.length})
                </TabsTrigger>
                <TabsTrigger value="receipts" className="gap-2">
                  <Receipt className="h-4 w-4" />
                  Receipts ({receipts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="certificates" className="space-y-3">
                {certificates.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No certificates available yet.
                    </CardContent>
                  </Card>
                ) : (
                  certificates.map((cert) => (
                    <Card key={cert.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-blue-50">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{cert.serviceName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(cert.generatedAt).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
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

              <TabsContent value="receipts" className="space-y-3">
                {receipts.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No receipts available yet.
                    </CardContent>
                  </Card>
                ) : (
                  receipts.map((receipt) => (
                    <Card key={receipt.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-emerald-50">
                            <Receipt className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">{receipt.serviceName}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{receipt.amount ? formatCurrency(receipt.amount) : "-"}</span>
                              <span>•</span>
                              <span>
                                {new Date(receipt.paidAt).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {receipt.stripeSessionId && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`https://dashboard.stripe.com/payments/${receipt.stripeSessionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </a>
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
    </div>
  )
}
