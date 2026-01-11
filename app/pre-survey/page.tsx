"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ClipboardList } from "lucide-react"
import { logEvent } from "@/lib/api"
import surveyItems from "@/data/survey_item.json"

type SurveySection = Record<string, Record<string, string>>

const PRE_SURVEY = (surveyItems as { pre_survey: SurveySection }).pre_survey

const stripLeadingCondition = (text: string) =>
  text
    .replace(/^\s*\(\s*(Only if|If)\b[^)]*\)\s*/i, "")
    .replace(/^\s*(Only if|If)\s+U\d+\s*=\s*Yes\b[:.)-]*\s*/i, "")
    .replace(/^\s*\)\s*/, "")
    .trim()
const stripInputMarker = (text: string) => text.replace(/^\s*\[(text|number)\]\s*/i, "").trim()
const normalizeQuestionText = (text: string) =>
  stripLeadingCondition(stripInputMarker(text)).replace(/\bU\d+\s*=\s*Yes\b/gi, "").replace(/\s+/g, " ").trim()

const parseNumberedOptions = (text: string) => {
  const cleaned = normalizeQuestionText(text)
  const matches = [...cleaned.matchAll(/(\d+)\s*=\s*([^,]+)/g)]
  if (matches.length < 2) return null
  return matches.map((match) => ({
    value: match[1],
    label: match[2].replace(/^[()\s]+/, "").replace(/[()\s]+$/, "").trim(),
  }))
}

const stripNumberedOptions = (text: string) => {
  const cleaned = normalizeQuestionText(text)
  const start = cleaned.indexOf("1=")
  if (start === -1) return cleaned.trim()
  const trimmed = cleaned.slice(0, start).trim()
  return trimmed.replace(/\(\s*$/, "").trim()
}

const stripYesNo = (text: string) => text.replace(/\s*\(y\/n\)/gi, "").trim()
const formatSectionTitle = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())

export default function PreSurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const u1 = responses["use_of_ai.U1"]
  const u2 = responses["use_of_ai.U2"]

  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId")
    if (!sessionId) return
    const key = `preSurveyStartedAt:${sessionId}`
    if (localStorage.getItem(key)) return
    const startedAt = new Date().toISOString()
    localStorage.setItem(key, startedAt)
    logEvent({ sessionId, type: "PRE_SURVEY_STARTED", ts: startedAt }).catch(() => {})
  }, [])

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
          <CardContent className="pt-6 space-y-10">
            {sections.map((section) => (
              <div key={section.key} className="rounded-lg border border-border/70 bg-muted/20 p-5 space-y-6">
                <div className="text-sm font-semibold tracking-wide text-muted-foreground">
                  {formatSectionTitle(section.key)}
                </div>
                {section.questions.map((question) => {
                  if (!isVisible(question.responseKey)) return null

                  const inputMatch = question.text.match(/^\s*\[(text|number)\]\s*/i)
                  const inputType = inputMatch?.[1]?.toLowerCase()
                  const yesNo = /\(y\/n\)/i.test(question.text)
                  const numberedOptions = parseNumberedOptions(question.text)
                  const bipolarMatch = question.text.match(/(.+)\s*(?:↔|<->)\s*(.+)/)
                  const isGender = question.responseKey === "demographics.D1"
                  const isAgeGroup = question.responseKey === "demographics.D3"
                  const isEducation = question.responseKey === "demographics.D5"
                  const labelText = numberedOptions
                    ? stripLeadingCondition(stripNumberedOptions(question.text))
                    : yesNo
                      ? stripLeadingCondition(stripYesNo(question.text))
                      : stripLeadingCondition(stripInputMarker(question.text))
                  const idBase = question.responseKey.replace(/\./g, "-")

                  return (
                    <div key={question.id} className="space-y-3">
                      <Label className="text-base font-medium leading-6">{labelText}</Label>
                      {inputType ? (
                        <Input
                          type={inputType === "number" ? "number" : "text"}
                          value={responses[question.responseKey] ?? ""}
                          onChange={(event) => setResponses({ ...responses, [question.responseKey]: event.target.value })}
                        />
                      ) : yesNo ? (
                        <RadioGroup
                          value={responses[question.responseKey] ?? ""}
                          onValueChange={(value) => setResponses({ ...responses, [question.responseKey]: value })}
                        >
                          <div className="grid grid-cols-2 gap-3 max-w-sm">
                            {[
                              { value: "y", label: "Yes" },
                              { value: "n", label: "No" },
                            ].map((option) => (
                              <div key={option.value} className="flex flex-col items-center gap-1 text-center">
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
                          <div
                            className={
                              isGender
                                ? "grid grid-cols-3 gap-2"
                                : isAgeGroup
                                  ? "grid grid-cols-5 gap-2"
                                  : isEducation
                                    ? "grid grid-cols-4 gap-2"
                                    : "grid grid-cols-3 gap-3"
                            }
                          >
                            {numberedOptions.map((option) => (
                              <div key={option.value} className="flex flex-col items-center gap-2">
                                <RadioGroupItem value={option.value} id={`${idBase}-${option.value}`} />
                                <Label
                                  htmlFor={`${idBase}-${option.value}`}
                                  className="text-xs cursor-pointer text-muted-foreground text-center leading-4"
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
                          <div className="grid grid-cols-7 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                              <div key={score} className="flex flex-col items-center gap-2">
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
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>{bipolarMatch[1].trim()}</span>
                            <span>{bipolarMatch[2].trim()}</span>
                          </div>
                        </RadioGroup>
                      ) : (
                        <RadioGroup
                          value={responses[question.responseKey] ?? ""}
                          onValueChange={(value) => setResponses({ ...responses, [question.responseKey]: value })}
                        >
                          <div className="grid grid-cols-7 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                              <div key={score} className="flex flex-col items-center gap-2">
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
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>Strongly disagree</span>
                            <span>Strongly agree</span>
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
