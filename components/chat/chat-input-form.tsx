"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { InputTypingIndicator } from "@/components/chat/typing-indicator"
import { useChatIntakeContext } from "@/components/chat/chat-intake-context"

export function ChatInputForm() {
  const {
    input,
    setInput,
    isLoading,
    handleSubmit,
    inputRef,
    chatId,
  } = useChatIntakeContext()

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t bg-muted/30">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            id={`${chatId}-input`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "" : "Type your message..."}
            disabled={isLoading}
            aria-label="Chat message input"
            aria-describedby={isLoading ? `${chatId}-loading` : undefined}
            className={cn(
              "flex-1 bg-background pr-8 transition-all",
              isLoading && "text-transparent"
            )}
          />
          {/* Inline typing indicator */}
          {isLoading && (
            <div
              id={`${chatId}-loading`}
              className="absolute inset-y-0 left-3 flex items-center"
              aria-label="Assistant is typing"
            >
              <InputTypingIndicator />
            </div>
          )}
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}
