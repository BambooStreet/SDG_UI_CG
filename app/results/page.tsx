"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Target, ArrowRight } from "lucide-react"

export default function ResultsPage() {
  const router = useRouter()
  const [ended, setEnded] = useState<any>(null)

  useEffect(() => {
    const raw = localStorage.getItem("lastEnded")
    if (!raw) {
      router.replace("/")
      return
    }
    setEnded(JSON.parse(raw))
  }, [router])

  const results = useMemo(() => {
    if (!ended) return null
    const r = ended.result ?? {}
    const players = ended.publicState?.players ?? []
    const myName = ended.privateState?.myName ?? "You"
    const votes: Record<string, string> = r.votes ?? {}

    return {
      winnerSide: r.winnerSide ?? "citizens",
      liar: r.liar ?? null,
      topic: r.topic ?? ended.publicState?.topic ?? "",
      keyword: r.keyword ?? ended.privateState?.keyword ?? "",
      suspect: r.suspect ?? null,
      players,
      myName,
      votes,
    }
  }, [ended])

  if (!results) return null

  const winnerTitle =
    results.winnerSide === "citizens" ? "Citizens Win!" : "Liar Wins!"

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="border-2 border-chart-4/50 bg-chart-4/5">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-chart-4/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-chart-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-balance">{winnerTitle}</CardTitle>
            <CardDescription className="text-base mt-2">
              {results.winnerSide === "citizens"
                ? "The liar has been successfully identified"
                : "The liar escaped the vote"}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-lg">The Liar</CardTitle>
                  <CardDescription className="text-sm">Revealed at the end</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{results.liar ?? "Unknown"}</span>
                <Badge variant="destructive">Liar</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-full bg-chart-1/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <CardTitle className="text-lg">Topic & Keyword</CardTitle>
                  <CardDescription className="text-sm">What was discussed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Topic:</span>
                <p className="font-medium">{results.topic}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Keyword:</span>
                <p className="font-medium">{results.keyword}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voting Results</CardTitle>
            <CardDescription>How each player voted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.players.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <span className="font-medium">{p.name === results.myName ? "You" : p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    voted for {results.votes[p.name] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={() => router.push("/survey")} className="gap-2">
            Continue to Survey
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  )
}
