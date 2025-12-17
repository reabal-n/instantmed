import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  Shield,
  ArrowRight 
} from "lucide-react"

// Admin emails that have access
const ADMIN_EMAILS = [
  "me@reabal.ai",
  "admin@instantmed.com.au",
]

export default async function AdminDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login?redirect=/admin")
  }

  // Get user email from auth user
  const userEmail = authUser.user.email?.toLowerCase() || ""
  
  // Check if user is admin by email or role
  const isAdmin = 
    ADMIN_EMAILS.includes(userEmail) ||
    authUser.profile.role === "admin" ||
    authUser.profile.role === "doctor"

  if (!isAdmin) {
    redirect("/patient")
  }

  const firstName = authUser.profile.full_name?.split(" ")[0] || "Admin"

  const adminLinks = [
    {
      title: "Doctor Queue",
      description: "Review and process patient requests",
      href: "/doctor",
      icon: FileText,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Patient Management",
      description: "View and manage patient profiles",
      href: "/doctor/patients",
      icon: Users,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      title: "Analytics",
      description: "View platform statistics and metrics",
      href: "/doctor/analytics",
      icon: BarChart3,
      color: "bg-violet-500/10 text-violet-500",
    },
    {
      title: "Settings",
      description: "Configure platform settings",
      href: "/doctor/settings",
      icon: Settings,
      color: "bg-amber-500/10 text-amber-500",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-premium-mesh">
      <Navbar variant="doctor" userName={authUser.profile.full_name} />
      
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground">
              Welcome back, {firstName}. Manage the InstantMed platform.
            </p>
          </div>

          {/* Admin Links Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center mb-4`}>
                  <link.icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{link.description}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-8 glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4">Quick Access</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/doctor"
                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Go to Doctor Queue →
              </Link>
              <Link
                href="/admin/bootstrap"
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Bootstrap Tools
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
