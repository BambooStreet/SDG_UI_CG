"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatPanel } from "@/components/play/chat-panel"
import { MidCheckDialog } from "@/components/play/mid-check-dialog"
import { FinalVoteDialog } from "@/components/play/final-vote-dialog"
import { PhaseInfoDialog } from "@/components/play/phase-info-dialog"
import { LoadingState } from "@/components/play/loading-state"
import { ErrorState } from "@/components/play/error-state"
import { logEvent } from "@/lib/api"

type ServerPhase = "DESCRIPTION" | "DISCUSSION" | "VOTING" | "ENDED"

// PhaseInfoDialog이 기존에 기대하는 phase string (연출용)
type GamePhase =
  | "explanation-intro"
  | "explanation"
  | "mid-check"
  | "discussion-intro"
  | "discussion"
  | "final-vote"
  | "complete"

type ApiMsg = { sender: "user" | "ai" | "system"; name: string; content: string }

type LocalMsg = {
  id: string
  sender: "user" | "ai"
  name?: string
  content: string
  timestamp: Date
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export default function PlayPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)

  const [phase, setPhase] = useState<ServerPhase>("DESCRIPTION")
  const [publicState, setPublicState] = useState<any>(null)
  const [privateState, setPrivateState] = useState<any>(null)
  const [uiNeed, setUiNeed] = useState<string | null>(null)

  const [messages, setMessages] = useState<LocalMsg[]>([])

  const [showPhaseInfo, setShowPhaseInfo] = useState(false)
  const [phaseInfoKind, setPhaseInfoKind] = useState<GamePhase>("explanation-intro")
  const shownIntroRef = useRef({ explanation: false, discussion: false })

  const [showMidCheck, setShowMidCheck] = useState(false)
  const [showFinalVote, setShowFinalVote] = useState(false)

  const pumpingRef = useRef(false)

  // 메시지 “한꺼번에 append” 말고, UI에 자연스럽게 조금씩 뿌리기(가독성)
  const msgQueueRef = useRef<ApiMsg[]>([])
  const flushingRef = useRef(false)

  const myName = privateState?.myName as string | undefined
  const currentPlayer = publicState?.turn?.currentPlayer as string | undefined

  const isMyTurn =
    (phase === "DESCRIPTION" || phase === "DISCUSSION") &&
    !!myName &&
    !!currentPlayer &&
    myName === currentPlayer &&
    !showPhaseInfo &&
    !showMidCheck &&
    !showFinalVote &&
    uiNeed !== "mid-check"

  const headerPhaseLabel = useMemo(() => {
    if (phase === "DESCRIPTION") return "explanation"
    if (phase === "DISCUSSION") return "discussion"
    if (phase === "VOTING") return "voting"
    return "ended"
  }, [phase])

  const gameState = useMemo(() => {
    const players = publicState?.players ?? []
    const aiPlayers = players.filter((p: any) => p.is_ai).map((p: any) => ({ id: p.name, name: p.name }))
    return {
      round: publicState?.round ?? 1,
      topic: publicState?.topic ?? "",
      aiPlayers,
    }
  }, [publicState])

  function pushOneLocalMessage(m: ApiMsg) {
    const now = Date.now()
    const isUser = m.sender === "user"
    const sender: "user" | "ai" = isUser ? "user" : "ai"
    const name = isUser ? (myName ?? "You") : (m.name || "System")
    const content = m.sender === "system" ? `[SYSTEM] ${m.content}` : m.content

    setMessages((prev) => [
      ...prev,
      {
        id: `${now}-${Math.random().toString(16).slice(2)}`,
        sender,
        name,
        content,
        timestamp: new Date(),
      },
    ])
  }

  async function flushQueue() {
    if (flushingRef.current) return
    flushingRef.current = true
    try {
      while (msgQueueRef.current.length > 0) {
        const m = msgQueueRef.current.shift()!
        pushOneLocalMessage(m)
        // 메시지 사이 약간 템포
        await sleep(120)
      }
    } finally {
      flushingRef.current = false
    }
  }

  function enqueueApiMessages(apiMessages: ApiMsg[]) {
    msgQueueRef.current.push(...apiMessages)
    flushQueue().catch(() => {})
  }

  function applyServerResponse(data: any) {
    setPhase(data.phase)
    setPublicState(data.publicState)
    setPrivateState(data.privateState)
    setUiNeed(data.ui?.need ?? null)

    if (Array.isArray(data.messages) && data.messages.length) {
      enqueueApiMessages(data.messages)
    }

    // mid-check 필요
    if (data.ui?.need === "mid-check") {
      setShowMidCheck(true)
    }

    // 투표
    if (data.phase === "VOTING") {
      setShowFinalVote(true)
    }

    if (data.phase === "ENDED") {
      router.push("/results")
    }
  }

  async function callStep(action?: any) {
    if (!sessionId) return null

    const res = await fetch("/api/game/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: action ?? { type: "noop" } }),
    })

    if (!res.ok) {
      const text = await res.text()
      // 내 턴 아니면 409가 뜰 수 있으니 “에러로 죽이지 말고” 그냥 반환
      if (res.status === 409) return { __conflict: true, raw: text }
      throw new Error(text)
    }

    const data = await res.json()
    applyServerResponse(data)
    return data
  }

  /**
   * ✅ AI 턴 자동 진행
   * - 핵심: noop을 여러 번 호출해서(가능하면 1 AI step씩) 메시지가 “생성되는 즉시” 화면에 들어오게
   * - showMidCheck / showFinalVote / showPhaseInfo 떠있으면 멈춤
   */
  async function pumpAI(max = 30) {
    if (!sessionId) return
    if (pumpingRef.current) return
    if (showPhaseInfo || showMidCheck || showFinalVote) return
    if (uiNeed === "mid-check") return
    if (phase === "VOTING" || phase === "ENDED") return
    if (myName && currentPlayer === myName) return

    pumpingRef.current = true
    try {
      for (let i = 0; i < max; i++) {
        if (showPhaseInfo || showMidCheck || showFinalVote) break
        if (uiNeed === "mid-check") break

        // ⭐ 백엔드가 maxAiSteps를 지원하면 “1 step씩 즉시 응답”이 가능해짐
        const data = await callStep({ type: "noop", maxAiSteps: 1 })

        if (!data || data.__conflict) break
        if (data.ui?.need === "mid-check") break
        if (data.phase === "VOTING" || data.phase === "ENDED") break

        const nextMyName = data.privateState?.myName
        const nextCurrent = data.publicState?.turn?.currentPlayer
        if (nextMyName && nextCurrent === nextMyName) break

        // UI 렌더 한 틱 양보
        await sleep(10)
      }
    } finally {
      pumpingRef.current = false
    }
  }

  async function startGame(id: string) {
    const participantName = localStorage.getItem("participantName") ?? "P1"
    const aiCount = Number(localStorage.getItem("aiCount") ?? "3")

    const res = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, participantName, aiCount, useFool: true }),
    })

    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    applyServerResponse(data)

    // ✅ 들어오자마자 “설명 세션 안내 팝업”
    if (!shownIntroRef.current.explanation) {
      shownIntroRef.current.explanation = true
      setPhaseInfoKind("explanation-intro")
      setShowPhaseInfo(true)
      return
    }

    await pumpAI()
  }

  // 최초 진입
  useEffect(() => {
    const id = localStorage.getItem("sessionId")
    if (!id) {
      router.replace("/")
      return
    }
    setSessionId(id)

    logEvent({ sessionId: id, type: "PLAY_ENTERED", payload: { path: "/play" } }).catch(() => {})

    ;(async () => {
      try {
        setIsLoading(true)
        await startGame(id)
      } catch (e: any) {
        setError(String(e?.message ?? e))
      } finally {
        setIsLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // 상태 변화 시 자동 pump
  useEffect(() => {
    if (!sessionId) return
    if (isLoading) return
    if (showPhaseInfo || showMidCheck || showFinalVote) return
    if (uiNeed === "mid-check") return

    if ((phase === "DESCRIPTION" || phase === "DISCUSSION") && myName && currentPlayer && myName !== currentPlayer) {
      pumpAI().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myName, currentPlayer, uiNeed, sessionId, isLoading, showPhaseInfo, showMidCheck, showFinalVote])

  // 채팅 전송(내 턴일 때만)
  async function handleSend(text: string) {
    try {
      if (!isMyTurn) {
        await pumpAI()
        return
      }

      if (phase === "DESCRIPTION") {
        await callStep({ type: "description", text })
        await pumpAI()
        return
      }

      if (phase === "DISCUSSION") {
        await callStep({ type: "discussion", text })
        await pumpAI()
        return
      }
    } catch (e: any) {
      setError(String(e?.message ?? e))
    }
  }

  // mid-check 제출
  async function submitMidCheck(suspectName: string, confidence: number) {
    try {
      setShowMidCheck(false)
      await callStep({ type: "mid_check", suspectName, confidence })

      // ✅ 토론 세션 안내 팝업 1회
      if (!shownIntroRef.current.discussion) {
        shownIntroRef.current.discussion = true
        setPhaseInfoKind("discussion-intro")
        setShowPhaseInfo(true)
        return
      }

      await pumpAI()
    } catch (e: any) {
      setError(String(e?.message ?? e))
    }
  }

  // 투표 제출
  async function submitVote(targetName: string, confidence: number) {
    try {
      setShowFinalVote(false)
      await callStep({ type: "vote", targetName, confidence })
      await pumpAI()
    } catch (e: any) {
      setError(String(e?.message ?? e))
    }
  }

  // ✅ PhaseInfoDialog “버튼이 onOpenChange()를 인자 없이 호출해도” 닫히게 처리
  const handlePhaseInfoOpenChange = async (open?: boolean) => {
    const next = open === true
    setShowPhaseInfo(next)
    if (!next) {
      await pumpAI()
    }
  }

  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />
  if (isLoading || !sessionId) return <LoadingState />
