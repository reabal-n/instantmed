/**
 * Intake data module - re-exports the actively used intake data API.
 *
 * Consumers can import from "@/lib/data/intakes" as before.
 */

// Queries (server-only)
export {
  type FormToInboxStats,
  getAllIntakesForAdmin,
  getDoctorQueue,
  getFormToInboxStats,
  getIntakeForPatient,
  getIntakeMonitoringStats,
  getIntakeWithDetails,
  getNextQueueIntakeId,
  getPatientDashboardData,
  getPatientIntakes,
  getPatientNotes,
  getPendingBatchReviews,
  getRecentlyCompletedIntakes,
  type PendingBatchReviewResult,
} from "./queries"

// Mutations (server-only)
export {
  approvePrescribedScript,
  createIntake,
  flagForFollowup,
  markAsReviewed,
  saveDoctorNotes,
  startParchmentPrescribing,
  updateIntakeStatus,
  updateScriptSent,
} from "./mutations"
