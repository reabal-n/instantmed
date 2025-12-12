import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Settings, Bell, Shield, Clock, Mail } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Configure system preferences and notifications
        </p>
      </div>

      {/* SLA Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            SLA Configuration
          </CardTitle>
          <CardDescription>
            Configure response time targets for different services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="standard-sla">Standard SLA (minutes)</Label>
              <Input id="standard-sla" type="number" defaultValue={60} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-sla">Priority SLA (minutes)</Label>
              <Input id="priority-sla" type="number" defaultValue={30} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="warning-threshold">Warning Threshold (%)</Label>
            <Input id="warning-threshold" type="number" defaultValue={70} />
            <p className="text-sm text-muted-foreground">
              Trigger warning when this percentage of SLA time has elapsed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure when and how you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>New Request Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new requests arrive
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>SLA Warning Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Alert when requests are approaching deadline
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>SLA Breach Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Alert when requests exceed their SLA
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>High Risk Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Alert for high/critical risk intakes
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure automated email settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-email">From Email</Label>
            <Input id="from-email" type="email" defaultValue="noreply@instantmed.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Support Email</Label>
            <Input id="support-email" type="email" defaultValue="support@instantmed.com" />
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              <Label>Send Confirmation Emails</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send confirmation on submission
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </CardTitle>
          <CardDescription>
            Configure access control and audit settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require 2FA for Admins</Label>
              <p className="text-sm text-muted-foreground">
                Enforce two-factor authentication for admin accounts
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Audit Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all admin actions for compliance
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>IP Restriction</Label>
              <p className="text-sm text-muted-foreground">
                Restrict admin access to specific IP ranges
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  )
}
