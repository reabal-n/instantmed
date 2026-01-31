"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mail,
  Edit,
  Eye,
  Send,
  BarChart3,
  Settings,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Download,
  RefreshCw,
  MailOpen,
  MailCheck,
  Archive,
  Trash2,
  Plus,
  Zap,
  Database,
  Activity,
} from "lucide-react"
import { toast } from "sonner"

// Quick stats for email hub
const emailStats = {
  totalTemplates: 12,
  activeTemplates: 8,
  emailsSentToday: 342,
  emailsSentWeek: 2156,
  deliveryRate: 98.7,
  pendingQueue: 23,
  failedEmails: 5,
}

// Recent email activity
const recentActivity = [
  {
    id: "1",
    type: "sent",
    template: "Medical Certificate - Patient",
    recipient: "john.smith@email.com",
    status: "delivered",
    time: "2 mins ago",
    intakeId: "req_123456",
  },
  {
    id: "2",
    type: "failed",
    template: "Welcome Email",
    recipient: "sarah.jones@email.com",
    status: "failed",
    time: "5 mins ago",
    error: "Invalid email address",
  },
  {
    id: "3",
    type: "sent",
    template: "Medical Certificate - Employer",
    recipient: "hr@company.com",
    status: "pending",
    time: "8 mins ago",
    intakeId: "req_123457",
  },
  {
    id: "4",
    type: "sent",
    template: "Script Sent",
    recipient: "mike.wilson@email.com",
    status: "delivered",
    time: "15 mins ago",
    intakeId: "req_123458",
  },
]

export function EmailHubClient() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central management for all email templates, sending, and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent Today</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats.emailsSentToday.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats.deliveryRate}%</div>
                <p className="text-xs text-muted-foreground">
                  -0.3% from last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats.pendingQueue}</div>
                <p className="text-xs text-muted-foreground">
                  8 critical
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats.failedEmails}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Edit and manage email templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {emailStats.activeTemplates} of {emailStats.totalTemplates} active
                    </span>
                    <Badge variant="secondary">Manage</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails/preview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview & Test
                  </CardTitle>
                  <CardDescription>
                    Preview templates and send test emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Live preview available
                    </span>
                    <Badge variant="secondary">Test</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/email-queue">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Email Queue
                  </CardTitle>
                  <CardDescription>
                    Monitor email sending queue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {emailStats.pendingQueue} pending
                    </span>
                    <Badge variant="secondary">Monitor</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails/analytics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Email Analytics
                  </CardTitle>
                  <CardDescription>
                    View email performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {emailStats.emailsSentWeek} sent this week
                    </span>
                    <Badge variant="secondary">Analyze</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/ops/email-outbox">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MailOpen className="h-5 w-5" />
                    Email Outbox
                  </CardTitle>
                  <CardDescription>
                    View sent email history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Full email log
                    </span>
                    <Badge variant="secondary">History</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/settings/templates">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Template Settings
                  </CardTitle>
                  <CardDescription>
                    Configure email settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      SMTP & delivery settings
                    </span>
                    <Badge variant="secondary">Configure</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Email Activity
              </CardTitle>
              <CardDescription>
                Latest email sending activity and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        activity.status === 'delivered' ? 'bg-green-100' :
                        activity.status === 'failed' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {activity.status === 'delivered' ? (
                          <MailCheck className="h-4 w-4 text-green-600" />
                        ) : activity.status === 'failed' ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.template}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.recipient} • {activity.time}
                        </p>
                        {activity.error && (
                          <p className="text-xs text-red-600 mt-1">{activity.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.intakeId && (
                        <Badge variant="outline" className="text-xs">
                          {activity.intakeId}
                        </Badge>
                      )}
                      <Badge 
                        variant={
                          activity.status === 'delivered' ? 'default' :
                          activity.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates Management</CardTitle>
              <CardDescription>
                Edit, preview, and manage all email templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Template Management</h3>
                <p className="text-muted-foreground mb-4">
                  Full template management interface
                </p>
                <Link href="/admin/emails">
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Templates
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Queue Status</CardTitle>
              <CardDescription>
                Monitor email sending queue and delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Queue Management</h3>
                <p className="text-muted-foreground mb-4">
                  Monitor email queue and outbox
                </p>
                <div className="flex gap-2 justify-center">
                  <Link href="/admin/email-queue">
                    <Button variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Queue Status
                    </Button>
                  </Link>
                  <Link href="/admin/ops/email-outbox">
                    <Button variant="outline">
                      <MailOpen className="h-4 w-4 mr-2" />
                      Email Outbox
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Analytics</CardTitle>
              <CardDescription>
                Comprehensive email performance metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Email Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed email performance analysis
                </p>
                <Link href="/admin/emails/analytics">
                  <Button>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Configure email delivery, SMTP, and template settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Email Configuration</h3>
                <p className="text-muted-foreground mb-4">
                  Manage email settings and preferences
                </p>
                <Link href="/admin/settings/templates">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Email Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
