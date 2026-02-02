/**
 * Admin Email Preview System
 * 
 * Provides template preview functionality for the admin dashboard
 * without using react-dom/server to avoid build issues.
 */

import "server-only"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("admin-email-preview")

// ============================================================================
// TEMPLATE PREVIEW DATA
// ============================================================================

interface PreviewTemplate {
  slug: string
  name: string
  subject: string
  htmlTemplate: string
  availableTags: string[]
  sampleData: Record<string, string>
}

const PREVIEW_TEMPLATES: PreviewTemplate[] = [
  {
    slug: "med_cert_patient",
    name: "Medical Certificate - Patient",
    subject: "Your medical certificate is ready",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #00C9A7; color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .button { display: inline-block; background: #00C9A7; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstantMed</h1>
    </div>
    <div class="content">
      <h2>Your medical certificate is ready</h2>
      <p>Hi {{patientName}},</p>
      <p>Your <strong>Medical Certificate — {{certType}}</strong> has been reviewed and approved by one of our doctors. You can download it from your dashboard.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="button">View Dashboard</a>
      </p>
      {{#verificationCode}}
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534; font-weight: 600;">Verification Code</p>
        <p style="margin: 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #15803d; letter-spacing: 2px;">{{verificationCode}}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">You can verify this certificate at {{appUrl}}/verify</p>
      </div>
      {{/verificationCode}}
      <h3>What happens next?</h3>
      <ul>
        <li>Download your certificate from your dashboard</li>
        <li>Forward it to your employer, university, or relevant institution</li>
        <li>Keep a copy for your records</li>
      </ul>
      <p style="margin-top: 24px;">Best regards,<br>The InstantMed Team</p>
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
      <p><a href="{{appUrl}}/privacy">Privacy Policy</a> | <a href="{{appUrl}}/contact">Contact</a></p>
    </div>
  </div>
</body>
</html>
    `,
    availableTags: ["patientName", "dashboardUrl", "verificationCode", "certType", "appUrl"],
    sampleData: {
      patientName: "John Smith",
      dashboardUrl: "https://instantmed.com.au/dashboard",
      verificationCode: "ABC12345",
      certType: "Work Absence",
      appUrl: "https://instantmed.com.au",
    },
  },
  {
    slug: "med_cert_employer",
    name: "Medical Certificate - Employer",
    subject: "Medical Certificate for {{patientName}}",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin: 24px; text-align: center; }
    .content { padding: 0 24px 32px; }
    .button { display: inline-block; background: #00C9A7; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">Medical Certificate</p>
      <p style="margin: 4px 0 0 0; font-size: 18px; color: #1f2937; font-weight: 600;">{{patientName}}</p>
      {{#certStartDate}}{{#certEndDate}}<p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">{{certStartDate}} — {{certEndDate}}</p>{{/certEndDate}}{{/certStartDate}}
    </div>
    <div class="content">
      <p>{{greeting}}</p>
      <p><strong>{{patientName}}</strong> has requested that we forward their medical certificate to you. This certificate was issued by a registered Australian doctor through InstantMed's telehealth service.</p>
      {{#patientNote}}
      <div style="background: #f9fafb; border-left: 4px solid #00C9A7; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600;">Note from {{patientName}}</p>
        <p style="margin: 0; font-style: italic;">"{{patientNote}}"</p>
      </div>
      {{/patientNote}}
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{downloadUrl}}" class="button">Download Certificate (PDF)</a>
      </p>
      <p style="text-align: center; margin: 16px 0; font-size: 12px; color: #6b7280;">This link expires in {{expiresInDays}} days for security.</p>
      {{#verificationCode}}
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534; font-weight: 600;">Certificate Verification</p>
        <p style="margin: 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #15803d; letter-spacing: 2px;">{{verificationCode}}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">You can verify the authenticity of this certificate at {{appUrl}}/verify</p>
      </div>
      {{/verificationCode}}
      <h3>About InstantMed</h3>
      <p style="font-size: 12px; color: #6b7280; margin: 0;">InstantMed is an Australian telehealth service. All medical certificates are issued by AHPRA-registered doctors and include verification codes for authenticity checks. If you have questions about this certificate, please contact us at {{appUrl}}/contact.</p>
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
    </div>
  </div>
</body>
</html>
    `,
    availableTags: ["employerName", "companyName", "patientName", "downloadUrl", "expiresInDays", "verificationCode", "patientNote", "certStartDate", "certEndDate", "appUrl"],
    sampleData: {
      employerName: "John Manager",
      companyName: "Acme Corp",
      patientName: "John Smith",
      downloadUrl: "https://instantmed.com.au/download/ABC123",
      expiresInDays: "7",
      verificationCode: "ABC12345",
      patientNote: "Please find attached my medical certificate",
      certStartDate: "2024-01-15",
      certEndDate: "2024-01-20",
      appUrl: "https://instantmed.com.au",
    },
  },
  {
    slug: "welcome",
    name: "Welcome Email",
    subject: "Welcome to InstantMed",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #00C9A7; color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .button { display: inline-block; background: #00C9A7; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstantMed</h1>
    </div>
    <div class="content">
      <h2>Welcome to InstantMed!</h2>
      <p>Hi {{patientName}},</p>
      <p>Welcome to InstantMed! We're here to make healthcare simple and accessible. Get started with your first consult today.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="button">Get Started</a>
      </p>
      <h3>What we offer:</h3>
      <ul>
        <li>Quick online consultations with Australian doctors</li>
        <li>Medical certificates and eScripts</li>
        <li>No appointment needed - consult on your schedule</li>
        <li>Secure and confidential service</li>
      </ul>
      <p style="margin-top: 24px;">We look forward to helping you with your healthcare needs.</p>
      <p>Best regards,<br>The InstantMed Team</p>
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
      <p><a href="{{appUrl}}/privacy">Privacy Policy</a> | <a href="{{appUrl}}/contact">Contact</a></p>
    </div>
  </div>
</body>
</html>
    `,
    availableTags: ["patientName", "dashboardUrl", "appUrl"],
    sampleData: {
      patientName: "John Smith",
      dashboardUrl: "https://instantmed.com.au/dashboard",
      appUrl: "https://instantmed.com.au",
    },
  },
  {
    slug: "payment_receipt",
    name: "Payment Receipt",
    subject: "Payment confirmed — {{serviceName}}",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #00C9A7; color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .button { display: inline-block; background: #00C9A7; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
    .receipt-table { width: 100%; border-collapse: collapse; }
    .receipt-table td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .receipt-label { color: #6b7280; }
    .receipt-value { text-align: right; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstantMed</h1>
    </div>
    <div class="content">
      <h2>Payment confirmed</h2>
      <p>Hi {{patientName}},</p>
      <p>We've received your payment of <strong>{{amount}}</strong> for <strong>{{serviceName}}</strong>. A doctor will review your request shortly.</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0;">Receipt Details</h3>
        <table class="receipt-table">
          <tr><td class="receipt-label">Service</td><td class="receipt-value">{{serviceName}}</td></tr>
          <tr><td class="receipt-label">Amount</td><td class="receipt-value">{{amount}}</td></tr>
          <tr><td class="receipt-label">Reference</td><td class="receipt-value" style="font-family: monospace; font-size: 13px;">{{intakeRef}}</td></tr>
          <tr><td class="receipt-label">Date</td><td class="receipt-value">{{paidAt}}</td></tr>
        </table>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="button">Track Your Request</a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">This receipt is for your records. You can view your request status on your <a href="{{dashboardUrl}}" style="color: #00C9A7;">dashboard</a>.</p>
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
      <p><a href="{{appUrl}}/privacy">Privacy Policy</a> | <a href="{{appUrl}}/contact">Contact</a></p>
    </div>
  </div>
</body>
</html>
    `,
    availableTags: ["patientName", "serviceName", "amount", "intakeRef", "paidAt", "dashboardUrl", "appUrl"],
    sampleData: {
      patientName: "John Smith",
      serviceName: "Medical Certificate",
      amount: "$19.95",
      intakeRef: "INT-2024-ABC123",
      paidAt: "2 Feb 2026",
      dashboardUrl: "https://instantmed.com.au/patient",
      appUrl: "https://instantmed.com.au",
    },
  },
  {
    slug: "request_declined",
    name: "Request Declined",
    subject: "Update on your {{serviceName}} request",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #00C9A7; color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .button { display: inline-block; background: #00C9A7; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstantMed</h1>
    </div>
    <div class="content">
      <h2>Update on your request</h2>
      <p>Hi {{patientName}},</p>
      <p>Unfortunately, our doctor was unable to approve your <strong>{{serviceName}}</strong> request at this time.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b;">Reason</p>
        <p style="margin: 0; color: #7f1d1d;">{{declineReason}}</p>
      </div>
      {{#recommendations}}
      <h3>Doctor's recommendations</h3>
      <p>{{recommendations}}</p>
      {{/recommendations}}
      <p>A full refund of <strong>{{amount}}</strong> will be processed automatically within 3-5 business days.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="button">View Dashboard</a>
      </p>
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
      <p><a href="{{appUrl}}/privacy">Privacy Policy</a> | <a href="{{appUrl}}/contact">Contact</a></p>
    </div>
  </div>
</body>
</html>
    `,
    availableTags: ["patientName", "serviceName", "declineReason", "recommendations", "amount", "dashboardUrl", "appUrl"],
    sampleData: {
      patientName: "John Smith",
      serviceName: "Medical Certificate",
      declineReason: "Insufficient information provided for assessment.",
      recommendations: "Please visit your local GP for an in-person consultation.",
      amount: "$19.95",
      dashboardUrl: "https://instantmed.com.au/patient",
      appUrl: "https://instantmed.com.au",
    },
  },
  {
    slug: "script_sent",
    name: "Prescription Sent",
    subject: "Your eScript is ready",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #00C9A7; color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .button { display: inline-block; background: #00C9A7; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstantMed</h1>
    </div>
    <div class="content">
      <h2>Your eScript is ready</h2>
      <p>Hi {{patientName}},</p>
      <p>Your doctor has approved your prescription for <strong>{{medicationName}}</strong>. An eScript token has been sent to your nominated pharmacy or is available on your dashboard.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="button">View Dashboard</a>
      </p>
      <h3>How to fill your eScript</h3>
      <ul>
        <li>Visit any pharmacy in Australia</li>
        <li>Show your eScript token (check your SMS or dashboard)</li>
        <li>The pharmacist will dispense your medication</li>
      </ul>
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
      <p><a href="{{appUrl}}/privacy">Privacy Policy</a> | <a href="{{appUrl}}/contact">Contact</a></p>
    </div>
  </div>
</body>
</html>
    `,
    availableTags: ["patientName", "medicationName", "dashboardUrl", "appUrl"],
    sampleData: {
      patientName: "John Smith",
      medicationName: "Amoxicillin 500mg",
      dashboardUrl: "https://instantmed.com.au/patient",
      appUrl: "https://instantmed.com.au",
    },
  },
]

// ============================================================================
// PREVIEW FUNCTIONS
// ============================================================================

/**
 * Get all available preview templates
 */
export function getAllPreviewTemplates(): PreviewTemplate[] {
  return PREVIEW_TEMPLATES
}

/**
 * Get preview template by slug
 */
export function getPreviewTemplate(slug: string): PreviewTemplate | null {
  return PREVIEW_TEMPLATES.find(t => t.slug === slug) || null
}

/**
 * Get available tags for a template
 */
export function getPreviewTemplateTags(slug: string): string[] {
  const template = getPreviewTemplate(slug)
  return template?.availableTags || []
}

/**
 * Get sample data for a template
 */
export function getPreviewTemplateSampleData(slug: string): Record<string, string> {
  const template = getPreviewTemplate(slug)
  return template?.sampleData || {}
}

/**
 * Render template with data
 */
export function renderPreviewTemplate(
  slug: string,
  data: Record<string, string> = {},
  options: { isTest?: boolean } = {}
): { subject: string; html: string; error?: string } {
  const template = getPreviewTemplate(slug)
  if (!template) {
    return { subject: "", html: "", error: `Template "${slug}" not found` }
  }

  try {
    // Merge with sample data
    const mergedData = { ...template.sampleData, ...data }
    
    // Render subject
    let subject = template.subject
    for (const [key, value] of Object.entries(mergedData)) {
      subject = subject.replace(new RegExp(`{{${key}}}`, "g"), value)
    }
    
    // Add test prefix
    if (options.isTest) {
      subject = `[TEST] ${subject}`
    }
    
    // Render HTML with simple template replacement
    let html = template.htmlTemplate
    
    // Replace simple variables
    for (const [key, value] of Object.entries(mergedData)) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), value)
    }
    
    // Handle conditional blocks (simple implementation)
    html = html.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, key, content) => {
      return mergedData[key] ? content : ""
    })
    
    // Add test banner
    if (options.isTest) {
      const testBanner = `
        <div style="background-color: #f59e0b; color: white; padding: 12px; text-align: center; margin-bottom: 20px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ⚠️ THIS IS A TEST EMAIL - Template: ${template.name}
        </div>
      `
      html = html.replace(/<body[^>]*>/i, (match) => `${match}${testBanner}`)
    }
    
    return { subject, html }
  } catch (error) {
    log.error("Failed to render preview template", { slug }, error instanceof Error ? error : undefined)
    return { subject: "", html: "", error: "Failed to render template" }
  }
}
