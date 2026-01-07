"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ClipboardList } from "lucide-react"
import { logEvent } from "@/lib/api"

export default function SurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState({
    enjoyment: "",
    difficulty: "",
    fairness: "",
    aiRealism: "",
    feedback: "",
  })

  const handleSubmit = async () => {
    const sessionId = localStorage.getItem("sessionId")
    if (sessionId) {
      await logEvent({ sessionId, type: "POST_SURVEY", payload: responses })
    }
    alert("Thank you for participating in the Liar Game experiment!")
    router.push("/")
  }

  const isComplete = responses.enjoyment && responses.difficulty && responses.fairness && responses.aiRealism

  return (
    <main className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Post-Experiment Survey</CardTitle>
            <CardDescription className="text-base mt-2">
              Please share your experience with the Liar Game experiment
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Survey Questions */}
        <Card>
          <CardContent className="pt-6 space-y-8">
            {/* Question 1: Enjoyment */}
            <div className="space-y-3">
              <Label className="text-base font-medium">How much did you enjoy the game?</Label>
              <RadioGroup
                value={responses.enjoyment}
                onValueChange={(value) => setResponses({ ...responses, enjoyment: value })}
              >
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <RadioGroupItem value={score.toString()} id={`enjoyment-${score}`} />
                      <Label htmlFor={`enjoyment-${score}`} className="text-xs cursor-pointer text-muted-foreground">
                        {score}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Not at all</span>
                  <span>Very much</span>
                </div>
              </RadioGroup>
            </div>

            {/* Question 2: Difficulty */}
            <div className="space-y-3">
              <Label className="text-base font-medium">How difficult was it to identify the liar?</Label>
              <RadioGroup
                value={responses.difficulty}
                onValueChange={(value) => setResponses({ ...responses, difficulty: value })}
              >
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <RadioGroupItem value={score.toString()} id={`difficulty-${score}`} />
                      <Label htmlFor={`difficulty-${score}`} className="text-xs cursor-pointer text-muted-foreground">
                        {score}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Very easy</span>
                  <span>Very difficult</span>
                </div>
              </RadioGroup>
            </div>

            {/* Question 3: Fairness */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Did you feel the game was fair?</Label>
              <RadioGroup
                value={responses.fairness}
                onValueChange={(value) => setResponses({ ...responses, fairness: value })}
              >
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <RadioGroupItem value={score.toString()} id={`fairness-${score}`} />
                      <Label htmlFor={`fairness-${score}`} className="text-xs cursor-pointer text-muted-foreground">
                        {score}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Not fair</span>
                  <span>Very fair</span>
                </div>
              </RadioGroup>
            </div>

            {/* Question 4: AI Realism */}
            <div className="space-y-3">
              <Label className="text-base font-medium">How realistic did the AI players seem?</Label>
              <RadioGroup
                value={responses.aiRealism}
                onValueChange={(value) => setResponses({ ...responses, aiRealism: value })}
              >
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <RadioGroupItem value={score.toString()} id={`realism-${score}`} />
                      <Label htmlFor={`realism-${score}`} className="text-xs cursor-pointer text-muted-foreground">
                        {score}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Not realistic</span>
                  <span>Very realistic</span>
                </div>
              </RadioGroup>
            </div>

            {/* Question 5: Open Feedback */}
            <div className="space-y-3">
              <Label htmlFor="feedback" className="text-base font-medium">
                Additional Comments (Optional)
              </Label>
              <Textarea
                id="feedback"
                placeholder="Please share any additional thoughts or feedback about your experience..."
                value={responses.feedback}
                onChange={(e) => setResponses({ ...responses, feedback: e.target.value })}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={handleSubmit} disabled={!isComplete}>
            Submit Survey
          </Button>
        </div>
      </div>
    </main>
  )
}
