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
              Study Title: Strategic Decision-Making in the Liar Game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-6">
              <div className="space-y-6 pr-4 text-sm leading-relaxed">
                <div>
                  <h3 className="mb-2 font-medium text-foreground">Purpose of the Study</h3>
                  <p className="text-muted-foreground">
                    You are invited to participate in a research study investigating strategic decision-making and
                    behavioral patterns in competitive game scenarios. This study is conducted by researchers at
                    [University Name] and aims to understand how individuals make decisions under uncertainty and
                    competition.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">What You Will Do</h3>
                  <p className="text-muted-foreground">
                    If you agree to participate, you will engage in a series of rounds in the Liar Game. In each round,
                    you will make strategic decisions and interact with other participants or computer algorithms. The
                    entire experiment will take approximately 15-20 minutes.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">Risks and Benefits</h3>
                  <p className="text-muted-foreground">
                    There are no anticipated risks beyond those encountered in everyday life. While there may be no
                    direct benefits to you, your participation will contribute to scientific understanding of human
                    decision-making processes.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">Confidentiality</h3>
                  <p className="text-muted-foreground">
                    All data collected will be kept strictly confidential. Your responses will be anonymized and stored
                    securely. Only aggregate data will be reported in publications or presentations. No personally
                    identifiable information will be shared.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">Voluntary Participation</h3>
                  <p className="text-muted-foreground">
                    Your participation in this study is entirely voluntary. You may withdraw at any time without penalty
                    or loss of benefits. If you choose to withdraw, your data will be deleted and will not be used in
                    the analysis.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-foreground">Questions and Concerns</h3>
                  <p className="text-muted-foreground">
                    If you have questions about this study, please contact [Principal Investigator Name] at
                    [email@university.edu]. If you have questions about your rights as a research participant, you may
                    contact the Institutional Review Board at [IRB contact information].
                  </p>
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
