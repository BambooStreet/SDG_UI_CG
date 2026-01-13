"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ClipboardCheck } from "lucide-react"

// control group, auth = False
// const COMPLETE_URL = "https://connect.cloudresearch.com/participant/project/CEC090330A/complete"
// const COMPLETE_CODE = "CEC090330A"

const COMPLETE_URL = "https://connect.cloudresearch.com/participant/project/A140EFF381/complete"
const COMPLETE_CODE = "A140EFF381"

export default function CompletePage() {
  const [isOpening, setIsOpening] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleOpen = () => {
    setIsOpening(true)
    window.location.href = COMPLETE_URL
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMPLETE_CODE)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1500)
    } catch {
      setIsCopied(false)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Experiment Complete</CardTitle>
            <CardDescription className="text-base mt-2">
              Please complete the final verification step to finish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Completion code</Label>
              <div className="flex items-center gap-3">
                <div className="rounded-md border px-4 py-3 text-lg font-semibold tracking-wide">{COMPLETE_CODE}</div>
                <Button variant="outline" onClick={handleCopy}>
                  {isCopied ? "Copied" : "Copy code"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Click the button below to open the completion page, then enter the code above to verify your
              participation.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={handleOpen} disabled={isOpening}>
            Go to Completion Page
          </Button>
        </div>
      </div>
    </main>
  )
}
