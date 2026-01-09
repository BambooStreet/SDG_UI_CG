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

const POST_SURVEY = (surveyItems as { post_survey: SurveySection }).post_survey

const stripLeadingCondition = (text: string) =>
  text
    .replace(/^\s*\(\s*(Only if|If)\b[^)]*\)\s*/i, "")
    .replace(/^\s*(Only if|If)\s+U\d+\s*=\s*Yes\b[:.)-]*\s*/i, "")
    .replace(/^\s*\)\s*/, "")
    .trim()
const normalizeQuestionText = (text: string) =>
  stripLeadingCondition(text).replace(/\bU\d+\s*=\s*Yes\b/gi, "").replace(/\s+/g, " ").trim()

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

export default function SurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId")
    if (!sessionId) return
    const key = `postSurveyStartedAt:${sessionId}`
    if (localStorage.getItem(key)) return
    const startedAt = new Date().toISOString()
    localStorage.setItem(key, startedAt)
    logEvent({ sessionId, type: "POST_SURVEY_STARTED", ts: startedAt }).catch(() => {})
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pageIndex])

  const sections = useMemo(() => {
    return Object.entries(POST_SURVEY).map(([sectionKey, items]) => ({
      key: sectionKey,
      questions: Object.entries(items).map(([id, text]) => ({ id, text, responseKey: `${sectionKey}.${id}` })),
    }))
  }, [])

  const pages = useMemo(() => {
    const messageStrength = sections.find((section) => section.key === "message_strength")
    const attitudeKeys = ["attitude_clarity", "attitude_correctness", "susceptibility_consensus"]
    const attitudeSections = sections.filter((section) => attitudeKeys.includes(section.key))
    const otherSections = sections.filter(
      (section) => section.key !== "message_strength" && !attitudeKeys.includes(section.key),
    )
    const perPage = Math.ceil(otherSections.length / 2)
    const pagesList = [
      otherSections.slice(0, perPage),
      otherSections.slice(perPage),
    ].filter((page) => page.length > 0)
    if (attitudeSections.length > 0) pagesList.push(attitudeSections)
    if (messageStrength) pagesList.push([messageStrength])
    return pagesList
  }, [sections])

  const currentSections = pages[pageIndex] ?? []
  const isMessageStrengthPage =
    currentSections.length === 1 && currentSections[0]?.key === "message_strength"

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
  const pageRequiredIds = currentSections.flatMap((section) => section.questions.map((question) => question.responseKey))
  const isPageComplete = pageRequiredIds.every((id) => Boolean(responses[id]))

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
            {isMessageStrengthPage || pageIndex === 0 || pageIndex === 1 ? (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                <p>
                  The following questions concern the AI agents you interacted with during the game.
                </p>
                <p className="mt-2 font-medium">
                  Based on your experience in the game, please respond honestly.
                </p>
              </div>
            ) : null}
            {currentSections.map((section) => (
              <div key={section.key} className="space-y-6">
                {section.key === "attitude_clarity" ? (
                  <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                    <p>
                      The following questions ask about your general attitudes and beliefs.
                    </p>
                    <p className="mt-2 font-medium">
                      Please respond based on your usual thoughts and experiences.
                    </p>
                  </div>
                ) : null}
                {section.questions.map((question) => {
                  const numberedOptions = parseNumberedOptions(question.text)
                  const bipolarMatch = question.text.match(/(.+)\s*(?:↔|<->)\s*(.+)/)
                  const labelText = numberedOptions
                    ? stripLeadingCondition(stripNumberedOptions(question.text))
                    : stripLeadingCondition(question.text)
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
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>1 = Strongly disagree</span>
                            <span>7 = Strongly agree</span>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-4">
          {pageIndex > 0 && (
            <Button size="lg" variant="outline" onClick={() => setPageIndex((prev) => prev - 1)}>
              Back
            </Button>
          )}
          {pageIndex < pages.length - 1 ? (
            <Button size="lg" onClick={() => setPageIndex((prev) => prev + 1)} disabled={!isPageComplete}>
              Next
            </Button>
          ) : (
            <Button size="lg" onClick={handleSubmit} disabled={!isComplete}>
              Submit Survey
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
