/**
 * Intake data module - re-exports the actively used intake data API.
 *
 * Consumers can import from "@/lib/data/intakes" as before.
 */

// Queries (server-only)
export {
  getAIApprovedIntakes,
  getAllIntakesForAdmin,
  getDoctorQueue,
  getIntakeForPatient,
  getIntakeMonitoringStats,
  getIntakeWithDetails,
  getNextQueueIntakeId,
  getPatientDashboardData,
  getPatientIntakes,
  getPatientNotes,
  getRecentlyCompletedIntakes,
  getTodayEarnings,
} from "./queries"

// Mutations (server-only)
export {
  createIntake,
  flagForFollowup,
  markAsReviewed,
  saveDoctorNotes,
  updateIntakeStatus,
  updateScriptSent,
} from "./mutations"
