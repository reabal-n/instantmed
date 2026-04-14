/**
 * Intake data module - re-exports all public API for backwards compatibility.
 *
 * Consumers can import from "@/lib/data/intakes" as before.
 */

// Queries (server-only)
export {
  getAIApprovedIntakes,
  getAllIntakesByStatus,
  getAllIntakesForAdmin,
  getAutoApprovalMetrics,
  getDoctorDashboardStats,
  getDoctorPersonalStats,
  getDoctorQueue,
  getIntakeDocuments,
  getIntakeForPatient,
  getIntakeMonitoringStats,
  getIntakeWithDetails,
  getNextQueueIntakeId,
  getPatientDashboardData,
  getPatientIntakes,
  getPatientIntakeStats,
  getPatientNotes,
  getRecentlyCompletedIntakes,
  getSlaBreachIntakes,
  getTodayEarnings,
} from "./queries"

// Mutations (server-only)
export {
  createIntake,
  createPatientNote,
  flagForFollowup,
  markAsReviewed,
  markIntakeRefunded,
  saveDoctorNotes,
  updateIntakeStatus,
  updatePatientNote,
  updateScriptSent,
} from "./mutations"

// Email triggers (server-only, internal use)
export { triggerStatusEmail } from "./email-triggers"

// Formatting helpers
export {
  formatIntakeStatus,
  formatServiceType,
  getIntakeStatusColor,
} from "./format"

// Types
export type {
  DashboardIntake,
  DashboardPrescription,
} from "./types"
