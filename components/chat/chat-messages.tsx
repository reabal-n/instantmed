"use client"

import { AnimatePresence } from "framer-motion"
import { DraftResume } from "@/components/chat/draft-resume"
import { MedicationSearchInline } from "@/components/chat/medication-search-inline"
import { SmartDateSuggestions } from "@/components/chat/smart-date-suggestions"
import { DoctorNotesPreview } from "@/components/chat/doctor-notes-preview"
import { MessageBubble } from "@/components/chat/message-bubble"
import { ChatTypingIndicator } from "@/components/chat/typing-indicator"
import { useChatIntakeContext, LONG_RESPONSE_THRESHOLD_MS } from "@/components/chat/chat-intake-context"

export function ChatMessages() {
  const {
    messages,
    isLoading,
    isTyping,
    loadingDuration,
    serviceType,
    collectedData,
    showDraftResume,
    savedDraft,
    showMedicationSearch,
    setShowMedicationSearch,
    showDateSuggestions,
    setShowDateSuggestions,
    sendMessage,
    retryLastMessage,
    resumeDraft,
    startNewFromDraft,
    messagesEndRef,
  } = useChatIntakeContext()

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {/* Draft resume prompt */}
      {showDraftResume && savedDraft && (
        <DraftResume
          draft={savedDraft}
          onResume={(draft) => resumeDraft(draft)}
          onStartNew={() => startNewFromDraft()}
        />
      )}

      {!showDraftResume &&
        messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLatest={idx === messages.length - 1}
            isLoading={isLoading}
            onRetry={message.error ? retryLastMessage : undefined}
          />
        ))}

      {/* Smart date suggestions */}
      {!isLoading && showDateSuggestions && (
        <SmartDateSuggestions
          onSelect={(date) => {
            sendMessage(date)
            setShowDateSuggestions(false)
          }}
        />
      )}

      {/* Medication search inline */}
      {!isLoading && showMedicationSearch && (
        <MedicationSearchInline
          onSelect={(med) => {
            sendMessage(`${med.drug_name} ${med.strength}`)
            setShowMedicationSearch(false)
          }}
        />
      )}

      {/* Doctor notes preview */}
      {serviceType && Object.keys(collectedData).length > 0 && !isLoading && (
        <DoctorNotesPreview
          serviceType={serviceType}
          collectedData={collectedData}
        />
      )}

      <AnimatePresence>
        {isTyping && (
          <ChatTypingIndicator
            showStillThinking={loadingDuration >= LONG_RESPONSE_THRESHOLD_MS}
          />
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  )
}
