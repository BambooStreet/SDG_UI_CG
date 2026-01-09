"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function HeroSection() {
  const router = useRouter()

  const handleStartGame = () => {
    router.push("/consent")
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-4">
          <h1 className="font-serif text-5xl font-light tracking-tight text-foreground text-balance md:text-6xl lg:text-7xl">
            Liar Game Experiment
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            A social deduction game study with AI agents
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Button size="lg" className="h-12 px-8 text-base" onClick={handleStartGame}>
            Start Game
          </Button>
          <p className="text-sm text-muted-foreground">Estimated time: about 10 minutes</p>
        </div>
      </div>
    </section>
  )
}
