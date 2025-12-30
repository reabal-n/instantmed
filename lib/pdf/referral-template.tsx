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

  const urgencyColor = {
    Routine: "#10b981",
    Urgent: "#f59e0b",
    ASAP: "#ef4444",
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #059669;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 20pt;
      font-weight: 600;
      color: #047857;
    }
    .urgency-badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: 600;
      color: white;
      background: ${urgencyColor[data.urgency]};
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .field {
      margin-bottom: 8px;
    }
    .field-label {
      font-size: 9pt;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .field-value {
      font-weight: 500;
    }
    .tests-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .tests-box h3 {
      font-size: 10pt;
      color: #047857;
      margin-bottom: 8px;
    }
    .clinical-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .doctor-section {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      width: 200px;
      margin-top: 50px;
      padding-top: 8px;
      font-size: 9pt;
      color: #6b7280;
    }
    .footer {
      margin-top: 30px;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
    .ref {
      position: absolute;
      top: 30px;
      right: 30px;
      font-size: 8pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="ref">Ref: ${data.referenceNumber}</div>

  <div class="header">
    <div>
      <h1>Pathology / Imaging Request</h1>
      <p style="font-size: 10pt; color: #6b7280;">InstantMed Telehealth Services</p>
    </div>
    <span class="urgency-badge">${data.urgency}</span>
  </div>

  <div class="section">
    <div class="section-title">Patient Details</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Full Name</div>
        <div class="field-value">${data.patientName}</div>
      </div>
      <div class="field">
        <div class="field-label">Date of Birth</div>
        <div class="field-value">${formatDOB(data.dob)}</div>
      </div>
      ${
        data.medicareNumber
          ? `
      <div class="field">
        <div class="field-label">Medicare Number</div>
        <div class="field-value">${data.medicareNumber}</div>
      </div>
      `
          : ""
      }
    </div>
  </div>

  <div class="tests-box">
    <h3>Tests / Investigations Requested</h3>
    <p style="font-size: 12pt; font-weight: 500;">${data.testsRequested}</p>
  </div>

  <div class="clinical-box">
    <div class="section-title" style="border: none; margin-bottom: 8px;">Clinical Indication</div>
    <p>${data.clinicalIndication}</p>
  </div>

  ${
    data.previousTests
      ? `
  <div class="section">
    <div class="section-title">Previous Tests / Relevant History</div>
    <p>${data.previousTests}</p>
  </div>
  `
      : ""
  }

  <div class="doctor-section">
    <div>
      <div class="signature-line">Requesting Doctor</div>
    </div>
    <div style="text-align: right;">
      <strong>${data.doctorName}</strong><br>
      Provider No: ${data.providerNumber}<br>
      Date: ${formatDate(data.createdDate)}
    </div>
  </div>

  <div class="footer">
    Generated via InstantMed Telehealth • Reference: ${data.referenceNumber}<br>
    Valid for 12 months from date of issue
  </div>
</body>
</html>
  `
}
