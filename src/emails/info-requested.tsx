import * as React from 'react'
import {
  EmailLayout,
  Heading,
  Text,
  Button,
  Reference,
  InfoBox,
  Divider,
} from './components'

interface InfoRequestedEmailProps {
  patientName: string
  referenceNumber: string
  serviceName: string
  questions: string[]
  responseUrl: string
  deadline?: string
}

export function InfoRequestedEmail({
  patientName,
  referenceNumber,
  serviceName,
  questions,
  responseUrl,
  deadline,
}: InfoRequestedEmailProps) {
  return (
    <EmailLayout previewText={`Action required: Additional information needed - ${referenceNumber}`}>
      <Heading>Additional Information Needed</Heading>
      
      <Text>Hi {patientName},</Text>
      
      <Text>
        Our doctor has reviewed your {serviceName.toLowerCase()} request and needs 
        a bit more information before we can proceed.
      </Text>

      <Reference number={referenceNumber} />

      <InfoBox variant="warning">
        <strong>Action Required:</strong> Please respond to the questions below to 
        continue processing your request.
      </InfoBox>

      <Text>
        <strong>Questions from your doctor:</strong>
      </Text>
      
      <div
        style={{
          margin: '16px 0',
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        {questions.map((question, index) => (
          <p
            key={index}
            style={{
              margin: index === questions.length - 1 ? 0 : '0 0 12px 0',
              fontSize: '15px',
              color: '#333',
              lineHeight: '22px',
            }}
          >
            {index + 1}. {question}
          </p>
        ))}
      </div>

      <Button href={responseUrl}>Respond Now</Button>

      {deadline && (
        <Text muted>
          Please respond by <strong>{deadline}</strong> to avoid delays in processing 
          your request.
        </Text>
      )}

      <Divider />

      <Text muted>
        If you have any questions, reply to this email or contact us at{' '}
        <a href="mailto:support@instantmed.com.au" style={{ color: '#0d9488' }}>
          support@instantmed.com.au
        </a>
      </Text>
    </EmailLayout>
  )
}

export default InfoRequestedEmail
