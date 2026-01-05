"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatTranscript } from "./chat-transcript"
import { Send } from "lucide-react"

interface Message {
  id: string
  sender: "user" | "ai"
  name?: string
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  messages: Message[]
  onSend: (text: string) => void
  disabled?: boolean
  statusText?: string
}

export function ChatPanel({ messages, onSend, disabled, statusText }: ChatPanelProps) {
  const [message, setMessage] = useState("")

  // ✅ ChatTranscript에 맞게 변환
  const formattedMessages = useMemo(() => {
    return messages.map((msg) => ({
      id: msg.id,
      sender: msg.sender === "user" ? (msg.name ?? "You") : (msg.name ?? "AI"),
      content: msg.content,
      timestamp: msg.timestamp,
      isAI: msg.sender === "ai",
    }))
  }, [messages])

  const handleSendMessage = () => {
    if (disabled) return
    const text = message.trim()
    if (!text) return
    setMessage("")
    onSend(text)
  }

  return (
    <div className="h-full flex flex-col bg-background max-w-4xl mx-auto">
      <div className="flex-1 overflow-hidden">
        <ChatTranscript messages={formattedMessages} />
      </div>

      <div className="border-t border-border bg-card p-4">
        {statusText && <div className="mb-2 text-xs text-muted-foreground">{statusText}</div>}

        <div className="flex gap-2 mb-2">
          <Input
            value={message}
            disabled={!!disabled}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (disabled) return
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={disabled ? "Waiting for your turn…" : "Type your message..."}
            className="flex-1"
          />

          <Button
            type="button"
            disabled={!!disabled || !message.trim()}
            onClick={handleSendMessage}
            size="icon"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
