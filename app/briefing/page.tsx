"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Lock, Unlock, MessageSquare } from "lucide-react"
import { startSession, logEvent } from "@/lib/api"


export default function BriefingPage() {
  const router = useRouter()
  const [roleRevealed, setRoleRevealed] = useState(false)
  const [topicRevealed, setTopicRevealed] = useState(false)

  // Mock data - 나중에 실제 데이터로 교체
  const isLiar = false // 50% 확률로 라이어
  const topic = "Animal"
  const keyword = isLiar ? "???" : "Cat"

const handleStartChat = async () => {
  if (!roleRevealed || !topicRevealed) return

  // 이미 세션이 있으면 재사용(새로 시작이면 지워도 됨)
  const existing = localStorage.getItem("sessionId") ?? undefined

  const { sessionId } = await startSession({
    consentedAt: new Date().toISOString(),
    ua: navigator.userAgent,
    condition: "default",
    sessionId: existing,
  })

  localStorage.setItem("sessionId", sessionId)

  // (선택) 브리핑 완료 이벤트 남기기
  await logEvent({
    sessionId,
    type: "BRIEFING_COMPLETED",
    payload: { roleRevealed, topicRevealed },
  })

  router.push("/play")
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">Game Briefing</h1>
          <p className="text-muted-foreground">Review your role and game information before starting</p>
        </div>

        <div className="space-y-6">
          {/* Role Card */}
          <Card className="border-2 transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-medium">
                {roleRevealed ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
                Your Role
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!roleRevealed ? (
                <div className="space-y-4">
                  <p className="leading-relaxed text-muted-foreground">
                    Click the button below to reveal your role for this round. Your role determines whether you know the
                    keyword or not.
                  </p>
                  <Button onClick={() => setRoleRevealed(true)} className="w-full" size="lg">
                    <Eye className="mr-2 h-4 w-4" />
                    Reveal My Role
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 rounded-lg bg-muted/50 p-6">
                    <Badge variant={isLiar ? "destructive" : "default"} className="px-4 py-2 text-lg font-medium">
                      {isLiar ? "You are the LIAR" : "You are a CITIZEN"}
                    </Badge>
                  </div>
                  <p className="text-center text-sm leading-relaxed text-muted-foreground">
                    {isLiar
                      ? "Your goal is to blend in without knowing the keyword. Try to participate naturally in the conversation."
                      : "Your goal is to identify the liar while discussing the keyword naturally."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topic & Keyword Card */}
          <Card className="border-2 transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-medium">
                {topicRevealed ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
                Topic & Keyword
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!topicRevealed ? (
                <div className="space-y-4">
                  <p className="leading-relaxed text-muted-foreground">
                    Click the button below to reveal the topic and your keyword. If you are a citizen, you will see the
                    keyword. If you are the liar, the keyword will be hidden.
                  </p>
                  <Button onClick={() => setTopicRevealed(true)} className="w-full" size="lg" disabled={!roleRevealed}>
                    <Eye className="mr-2 h-4 w-4" />
                    Reveal Topic & Keyword
                  </Button>
                  {!roleRevealed && (
                    <p className="text-center text-xs text-muted-foreground">You must reveal your role first</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-card p-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Topic</p>
                      <p className="text-lg font-medium text-foreground">{topic}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Keyword</p>
                      <p className={`text-lg font-medium ${isLiar ? "text-muted-foreground" : "text-primary"}`}>
                        {keyword}
                      </p>
                    </div>
                  </div>
                  {isLiar && (
                    <p className="text-center text-sm leading-relaxed text-muted-foreground">
                      As the liar, you don't know the keyword. Listen carefully and try to blend in!
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Start Chat Button */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Button
            size="lg"
            className="h-12 px-8 text-base"
            onClick={handleStartChat}
            disabled={!roleRevealed || !topicRevealed}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Start Chat
          </Button>
          {(!roleRevealed || !topicRevealed) && (
            <p className="text-sm text-muted-foreground">Please reveal all information before starting</p>
          )}
        </div>
      </div>
    </div>
  )
}
