'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { FileUploader } from '@/components/attachments/file-uploader'
import { Loader2, CheckCircle, AlertCircle, Upload, FileText } from 'lucide-react'

interface TaskListProps {
  intakeId: string
  questions: Record<string, unknown> | null
  adminNotes: string | null
  requiresDocuments?: boolean
}

export function TaskList({ intakeId, questions, adminNotes, requiresDocuments = false }: TaskListProps) {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [showUploader, setShowUploader] = useState(requiresDocuments)

  // Parse questions (could be array or object)
  const questionList = Array.isArray(questions)
    ? questions
    : questions?.questions
    ? (questions.questions as string[])
    : []

  const handleUploadComplete = (attachment: unknown) => {
    const att = attachment as { id: string }
    setUploadedFiles(prev => [...prev, att.id])
  }

  const handleSubmit = async () => {
    // Validate all questions answered
    const unanswered = questionList.filter((_, idx) => !responses[`q${idx}`]?.trim())
    if (unanswered.length > 0) {
      setError('Please answer all questions before submitting.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/intake/respond-to-info-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId,
          responses: questionList.map((q, idx) => ({
            question: q,
            answer: responses[`q${idx}`],
          })),
          attachmentIds: uploadedFiles,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit responses')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
        <h3 className="mt-4 font-medium">Response Submitted</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you! The doctor will review your additional information.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Admin Notes */}
      {adminNotes && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{adminNotes}</AlertDescription>
        </Alert>
      )}

      {/* Questions */}
      {questionList.length > 0 && (
        <div className="space-y-6">
          {questionList.map((question, idx) => (
            <div key={idx} className="space-y-2">
              <Label htmlFor={`q${idx}`} className="text-base">
                {idx + 1}. {question as string}
              </Label>
              <Textarea
                id={`q${idx}`}
                value={responses[`q${idx}`] || ''}
                onChange={(e) =>
                  setResponses((prev) => ({ ...prev, [`q${idx}`]: e.target.value }))
                }
                placeholder="Enter your response..."
                rows={3}
              />
            </div>
          ))}
        </div>
      )}

      {/* Document Upload Section */}
      {(showUploader || requiresDocuments) && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <Label className="text-base">Upload Documents</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload any supporting documents such as ID, medical records, or photos.
            </p>
            <FileUploader
              intakeId={intakeId}
              onUploadComplete={handleUploadComplete}
              allowedTypes={['id_document', 'medical_record', 'photo', 'other']}
              maxFiles={5}
            />
            {uploadedFiles.length > 0 && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {uploadedFiles.length} file(s) uploaded
              </p>
            )}
          </div>
        </>
      )}

      {/* Add Documents Button (if not already showing) */}
      {!showUploader && !requiresDocuments && questionList.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setShowUploader(true)}
          className="w-full"
        >
          <FileText className="w-4 h-4 mr-2" />
          Add Supporting Documents
        </Button>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      {(questionList.length > 0 || uploadedFiles.length > 0) && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </Button>
      )}

      {/* Empty State */}
      {questionList.length === 0 && !showUploader && !requiresDocuments && (
        <p className="text-muted-foreground">
          The doctor has requested additional information. Please check your messages
          for details.
        </p>
      )}
    </div>
  )
}
