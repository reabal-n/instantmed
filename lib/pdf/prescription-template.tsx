export interface PrescriptionTemplateData {
  patientName: string
  dob: string
  address?: string
  medicareNumber?: string
  medicationName: string
  dosage: string
  quantity: string
  repeats: number
  directions: string
  pbsListed: boolean
  authorityRequired: boolean
  authorityNumber?: string
  doctorName: string
  providerNumber: string
  prescriberNumber: string
  createdDate: string
  referenceNumber: string
}

/**
 * Prescription HTML Template
 */
export function generatePrescriptionHTML(data: PrescriptionTemplateData): string {
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
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
      border: 2px solid #1e40af;
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #ddd;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #1e40af;
    }
    .pbs-indicator {
      display: inline-block;
      padding: 4px 12px;
      background: ${data.pbsListed ? "#dbeafe" : "#fee2e2"};
      color: ${data.pbsListed ? "#1e40af" : "#991b1b"};
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      margin-top: 8px;
    }
    .patient-section, .prescriber-section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .medication-box {
      background: #f8fafc;
      border: 2px solid #1e40af;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .medication-name {
      font-size: 14pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .medication-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .detail-item {
      font-size: 10pt;
    }
    .detail-label {
      color: #6b7280;
    }
    .directions-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      padding: 12px;
      border-radius: 6px;
      margin-top: 12px;
    }
    .directions-box strong {
      display: block;
      font-size: 9pt;
      color: #854d0e;
      margin-bottom: 4px;
    }
    .signature-area {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-line {
      border-top: 1px solid #333;
      width: 180px;
      padding-top: 4px;
      font-size: 8pt;
      color: #6b7280;
    }
    .prescriber-details {
      text-align: right;
      font-size: 10pt;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
    .ref {
      font-size: 8pt;
      color: #9ca3af;
      text-align: right;
      margin-bottom: 8px;
    }
    ${
      data.authorityRequired
        ? `
    .authority-box {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      padding: 8px 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 9pt;
    }
    `
        : ""
    }
  </style>
</head>
<body>
  <div class="ref">Ref: ${data.referenceNumber}</div>

  <div class="header">
    <h1>PRESCRIPTION</h1>
    <span class="pbs-indicator">${data.pbsListed ? "PBS LISTED" : "PRIVATE PRESCRIPTION"}</span>
  </div>

  <div class="patient-section">
    <div class="section-title">Patient</div>
    <div style="font-weight: 600; font-size: 12pt;">${data.patientName}</div>
    <div style="font-size: 10pt; color: #4b5563;">
      DOB: ${formatDOB(data.dob)}
      ${data.address ? `<br>${data.address}` : ""}
      ${data.medicareNumber ? `<br>Medicare: ${data.medicareNumber}` : ""}
    </div>
  </div>

  <div class="medication-box">
    <div class="medication-name">${data.medicationName}</div>
    <div style="font-size: 11pt;">${data.dosage}</div>
    
    <div class="medication-details">
      <div class="detail-item">
        <span class="detail-label">Quantity:</span> <strong>${data.quantity}</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Repeats:</span> <strong>${data.repeats}</strong>
      </div>
    </div>

    <div class="directions-box">
      <strong>DIRECTIONS</strong>
      ${data.directions}
    </div>

    ${
      data.authorityRequired
        ? `
    <div class="authority-box">
      <strong>Authority Prescription</strong><br>
      Authority Number: ${data.authorityNumber || "Streamlined Authority"}
    </div>
    `
        : ""
    }
  </div>

  <div class="signature-area">
    <div>
      <div class="signature-line">Prescriber Signature</div>
    </div>
    <div class="prescriber-details">
      <strong>${data.doctorName}</strong><br>
      Provider: ${data.providerNumber}<br>
      Prescriber: ${data.prescriberNumber}<br>
      Date: ${formatDate(data.createdDate)}
    </div>
  </div>

  <div class="footer">
    This prescription was issued following a telehealth consultation.<br>
    Valid for 12 months from date of issue. Repeats valid for 12 months.
  </div>
</body>
</html>
  `
}
