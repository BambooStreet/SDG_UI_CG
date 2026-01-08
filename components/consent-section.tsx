"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { startSession, logEvent } from "@/lib/api"

export function ConsentSection() {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleProceed = async () => {
    if (!agreed || isSubmitting) return
    setIsSubmitting(true)
    try {
      const existing = localStorage.getItem("sessionId") ?? undefined
      const consentedAt = new Date().toISOString()
      const { sessionId } = await startSession({
        consentedAt,
        ua: navigator.userAgent,
        condition: "default",
        sessionId: existing,
      })
      localStorage.setItem("sessionId", sessionId)
      localStorage.setItem("consentedAt", consentedAt)
      await logEvent({ sessionId, type: "CONSENTED" })
      router.push("/pre-survey")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="min-h-screen px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 space-y-2 text-center">
          <h2 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">Research Consent Form</h2>
          <p className="text-muted-foreground">Please review the following information before participating</p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl font-normal">Informed Consent</CardTitle>
            <CardDescription className="text-base">
              Study Title: Liar Game with AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-6">
              <div className="space-y-6 pr-4 text-sm leading-relaxed">
                <div>
                  <h3 className="mb-2 font-medium text-foreground">Research Information</h3>
                  <p className="text-muted-foreground">
                    The title of this study is "Liar Game with AI." This research aims to examine the effects of
                    human-AI interaction within the specific context of the Liar Game. The study consists of a
                    pre-survey, a brief orientation, the actual Liar Game played with an AI player, and a post-survey.
                    The total duration is expected to be approximately 10 minutes.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">Participant Rights and Safety</h3>
                  <p className="text-muted-foreground">
                    Your participation is entirely voluntary. You may withdraw at any time without any penalty. All
                    data will be anonymized and encrypted, used strictly for research purposes, and managed with high
                    security. There are no foreseeable physical or psychological risks associated with this study.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">Contact Information</h3>
                  <div className="text-muted-foreground space-y-2">
                    <p>If you have any questions, please contact the lead researcher:</p>
                    <div className="space-y-1">
                      <p>Researcher: Seok-ju Hong</p>
                      <p>Affiliation: Dept. of Applied Artificial Intelligence, Sungkyunkwan University (SKKU)</p>
                      <p>Email: ohmyhong1@skku.edu</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border-l-4 border-primary bg-accent/50 p-4">
                  <p className="font-medium text-foreground">
                    By checking the box below, you indicate that you have read and understood this consent form, that
                    you are at least 18 years of age, and that you voluntarily agree to participate in this study.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border bg-accent/30 p-4">
                <Checkbox
                  id="consent"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-1"
                />
                <Label htmlFor="consent" className="cursor-pointer text-sm font-medium leading-relaxed text-foreground">
                  I agree to participate in this research study. I confirm that I am at least 18 years old and have read
                  and understood the information provided above.
                </Label>
              </div>

              <Button size="lg" className="w-full" disabled={!agreed || isSubmitting} onClick={handleProceed}>
                Proceed to Pre-Survey
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
