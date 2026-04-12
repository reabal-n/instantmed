/**
 * Intake data module - re-exports all public API for backwards compatibility.
 *
 * Consumers can import from "@/lib/data/intakes" as before.
 */

// Queries (server-only)
export {
  getPatientIntakes,
  getPatientIntakeStats,
  getIntakeForPatient,
  getAllIntakesByStatus,
  getDoctorQueue,
  getAutoApprovalMetrics,
  getAIApprovedIntakes,
  getNextQueueIntakeId,
  getIntakeWithDetails,
  getAllIntakesForAdmin,
  getDoctorDashboardStats,
  getIntakeMonitoringStats,
  getDoctorPersonalStats,
  getSlaBreachIntakes,
  getPatientNotes,
  getIntakeDocuments,
  getPatientDashboardData,
  getRecentlyCompletedIntakes,
  getTodayEarnings,
} from "./queries"

// Mutations (server-only)
export {
  createIntake,
  updateIntakeStatus,
  updateScriptSent,
  saveDoctorNotes,
  markIntakeRefunded,
  flagForFollowup,
  markAsReviewed,
  declineIntake,
  createPatientNote,
  updatePatientNote,
} from "./mutations"

// Email triggers (server-only, internal use)
export { triggerStatusEmail } from "./email-triggers"

// Formatting helpers
export {
  formatServiceType,
  formatIntakeStatus,
  getIntakeStatusColor,
} from "./format"

// Types
export type {
  DashboardIntake,
  DashboardPrescription,
} from "./types"
