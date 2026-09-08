"use client"

import { type ComponentProps, useEffect, useState } from "react"

import { DrawerPanel } from "@/components/panels/drawer-panel"
import { Button } from "@/components/ui/button"

type ProfileComponent = typeof import("@/components/doctor/patient-profile-panel").PatientProfilePanel
let loadedProfile: ProfileComponent | null = null

export function LazyPatientProfilePanel(props: ComponentProps<ProfileComponent>) {
  const [Profile, setProfile] = useState<ProfileComponent | null>(() => loadedProfile)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (Profile) return
    let cancelled = false
    // App Router's next/dynamic fallback does not receive import errors or retry.
    // Catch here so a failed optional chunk cannot replace the clinical review.
    void import("@/components/doctor/patient-profile-panel").then((module) => {
      loadedProfile = module.PatientProfilePanel
      if (!cancelled) setProfile(() => module.PatientProfilePanel)
    }).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => { cancelled = true }
  }, [Profile, attempt])

  if (Profile) return <Profile {...props} />

  return (
    <DrawerPanel title="Patient profile" width={440}>
      <div className="space-y-3 px-5 py-5">
        <p role="status" className="text-sm text-muted-foreground">
          {failed ? "Patient profile could not be loaded." : "Loading patient profile…"}
        </p>
        {failed && (
          <Button variant="outline" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>
            Retry loading profile
          </Button>
        )}
      </div>
    </DrawerPanel>
  )
}
