import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientIntakes } from "@/lib/data/intakes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react"
import { formatIntakeStatus } from "@/lib/format-intake"

export const dynamic = "force-dynamic"

export default async function PatientIntakesPage() {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/sign-in")
  }
  
  const intakes = await getPatientIntakes(authUser.profile.id)
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case "declined":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending_info":
        return <AlertCircle className="h-4 w-4 text-dawn-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800"
      case "declined":
        return "bg-red-100 text-red-800"
      case "pending_info":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Your Requests</h1>
          <p className="text-muted-foreground">View and manage your medical requests</p>
        </div>
        <Button asChild>
          <Link href="/services">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {intakes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium mb-2">No requests yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start by selecting a service to get your medical certificate or prescription.
            </p>
            <Button asChild>
              <Link href="/services">Browse Services</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {intakes.map((intake) => {
            const service = intake.service as { name?: string; short_name?: string } | undefined
            return (
              <Link key={intake.id} href={`/patient/intakes/${intake.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {service?.name || service?.short_name || "Request"}
                      </CardTitle>
                      <Badge className={getStatusColor(intake.status)}>
                        {getStatusIcon(intake.status)}
                        <span className="ml-1">{formatIntakeStatus(intake.status)}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Ref: {intake.id.slice(0, 8).toUpperCase()}</span>
                      <span>
                        {new Date(intake.created_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
