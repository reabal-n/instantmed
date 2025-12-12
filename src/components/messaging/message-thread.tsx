'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { Send, Loader2, Bot, User, ShieldCheck } from 'lucide-react'
import type { Message } from '@/lib/messaging/types'

interface MessageThreadProps {
  intakeId: string
  patientId: string
  canSendMessages?: boolean
}

export function MessageThread({
  intakeId,
  patientId,
  canSendMessages = true,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!supabase) return

      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (
            full_name,
            role
          )
        `)
        .eq('intake_id', intakeId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data as Message[])
      }
      setIsLoading(false)
    }

    fetchMessages()
  }, [intakeId, supabase])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`messages:${intakeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `intake_id=eq.${intakeId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data: newMsg } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!sender_id (
                full_name,
                role
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMsg && !newMsg.is_internal) {
            setMessages((prev) => [...prev, newMsg as Message])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [intakeId, supabase])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark messages as read
  useEffect(() => {
    const markRead = async () => {
      if (!supabase || messages.length === 0) return

      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('intake_id', intakeId)
        .in('sender_type', ['admin', 'system'])
        .eq('is_read', false)
    }

    markRead()
  }, [intakeId, messages, supabase])

  const handleSend = async () => {
    if (!newMessage.trim() || !supabase) return

    setIsSending(true)

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId,
          content: newMessage.trim(),
          senderType: 'patient',
        }),
      })

      if (response.ok) {
        setNewMessage('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm mt-1">
              Send a message if you have any questions
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender_id === patientId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {canSendMessages ? (
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[80px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="h-auto"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center py-4 border-t text-sm text-muted-foreground">
          This conversation is closed
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const isSystem = message.sender_type === 'system'
  const isAdmin = message.sender_type === 'admin'

  // System messages have different styling
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="flex items-start gap-2 max-w-[90%] p-3 rounded-lg bg-muted/50 border">
          <Bot className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatRelativeTime(message.created_at)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwnMessage && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10">
            {isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-primary" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOwnMessage
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {!isOwnMessage && message.sender && (
          <p className="text-xs font-medium mb-1">
            {isAdmin ? 'Dr. ' : ''}
            {message.sender.full_name}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            'text-xs mt-1',
            isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatRelativeTime(message.created_at)}
        </p>
      </div>

      {isOwnMessage && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback>
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
