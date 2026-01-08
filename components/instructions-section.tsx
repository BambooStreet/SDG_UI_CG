"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, MessageSquare, Target, Trophy, MessagesSquare} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function InstructionsSection() {
  const router = useRouter()

  const handleBeginExperiment = () => {
    router.push("/briefing")
  }

  return (
    <section className="min-h-screen px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 space-y-2 text-center">
          <h2 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">Liar Game Rules</h2>
          <p className="text-muted-foreground">Please read the rules carefully before starting</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          <Card className="border-2 transition-all hover:shadow-lg">
            <CardContent className="flex flex-col gap-4 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">1. Role Assignment</h3>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                At the start of the game, one participant is randomly assigned as the Liar, while the others become
                Citizens.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg">
            <CardContent className="flex flex-col gap-4 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">2. Checking the Secret Word</h3>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                Citizens are shown a Secret Word on their screen. However, the Liar must start the game without knowing
                what the word is.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg">
            <CardContent className="flex flex-col gap-4 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">3. Description Phase</h3>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <p>All participants take turns providing a one-sentence description of the secret word.</p>
                <p>
                  <span className="font-medium text-foreground">Citizens:</span> Describe the word clearly enough for
                  other citizens to understand, but vaguely enough so the Liar cannot guess it.
                </p>
                <p>
                  <span className="font-medium text-foreground">Liar:</span> Hide your identity. Listen carefully to
                  others' descriptions and pretend to know the word by giving a witty or plausible explanation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg">
            <CardContent className="flex flex-col gap-4 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessagesSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">4. Discussion & Voting</h3>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                Once everyone has finished their descriptions, there will be a free discussion to identify the
                suspected Liar. After the discussion, a final vote will be held to catch the Liar.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg md:col-span-2">
            <CardContent className="flex flex-col gap-4 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">5. Victory Conditions</h3>
              </div>
              <div className="grid gap-3 text-muted-foreground md:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Liar Wins if:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>The person selected by the majority vote is not the Liar.</li>
                    <li>Even if caught, the Liar correctly guesses the Secret Word.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Citizens Win if:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>They successfully identify the Liar AND the Liar fails to guess the Secret Word.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <Button size="lg" className="h-12 px-8 text-base" onClick={handleBeginExperiment}>
            Begin Experiment
          </Button>
          <p className="text-sm text-muted-foreground">Remember: You can withdraw from the study at any time</p>
        </div>
      </div>
    </section>
  )
}
