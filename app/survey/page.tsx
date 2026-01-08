"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ClipboardList } from "lucide-react"
import { logEvent } from "@/lib/api"
import surveyItems from "@/data/survey_item.json"

type SurveySection = Record<string, Record<string, string>>

const POST_SURVEY = (surveyItems as { post_survey: SurveySection }).post_survey

const parseNumberedOptions = (text: string) => {
  const matches = [...text.matchAll(/(\d+)\s*=\s*([^,]+)/g)]
  if (matches.length < 2) return null
  return matches.map((match) => ({ value: match[1], label: match[2].trim() }))
}

const stripNumberedOptions = (text: string) => {
  const start = text.indexOf("1=")
  if (start === -1) return text.trim()
  return text.slice(0, start).trim()
}

export default function SurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string>>({})

  const sections = useMemo(() => {
    return Object.entries(POST_SURVEY).map(([sectionKey, items]) => ({
      key: sectionKey,
      questions: Object.entries(items).map(([id, text]) => ({ id, text, responseKey: `${sectionKey}.${id}` })),
    }))
  }, [])

  const handleSubmit = async () => {
    const sessionId = localStorage.getItem("sessionId")
    if (sessionId) {
      const payload = sections.reduce<Record<string, Record<string, string>>>((acc, section) => {
        const sectionResponses: Record<string, string> = {}
        section.questions.forEach((question) => {
          const value = responses[question.responseKey]
          if (value) sectionResponses[question.id] = value
        })
        if (Object.keys(sectionResponses).length > 0) acc[section.key] = sectionResponses
        return acc
      }, {})

      await logEvent({ sessionId, type: "POST_SURVEY", payload })
    }
    router.push("/complete")
  }

  const requiredIds = sections.flatMap((section) => section.questions.map((question) => question.responseKey))
  const isComplete = requiredIds.every((id) => Boolean(responses[id]))

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
            {sections.map((section) => (
              <div key={section.key} className="space-y-6">
                {section.questions.map((question) => {
                  const numberedOptions = parseNumberedOptions(question.text)
                  const bipolarMatch = question.text.match(/(.+)\s*(?:↔|<->)\s*(.+)/)
                  const labelText = numberedOptions ? stripNumberedOptions(question.text) : question.text
                  const idBase = question.responseKey.replace(/\./g, "-")

                  return (
                    <div key={question.id} className="space-y-3">
                      <Label className="text-base font-medium">{labelText}</Label>
                      {numberedOptions ? (
                        <RadioGroup
                          value={responses[question.responseKey] ?? ""}
                          onValueChange={(value) => setResponses({ ...responses, [question.responseKey]: value })}
                        >
                          <div className="grid grid-cols-3 gap-3">
                            {numberedOptions.map((option) => (
                              <div key={option.value} className="flex flex-col items-center gap-1">
                                <RadioGroupItem value={option.value} id={`${idBase}-${option.value}`} />
                                <Label
                                  htmlFor={`${idBase}-${option.value}`}
                                  className="text-xs cursor-pointer text-muted-foreground text-center"
                                >
                                  {option.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : bipolarMatch ? (
                        <RadioGroup
                          value={responses[question.responseKey] ?? ""}
                          onValueChange={(value) => setResponses({ ...responses, [question.responseKey]: value })}
                        >
                          <div className="grid grid-cols-7 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                              <div key={score} className="flex flex-col items-center gap-1">
                                <RadioGroupItem value={score.toString()} id={`${idBase}-${score}`} />
                                <Label
                                  htmlFor={`${idBase}-${score}`}
                                  className="text-[10px] cursor-pointer text-muted-foreground"
                                >
                                  {score}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{bipolarMatch[1].trim()}</span>
                            <span>{bipolarMatch[2].trim()}</span>
                          </div>
                        </RadioGroup>
                      ) : (
                        <RadioGroup
                          value={responses[question.responseKey] ?? ""}
                          onValueChange={(value) => setResponses({ ...responses, [question.responseKey]: value })}
                        >
                          <div className="grid grid-cols-7 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                              <div key={score} className="flex flex-col items-center gap-1">
                                <RadioGroupItem value={score.toString()} id={`${idBase}-${score}`} />
                                <Label
                                  htmlFor={`${idBase}-${score}`}
                                  className="text-xs cursor-pointer text-muted-foreground"
                                >
                                  {score}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
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
