"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ClipboardList } from "lucide-react"
import { logEvent } from "@/lib/api"
import surveyItems from "@/data/survey_item.json"

type SurveySection = Record<string, Record<string, string>>

const PRE_SURVEY = (surveyItems as { pre_survey: SurveySection }).pre_survey

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

const stripYesNo = (text: string) => text.replace(/\s*\(y\/n\)/i, "").trim()

export default function PreSurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const u1 = responses["use_of_ai.U1"]
  const u2 = responses["use_of_ai.U2"]

  const sections = useMemo(() => {
    return Object.entries(PRE_SURVEY).map(([sectionKey, items]) => ({
      key: sectionKey,
      questions: Object.entries(items).map(([id, text]) => ({ id, text, responseKey: `${sectionKey}.${id}` })),
    }))
  }, [])

  const isVisible = (responseKey: string) => {
    if (responseKey === "use_of_ai.U2") return responses["use_of_ai.U1"] === "y"
    if (responseKey === "use_of_ai.U3")
      return responses["use_of_ai.U1"] === "y" && responses["use_of_ai.U2"] === "y"
    return true
  }

  useEffect(() => {
    setResponses((prev) => {
      if (prev["use_of_ai.U1"] !== "y") {
        if (!prev["use_of_ai.U2"] && !prev["use_of_ai.U3"]) return prev
        const next = { ...prev }
        delete next["use_of_ai.U2"]
        delete next["use_of_ai.U3"]
        return next
      }
      if (prev["use_of_ai.U2"] !== "y") {
        if (!prev["use_of_ai.U3"]) return prev
        const next = { ...prev }
        delete next["use_of_ai.U3"]
        return next
      }
      return prev
    })
  }, [u1, u2])

  const visibleQuestionIds = sections.flatMap((section) =>
    section.questions.filter((question) => isVisible(question.responseKey)).map((question) => question.responseKey),
  )

  const isComplete = visibleQuestionIds.every((id) => Boolean(responses[id]))

  const handleSubmit = async () => {
    if (!isComplete || isSubmitting) return
    setIsSubmitting(true)
    try {
      const sessionId = localStorage.getItem("sessionId")
      if (sessionId) {
        const payload = sections.reduce<Record<string, Record<string, string>>>((acc, section) => {
          const sectionResponses: Record<string, string> = {}
          section.questions.forEach((question) => {
            if (!isVisible(question.responseKey)) return
            const value = responses[question.responseKey]
            if (value) sectionResponses[question.id] = value
          })
          if (Object.keys(sectionResponses).length > 0) acc[section.key] = sectionResponses
          return acc
        }, {})

        await logEvent({ sessionId, type: "PRE_SURVEY", payload })
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
            {sections.map((section) => (
              <div key={section.key} className="space-y-6">
                {section.questions.map((question) => {
                  if (!isVisible(question.responseKey)) return null

                  const yesNo = /\(y\/n\)/i.test(question.text)
                  const numberedOptions = parseNumberedOptions(question.text)
                  const bipolarMatch = question.text.match(/(.+)\s*(?:↔|<->)\s*(.+)/)
                  const labelText = numberedOptions
                    ? stripNumberedOptions(question.text)
                    : yesNo
                      ? stripYesNo(question.text)
                      : question.text
                  const idBase = question.responseKey.replace(/\./g, "-")

                  return (
                    <div key={question.id} className="space-y-3">
                      <Label className="text-base font-medium">{labelText}</Label>
                      {yesNo ? (
                        <RadioGroup
                          value={responses[question.responseKey] ?? ""}
                          onValueChange={(value) => setResponses({ ...responses, [question.responseKey]: value })}
                        >
                          <div className="grid grid-cols-2 gap-2 max-w-xs">
                            {[
                              { value: "y", label: "Yes" },
                              { value: "n", label: "No" },
                            ].map((option) => (
                              <div key={option.value} className="flex flex-col items-center gap-1">
                                <RadioGroupItem value={option.value} id={`${idBase}-${option.value}`} />
                                <Label
                                  htmlFor={`${idBase}-${option.value}`}
                                  className="text-xs cursor-pointer text-muted-foreground"
                                >
                                  {option.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : numberedOptions ? (
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
                          <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
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

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={handleSubmit} disabled={!isComplete || isSubmitting}>
            Continue to Instructions
          </Button>
        </div>
      </div>
    </main>
  )
}
