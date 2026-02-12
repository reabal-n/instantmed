export interface ReferralTemplateData {
  patientName: string
  dob: string
  medicareNumber?: string
  testsRequested: string
  clinicalIndication: string
  urgency: "Routine" | "Urgent" | "ASAP"
  previousTests?: string
  doctorName: string
  providerNumber: string
  createdDate: string
  referenceNumber: string
}

/**
 * Pathology/Imaging Referral HTML Template
 * 
 * Professional, print-optimized layout that matches the medical certificate style.
 */
export function generateReferralHTML(data: ReferralTemplateData): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatDOB = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const urgencyStyles = {
    Routine: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
    Urgent: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
    ASAP: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  }

  const urgency = urgencyStyles[data.urgency]

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 20mm; size: A4; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #111827;
      padding: 0;
      max-width: 800px;
      margin: 0 auto;
    }
    .page {
      padding: 40px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 2px solid #111827;
    }
    .header-title {
      font-size: 17pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .header-subtitle {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 2px;
    }
    .urgency-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: ${urgency.bg};
      color: ${urgency.text};
      border: 1px solid ${urgency.border};
    }
    .ref-number {
      font-size: 8pt;
      color: #9ca3af;
      text-align: right;
      margin-top: 6px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    /* Sections */
    .section {
      margin-bottom: 20px;
    }
    .section-label {
      font-size: 8pt;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 5px 0;
    }
    .field-label {
      font-size: 9pt;
      color: #6b7280;
      min-width: 100px;
      flex-shrink: 0;
    }
    .field-value {
      font-weight: 500;
      font-size: 10pt;
    }

    /* Content boxes */
    .content-box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }
    .content-box.tests {
      background: #fafafa;
      border-color: #d1d5db;
    }
    .content-box.clinical {
      background: #fffdf7;
      border-color: #e5e7eb;
    }
    .content-box-title {
      font-size: 8pt;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .content-box-body {
      font-size: 11pt;
      line-height: 1.6;
    }

    /* Doctor section */
    .doctor-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .signature-area {
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      padding-top: 6px;
      margin-top: 48px;
      font-size: 8pt;
      color: #9ca3af;
    }
    .doctor-details {
      text-align: right;
      font-size: 9.5pt;
    }
    .doctor-name {
      font-weight: 600;
      font-size: 10.5pt;
    }
    .doctor-info {
      color: #6b7280;
      margin-top: 2px;
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
      text-align: center;
      font-size: 7.5pt;
      color: #9ca3af;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="header-title">Pathology / Imaging Request</div>
        <div class="header-subtitle">InstantMed Telehealth Services</div>
      </div>
      <div style="text-align: right;">
        <span class="urgency-badge">${data.urgency}</span>
        <div class="ref-number">${data.referenceNumber}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">Patient Details</div>
      <div class="grid-2">
        <div class="field-row">
          <span class="field-label">Full Name</span>
          <span class="field-value">${data.patientName}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Date of Birth</span>
          <span class="field-value">${formatDOB(data.dob)}</span>
        </div>
        ${data.medicareNumber ? `
        <div class="field-row">
          <span class="field-label">Medicare No.</span>
          <span class="field-value">${data.medicareNumber}</span>
        </div>` : ""}
      </div>
    </div>

    <div class="content-box tests">
      <div class="content-box-title">Tests / Investigations Requested</div>
      <div class="content-box-body">${data.testsRequested}</div>
    </div>

    <div class="content-box clinical">
      <div class="content-box-title">Clinical Indication</div>
      <div class="content-box-body">${data.clinicalIndication}</div>
    </div>

    ${data.previousTests ? `
    <div class="content-box">
      <div class="content-box-title">Previous Tests / Relevant History</div>
      <div class="content-box-body">${data.previousTests}</div>
    </div>` : ""}

    <div class="doctor-section">
      <div class="signature-area">
        <div class="signature-line">Requesting Doctor</div>
      </div>
      <div class="doctor-details">
        <div class="doctor-name">${data.doctorName}</div>
        <div class="doctor-info">Provider No: ${data.providerNumber}</div>
        <div class="doctor-info">Date: ${formatDate(data.createdDate)}</div>
      </div>
    </div>

    <div class="footer">
      Generated via InstantMed Telehealth &middot; Reference: ${data.referenceNumber}<br>
      Valid for 12 months from date of issue &middot; AHPRA-registered medical practitioner
    </div>
  </div>
</body>
</html>`
}
