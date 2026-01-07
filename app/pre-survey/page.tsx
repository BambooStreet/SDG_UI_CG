"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList } from "lucide-react"
import { logEvent } from "@/lib/api"

export default function PreSurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState({
    ageRange: "",
    gender: "",
    experience: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isComplete = responses.ageRange && responses.experience

  const handleSubmit = async () => {
    if (!isComplete || isSubmitting) return
    setIsSubmitting(true)
    try {
      const sessionId = localStorage.getItem("sessionId")
      if (sessionId) {
        await logEvent({ sessionId, type: "PRE_SURVEY", payload: responses })
      }
      router.push("/instructions")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Pre-Experiment Survey</CardTitle>
            <CardDescription className="text-base mt-2">
              Please answer a few brief questions before starting
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-8">
            <div className="space-y-3">
              <Label className="text-base font-medium">Age range</Label>
              <Select
                value={responses.ageRange}
                onValueChange={(value) => setResponses({ ...responses, ageRange: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-24">18-24</SelectItem>
                  <SelectItem value="25-34">25-34</SelectItem>
                  <SelectItem value="35-44">35-44</SelectItem>
                  <SelectItem value="45-54">45-54</SelectItem>
                  <SelectItem value="55+">55+</SelectItem>
                  <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Gender (optional)</Label>
              <Select
                value={responses.gender}
                onValueChange={(value) => setResponses({ ...responses, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="nonbinary">Non-binary</SelectItem>
                  <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">
                How familiar are you with the Liar Game or social deduction games?
              </Label>
              <RadioGroup
                value={responses.experience}
                onValueChange={(value) => setResponses({ ...responses, experience: value })}
              >
                <div className="grid grid-cols-3 gap-2">
                  {["Not at all", "Somewhat", "Very"].map((label, index) => {
                    const value = String(index + 1)
                    return (
                      <div key={value} className="flex flex-col items-center gap-1">
                        <RadioGroupItem value={value} id={`experience-${value}`} />
                        <Label htmlFor={`experience-${value}`} className="text-xs cursor-pointer text-muted-foreground">
                          {label}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={handleSubmit} disabled={!isComplete || isSubmitting}>
            Continue to Instructions
          </Button>
        </div>
      </div>
    </main>
  )
}
