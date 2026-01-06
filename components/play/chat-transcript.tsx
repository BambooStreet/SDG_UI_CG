"use client"

import { useEffect, useRef } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
  isAI: boolean
  isSystem?: boolean
  isTyping?: boolean
}

interface ChatTranscriptProps {
  messages: Message[]
}

export function ChatTranscript({ messages }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Bot className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground">No messages yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            The conversation will begin once all players are ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        if (message.isSystem) {
          return (
            <div key={message.id} className="flex items-center gap-3 py-2">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {message.content}
              </span>
              <div className="h-px bg-border flex-1" />
            </div>
          )
        }

        return (
          <div key={message.id} className={cn("flex gap-3", !message.isAI && "flex-row-reverse")}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback
                className={cn(message.isAI ? "bg-primary/10 text-primary" : "bg-accent/50 text-accent-foreground")}
              >
                {message.isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div className={cn("flex flex-col gap-1 max-w-[80%]", !message.isAI && "items-end")}>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-foreground">{message.sender}</span>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm leading-relaxed",
                  message.isAI ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {message.isTyping ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                ) : (
                  message.content
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
