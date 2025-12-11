export interface MedCertTemplateData {
  patientName: string
  dob: string
  dateFrom: string
  dateTo: string
  reason: string
  workCapacity: string
  notes?: string
  doctorName: string
  providerNumber: string
  createdDate: string
  referenceNumber: string
  clinicName?: string
  clinicAddress?: string
  clinicPhone?: string
}

/**
 * Medical Certificate HTML Template
 * This generates HTML that can be converted to PDF using a service like html-pdf or puppeteer
 */
export function generateMedCertHTML(data: MedCertTemplateData): string {
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
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .header .clinic-info {
      font-size: 10pt;
      color: #6b7280;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .field {
      display: flex;
      margin-bottom: 12px;
    }
    .field-label {
      width: 140px;
      font-weight: 500;
      color: #374151;
    }
    .field-value {
      flex: 1;
      color: #1f2937;
    }
    .certification {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
    }
    .certification p {
      margin-bottom: 12px;
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      margin-top: 60px;
      padding-top: 8px;
      font-size: 10pt;
      color: #6b7280;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #9ca3af;
      text-align: center;
    }
    .reference {
      position: absolute;
      top: 40px;
      right: 40px;
      font-size: 9pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="reference">Ref: ${data.referenceNumber}</div>
  
  <div class="header">
    <h1>Medical Certificate</h1>
    <div class="clinic-info">
      ${data.clinicName || "InstantMed"}<br>
      ${data.clinicAddress || "Online Medical Services"}<br>
      ${data.clinicPhone || ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Patient Details</div>
    <div class="field">
      <span class="field-label">Full Name:</span>
      <span class="field-value">${data.patientName}</span>
    </div>
    <div class="field">
      <span class="field-label">Date of Birth:</span>
      <span class="field-value">${formatDOB(data.dob)}</span>
    </div>
  </div>

  <div class="certification">
    <p>This is to certify that <strong>${data.patientName}</strong> attended a medical consultation on <strong>${formatDate(data.createdDate)}</strong>.</p>
    
    <p>In my professional opinion, this patient is/was unfit for their usual duties due to a medical condition.</p>
    
    <div class="field" style="margin-top: 16px;">
      <span class="field-label">Period:</span>
      <span class="field-value"><strong>${formatDate(data.dateFrom)}</strong> to <strong>${formatDate(data.dateTo)}</strong> (inclusive)</span>
    </div>
    
    <div class="field">
      <span class="field-label">Capacity:</span>
      <span class="field-value">${data.workCapacity}</span>
    </div>
    
    ${
      data.reason
        ? `
    <div class="field">
      <span class="field-label">Condition:</span>
      <span class="field-value">${data.reason}</span>
    </div>
    `
        : ""
    }
    
    ${
      data.notes
        ? `
    <div class="field">
      <span class="field-label">Notes:</span>
      <span class="field-value">${data.notes}</span>
    </div>
    `
        : ""
    }
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">
        Doctor's Signature
      </div>
    </div>
    <div class="signature-box" style="text-align: right;">
      <div style="font-size: 11pt;">
        <strong>${data.doctorName}</strong><br>
        Provider No: ${data.providerNumber}<br>
        Date: ${formatDate(data.createdDate)}
      </div>
    </div>
  </div>

  <div class="footer">
    This certificate was issued following a telehealth consultation in accordance with Medical Board of Australia guidelines.<br>
    For verification, please contact InstantMed with reference number ${data.referenceNumber}.
  </div>
</body>
</html>
  `
}
