"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("health-summary")

export interface HealthSummaryStats {
  totalRequests: number
  completedRequests: number
  activeRequests: number
  medicalCertificates: number
  prescriptions: number
  consults: number
}

export interface RecentRequest {
  id: string
  reference_number: string
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  approved_at: string | null
  service: {
    name: string
    slug: string
  } | null
}

export interface MedicalDocument {
  id: string
  intake_id: string
  document_type: string
  created_at: string
  verification_code?: string
  start_date?: string
  end_date?: string
}

export interface PrescriptionRecord {
  id: string
  intake_id: string
  medication_name: string | null
  created_at: string
  status: string
}

export interface HealthSummary {
  stats: HealthSummaryStats
  recentRequests: RecentRequest[]
  medicalCertificates: MedicalDocument[]
  prescriptions: PrescriptionRecord[]
  memberSince: string
}

/**
 * Get comprehensive health summary for a patient
 */
export async function getPatientHealthSummary(patientId: string): Promise<HealthSummary> {
  const supabase = createServiceRoleClient()
  
  try {
    // Fetch all intakes for the patient
    const { data: intakes, error: intakesError } = await supabase
      .from("intakes")
      .select(`
        id,
        reference_number,
        status,
        category,
        subtype,
        created_at,
        approved_at
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
    
    if (intakesError) {
      logger.error("Failed to fetch intakes for health summary", { error: intakesError.message })
      throw intakesError
    }
    
    // Calculate stats
    const allIntakes = intakes || []
    const stats: HealthSummaryStats = {
      totalRequests: allIntakes.length,
      completedRequests: allIntakes.filter(i => 
        ["approved", "completed"].includes(i.status)
      ).length,
      activeRequests: allIntakes.filter(i => 
        ["paid", "in_review", "pending", "pending_info"].includes(i.status)
      ).length,
      medicalCertificates: allIntakes.filter(i => 
        i.category === "medical_certificate"
      ).length,
      prescriptions: allIntakes.filter(i => 
        i.category === "prescription"
      ).length,
      consults: allIntakes.filter(i => 
        i.category === "consult"
      ).length,
    }
    
    // Get recent requests (last 10)
    const recentRequests: RecentRequest[] = allIntakes.slice(0, 10).map(intake => ({
      id: intake.id,
      reference_number: intake.reference_number,
      status: intake.status,
      category: intake.category,
      subtype: intake.subtype,
      created_at: intake.created_at,
      approved_at: intake.approved_at,
      service: null,
    }))
    
    // Fetch medical certificates
    const approvedMedCertIntakeIds = allIntakes
      .filter(i => i.category === "medical_certificate" && i.status === "approved")
      .map(i => i.id)
    
    let medicalCertificates: MedicalDocument[] = []
    if (approvedMedCertIntakeIds.length > 0) {
      const { data: certs, error: certsError } = await supabase
        .from("med_cert_certificates")
        .select("id, intake_id, verification_code, start_date, end_date, created_at")
        .in("intake_id", approvedMedCertIntakeIds)
        .order("created_at", { ascending: false })
      
      if (certsError) {
        logger.error("Failed to fetch medical certificates", { error: certsError.message })
      }
      
      medicalCertificates = (certs || []).map(cert => ({
        id: cert.id,
        intake_id: cert.intake_id,
        document_type: "medical_certificate",
        created_at: cert.created_at,
        verification_code: cert.verification_code,
        start_date: cert.start_date,
        end_date: cert.end_date,
      }))
    }
    
    // Fetch prescription records from intake answers
    const prescriptionIntakes = allIntakes.filter(i => i.category === "prescription")
    let prescriptions: PrescriptionRecord[] = []
    
    if (prescriptionIntakes.length > 0) {
      const { data: answers, error: answersError } = await supabase
        .from("intake_answers")
        .select("intake_id, answers")
        .in("intake_id", prescriptionIntakes.map(i => i.id))
      
      if (answersError) {
        logger.error("Failed to fetch prescription answers", { error: answersError.message })
      }
      
      prescriptions = prescriptionIntakes.map(intake => {
        const answer = answers?.find(a => a.intake_id === intake.id)
        const medicationName = answer?.answers?.medication_display || 
                               answer?.answers?.medication_name || 
                               null
        return {
          id: intake.id,
          intake_id: intake.id,
          medication_name: medicationName as string | null,
          created_at: intake.created_at,
          status: intake.status,
        }
      })
    }
    
    // Get member since date (first intake or profile creation)
    const memberSince = allIntakes.length > 0 
      ? allIntakes[allIntakes.length - 1].created_at 
      : new Date().toISOString()
    
    return {
      stats,
      recentRequests,
      medicalCertificates,
      prescriptions,
      memberSince,
    }
  } catch (error) {
    logger.error("Failed to get health summary", { 
      patientId, 
      error: error instanceof Error ? error.message : "Unknown error" 
    })
    
    // Return empty summary on error
    return {
      stats: {
        totalRequests: 0,
        completedRequests: 0,
        activeRequests: 0,
        medicalCertificates: 0,
        prescriptions: 0,
        consults: 0,
      },
      recentRequests: [],
      medicalCertificates: [],
      prescriptions: [],
      memberSince: new Date().toISOString(),
    }
  }
}
