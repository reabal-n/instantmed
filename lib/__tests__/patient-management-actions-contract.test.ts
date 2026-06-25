import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("patient management actions", () => {
  it("surfaces admin add, delete, and duplicate reconcile controls", () => {
    const adminPatientsPage = read("app/admin/patients/page.tsx")
    const detailClient = read("app/doctor/patients/[id]/patient-detail-client.tsx")
    const addPatientDialog = read("app/doctor/patients/add-patient-dialog.tsx")

    expect(adminPatientsPage).toContain("actions={<AddPatientDialog />}")
    expect(addPatientDialog).toContain('label="IHI"')
    expect(addPatientDialog).toContain('onChange={(event) => setField("ihiNumber", event.target.value)}')
    expect(detailClient).toContain("deletePatientProfileAction")
    expect(detailClient).toContain("Delete patient")
    expect(detailClient).toContain("Delete empty patient profile")
    expect(detailClient).toContain("Reconcile & sync")
    expect(detailClient).toContain("Reconcile duplicate patient profiles")
    expect(detailClient).toContain("mergePatientProfilesAction(")
    expect(detailClient).toContain("Reconciled duplicate patient profiles from patient file")
  })

  it("keeps delete hard-blocked behind retained-record and auth checks", () => {
    const actionSource = read("app/actions/patient-profile-merge.ts")

    expect(actionSource).toContain("deletePatientProfileAction")
    expect(actionSource).toContain('requireRoleOrNull(["admin"])')
    expect(actionSource).toContain("PATIENT_PROFILE_MERGE_REFERENCE_TABLES")
    expect(actionSource).toContain("auth_account")
    expect(actionSource).toContain("merged_profile")
    expect(actionSource).toContain("Cannot delete this patient profile because retained records exist")
    expect(actionSource).toContain("patient_profile_deleted")
    expect(actionSource).toContain("empty_guest_profile")
    expect(actionSource).toContain('.is("auth_user_id", null)')
    expect(actionSource).toContain('.is("merged_into_profile_id", null)')
  })

  it("reconciles duplicate profiles and then syncs canonical patient to Parchment", () => {
    const actionSource = read("app/actions/patient-profile-merge.ts")
    const detailPage = read("app/doctor/patients/[id]/page.tsx")
    const migration = read("supabase/migrations/20260625103000_merge_patient_profiles_moves_prescriptions.sql")

    expect(actionSource).toContain("syncToParchment = false")
    expect(actionSource).toContain("validateIntegration(operatorProfile.parchment_user_id)")
    expect(actionSource).toContain("syncPatientToParchment(")
    expect(actionSource).toContain('source: "patient_profile_merge"')
    expect(actionSource).toContain("syncWarning")
    expect(detailPage).toContain("findPotentialDuplicatePatients")
    expect(detailPage).toContain("normalized_phone.eq")
    expect(detailPage).toContain("duplicateCandidates={data.duplicateCandidates}")
    expect(migration).toContain("UPDATE public.prescriptions")
    expect(migration).toContain("jsonb_build_object('prescriptions', moved_count)")
  })
})
