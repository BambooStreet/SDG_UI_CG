// components/play/chat-panel.tsx
"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatTranscript } from "./chat-transcript"
import { Send } from "lucide-react"

interface Message {
  id: string
  sender: "user" | "ai" | "system"
  name?: string
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface ChatPanelProps {
  messages: Message[]
  onSend: (text: string) => void
  disabled?: boolean
  statusText?: string // 있으면 typing 보여주기로 사용
}

export function ChatPanel({ messages, onSend, disabled, statusText }: ChatPanelProps) {
  const [message, setMessage] = useState("")

  const formattedMessages = useMemo(
    () =>
      messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender === "user" ? "You" : msg.sender === "system" ? "System" : (msg.name ?? "AI"),
        content: msg.content,
        timestamp: msg.timestamp,
        isAI: msg.sender === "ai",
        isSystem: msg.sender === "system",
      })),
    [messages]
  )

  // ✅ 여기서 typing indicator를 “마지막 메시지”로 추가
  const transcriptMessages = useMemo(() => {
    if (!statusText) return formattedMessages
    return [
      ...formattedMessages,
      {
        id: "__typing__",
        sender: "AI",
        content: "", // typing은 content 대신 isTyping으로 처리
        timestamp: new Date(),
        isAI: true,
        isTyping: true as const,
      },
    ]
  }, [formattedMessages, statusText])

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
        <ChatTranscript messages={transcriptMessages} />
      </div>

      <div className="border-t border-border bg-card p-4">
        <div className="flex gap-2">
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
          <Button type="button" disabled={!!disabled || !message.trim()} onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
