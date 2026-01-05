"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  User,
  Lock,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useClerk } from "@clerk/nextjs"

interface SettingsContentProps {
  user: { 
    profile: { 
      full_name?: string
      phone?: string
      date_of_birth?: string
    }
    user: { email?: string } 
  }
}

export function PatientSettingsContent({ user }: SettingsContentProps) {
  const { signOut } = useClerk()
  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications">(
    "profile"
  )
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    fullName: user.profile.full_name || "",
    email: user.user.email || "",
    phone: user.profile.phone || "",
    dateOfBirth: user.profile.date_of_birth || "",
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    prescriptionReminders: true,
    promotions: false,
  })

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      // Update profile via API
      const response = await fetch("/api/patient/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        // Show success toast
      }
    } catch (_error) {
      // Handle error silently
    } finally {
      setIsSaving(false)
    }
  }

  const sections = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "security" as const, label: "Security", icon: Lock },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-lg border sticky top-20">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b last:border-b-0 transition-colors ${
                  activeSection === section.id
                    ? "bg-blue-50 text-primary border-l-4 border-l-blue-600 pl-3"
                    : "hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="md:col-span-3">
        <AnimatePresence mode="wait">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="bg-white rounded-lg border p-6 space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="mt-2 bg-slate-50"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Managed by Clerk. Update in account settings.
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="mt-2"
                      placeholder="+61 XXX XXX XXX"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="mt-6"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {/* Change Password */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Password
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your password is managed securely by Clerk.
                </p>
                <Link href="/user/account" target="_blank">
                  <Button variant="outline">
                    Change Password
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Two-Factor Authentication */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Add an extra layer of security to your account.
                </p>
                <Button variant="outline">
                  Enable 2FA
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Active Sessions */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage devices where you&apos;re signed in.
                </p>
                <Button variant="outline">
                  View All Sessions
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Sign Out */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Sign Out</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign out from all devices or just this one.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline">Sign Out This Device</Button>
                  <Button
                    variant="destructive"
                    onClick={() => signOut({ redirectUrl: "/" })}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out All Devices
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="bg-white rounded-lg border p-6 space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

                {/* Email Notifications */}
                <div className="flex items-center justify-between py-4 border-b">
                  <div>
                    <h3 className="font-semibold">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        emailNotifications: checked,
                      })
                    }
                  />
                </div>

                {/* Appointment Reminders */}
                <div className="flex items-center justify-between py-4 border-b">
                  <div>
                    <h3 className="font-semibold">Appointment Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      Get reminded before your appointments
                    </p>
                  </div>
                  <Switch
                    checked={notifications.appointmentReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        appointmentReminders: checked,
                      })
                    }
                  />
                </div>

                {/* Prescription Reminders */}
                <div className="flex items-center justify-between py-4 border-b">
                  <div>
                    <h3 className="font-semibold">Prescription Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      Get reminded when prescriptions are ready
                    </p>
                  </div>
                  <Switch
                    checked={notifications.prescriptionReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        prescriptionReminders: checked,
                      })
                    }
                  />
                </div>

                {/* Promotions & Marketing */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-semibold">Promotions & Offers</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive news about new features and special offers
                    </p>
                  </div>
                  <Switch
                    checked={notifications.promotions}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        promotions: checked,
                      })
                    }
                  />
                </div>

                <Button className="mt-6">Save Preferences</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
