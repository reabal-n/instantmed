interface FormRecoveryEmailProps {
  firstName: string
  service: string
  resumeUrl: string
}

export function FormRecoveryEmail({ firstName, service, resumeUrl }: FormRecoveryEmailProps) {
  const serviceName = getServiceName(service)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finish your ${serviceName} request</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#0a0f1c;">
                Hey ${firstName || "there"} 👋
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">
                You started a ${serviceName} request but didn't finish it. No worries — we saved your progress.
              </p>
              
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;">
                Feeling stuck? Need a hand? Just reply to this email and we'll help you out.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resumeUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00E2B5 0%,#00C9A0 100%);color:#0a0f1c;font-size:15px;font-weight:600;text-decoration:none;border-radius:9999px;">
                      Continue my request →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#a1a1aa;text-align:center;">
                Your progress is saved for 24 hours. After that, you'll need to start over.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
                InstantMed · Online GP consultations<br>
                <a href="https://instantmed.com.au" style="color:#00E2B5;text-decoration:none;">instantmed.com.au</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

function getServiceName(service: string): string {
  const names: Record<string, string> = {
    "medical-certificate": "medical certificate",
    prescriptions: "prescription",
    pathology: "pathology referral",
    referrals: "specialist referral",
  }
  return names[service] || "request"
}

export default FormRecoveryEmail
