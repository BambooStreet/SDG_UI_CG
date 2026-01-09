import Link from "next/link"
import { sql } from "@/lib/db"
import { AdminGate } from "@/components/admin/admin-gate"
import surveyItems from "@/data/survey_item.json"

type SurveySection = Record<string, Record<string, string>>

const PRE_SURVEY = (surveyItems as { pre_survey: SurveySection }).pre_survey
const POST_SURVEY = (surveyItems as { post_survey: SurveySection }).post_survey

type SessionRow = {
  session_id: string
  consented_at: string | null
  participant_name: string | null
  game_state: string | null
  event_count: number | null
  last_ts: string | null
  state_json: any
}

type EventRow = {
  ts: string
  type: string
  payload: any
}

type SurveyItem = {
  id: string
  text: string
  value: string
}

type SurveyDisplaySection = {
  key: string
  title: string
  items: SurveyItem[]
}

function getEventTimestamp(events: EventRow[], type: string, mode: "first" | "last") {
  let ts: string | undefined
  for (const event of events) {
    if (event.type !== type) continue
    if (mode === "first") {
      ts = event.ts
    } else {
      return event.ts
    }
  }
  return ts
}

function formatDurationSeconds(start?: string, end?: string) {
  if (!start || !end) return "-"
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "-"
  if (endMs < startMs) return "-"
  return `${Math.round((endMs - startMs) / 1000)}s`
}

function formatTs(ts?: string | null) {
  if (!ts) return "-"
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString()
}

function formatSectionTitle(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildSurveySections(
  payload: Record<string, Record<string, string>> | undefined,
  sections: SurveySection,
): SurveyDisplaySection[] {
  return Object.entries(sections).map(([sectionKey, items]) => {
    const responses = payload?.[sectionKey] ?? {}
    return {
      key: sectionKey,
      title: formatSectionTitle(sectionKey),
      items: Object.entries(items).map(([id, text]) => ({
        id,
        text,
        value: responses[id] ?? "",
      })),
    }
  })
}

function countSurveyAnswers(payload: Record<string, Record<string, string>> | undefined, sections: SurveySection) {
  let total = 0
  let answered = 0
  for (const [sectionKey, items] of Object.entries(sections)) {
    const responses = payload?.[sectionKey] ?? {}
    for (const id of Object.keys(items)) {
      total += 1
      if (responses[id]) answered += 1
    }
  }
  return { answered, total }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { session?: string } | Promise<{ session?: string }>
}) {
  const resolvedParams = await Promise.resolve(searchParams)
  const sessionId = resolvedParams?.session ?? ""

  const sessions = (await sql`
    select
      s.session_id::text as session_id,
      s.consented_at,
      s.state_json->>'participantName' as participant_name,
      s.state_json->'game'->>'game_state' as game_state,
      s.state_json as state_json,
      coalesce(e.event_count, 0) as event_count,
      e.last_ts
    from sessions s
    left join (
      select session_id, count(*)::int as event_count, max(ts) as last_ts
      from events
      group by session_id
    ) e on e.session_id = s.session_id
    order by s.consented_at desc nulls last
    limit 100
  `) as SessionRow[]

  const selected = sessionId
    ? ((await sql`
        select
          s.session_id::text as session_id,
          s.consented_at,
          s.state_json->>'participantName' as participant_name,
          s.state_json->'game'->>'game_state' as game_state,
          s.state_json as state_json,
          coalesce(e.event_count, 0) as event_count,
          e.last_ts
        from sessions s
        left join (
          select session_id, count(*)::int as event_count, max(ts) as last_ts
          from events
          group by session_id
        ) e on e.session_id = s.session_id
        where s.session_id::text = ${sessionId}
        limit 1
      `) as SessionRow[]).at(0) ?? null
    : null

  const events = sessionId
    ? ((await sql`
        select ts, type, payload
        from events
        where session_id::text = ${sessionId}
        order by ts desc
        limit 500
      `) as EventRow[])
    : []

  const preSurveyEvent = events.find((e) => e.type === "PRE_SURVEY")
  const postSurveyEvent = events.find((e) => e.type === "POST_SURVEY")
  const gameEndedEvent = events.find((e) => e.type === "GAME_ENDED")
  const preSurveyStartedAt = getEventTimestamp(events, "PRE_SURVEY_STARTED", "first")
  const preSurveySubmittedAt = getEventTimestamp(events, "PRE_SURVEY", "last")
  const postSurveyStartedAt = getEventTimestamp(events, "POST_SURVEY_STARTED", "first")
  const postSurveySubmittedAt = getEventTimestamp(events, "POST_SURVEY", "last")
  const preSurveySections = buildSurveySections(preSurveyEvent?.payload, PRE_SURVEY)
  const postSurveySections = buildSurveySections(postSurveyEvent?.payload, POST_SURVEY)
  const preCounts = countSurveyAnswers(preSurveyEvent?.payload, PRE_SURVEY)
  const postCounts = countSurveyAnswers(postSurveyEvent?.payload, POST_SURVEY)

  return (
    <AdminGate>
      <main className="min-h-screen bg-background px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
              <p className="text-sm text-muted-foreground">Sessions and event logs (latest 100 sessions)</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/admin/export" className="text-primary hover:underline">
                Export CSV
              </Link>
              <Link href="/" className="text-primary hover:underline">
                Back to game
              </Link>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.5fr]">
            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium text-foreground">Sessions</h2>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No sessions yet.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {sessions.map((s) => {
                      const active = s.session_id === sessionId
                      return (
                        <li key={s.session_id} className={active ? "bg-muted/40" : undefined}>
                          <Link
                            href={`/admin?session=${s.session_id}`}
                            className="block px-4 py-3 hover:bg-muted/30"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-foreground truncate">{s.session_id}</div>
                              <div className="text-xs text-muted-foreground">{formatTs(s.last_ts)}</div>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{s.participant_name ?? "Unknown"}</span>
                              <span>•</span>
                              <span>{s.game_state ?? "no-state"}</span>
                              <span>•</span>
                              <span>{s.event_count ?? 0} events</span>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium text-foreground">Session Details</h2>
              </div>
              {!selected ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {sessionId ? "Session not found." : "Select a session to view its events."}
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  <div className="rounded-md border border-border bg-background p-3 space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Game Session</div>
                      <div className="mt-1 text-sm font-medium text-foreground break-all">{selected.session_id}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Consented at: {formatTs(selected.consented_at)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Participant: {selected.participant_name ?? "Unknown"} · State:{" "}
                        {selected.game_state ?? "no-state"}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                      {gameEndedEvent ? (
                        <div className="grid gap-1 sm:grid-cols-2">
                          <div>Winner side: {gameEndedEvent.payload?.winnerSide ?? "-"}</div>
                          <div>Liar: {gameEndedEvent.payload?.liar ?? "-"}</div>
                          <div>Suspect: {gameEndedEvent.payload?.suspect ?? "-"}</div>
                          <div>Keyword: {gameEndedEvent.payload?.keyword ?? "-"}</div>
                          <div>Topic: {gameEndedEvent.payload?.topic ?? "-"}</div>
                          <div>
                            Votes:{" "}
                            {gameEndedEvent.payload?.votes
                              ? JSON.stringify(gameEndedEvent.payload.votes)
                              : "-"}
                          </div>
                        </div>
                      ) : (
                        <div>No GAME_ENDED event recorded.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-background p-3 space-y-3">
                    <div className="text-xs text-muted-foreground">Survey</div>
                    <details className="rounded-md border border-border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">
                        Pre-survey answers ({preCounts.answered}/{preCounts.total})
                      </summary>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Started: {formatTs(preSurveyStartedAt)} · Submitted: {formatTs(preSurveySubmittedAt)} · Duration:{" "}
                        {formatDurationSeconds(preSurveyStartedAt, preSurveySubmittedAt)}
                      </div>
                      <div className="mt-3 space-y-4 text-xs text-muted-foreground">
                        {preSurveySections.map((section) => (
                          <div key={section.key} className="space-y-2">
                            <div className="text-xs font-semibold text-foreground">{section.title}</div>
                            <div className="grid gap-2">
                              {section.items.map((item) => (
                                <div key={item.id} className="rounded border border-border bg-background p-2">
                                  <div className="text-[11px] text-muted-foreground">
                                    {item.id} · {item.text}
                                  </div>
                                  <div className="mt-1 text-xs text-foreground">
                                    {item.value || "-"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                    <details className="rounded-md border border-border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">
                        Post-survey answers ({postCounts.answered}/{postCounts.total})
                      </summary>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Started: {formatTs(postSurveyStartedAt)} · Submitted: {formatTs(postSurveySubmittedAt)} · Duration:{" "}
                        {formatDurationSeconds(postSurveyStartedAt, postSurveySubmittedAt)}
                      </div>
                      <div className="mt-3 space-y-4 text-xs text-muted-foreground">
                        {postSurveySections.map((section) => (
                          <div key={section.key} className="space-y-2">
                            <div className="text-xs font-semibold text-foreground">{section.title}</div>
                            <div className="grid gap-2">
                              {section.items.map((item) => (
                                <div key={item.id} className="rounded border border-border bg-background p-2">
                                  <div className="text-[11px] text-muted-foreground">
                                    {item.id} · {item.text}
                                  </div>
                                  <div className="mt-1 text-xs text-foreground">
                                    {item.value || "-"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground mb-2">State JSON</div>
                    <pre className="max-h-64 overflow-auto text-xs text-foreground/90">
                      {JSON.stringify(selected.state_json ?? {}, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-md border border-border bg-background">
                    <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">Events</div>
                    {events.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No events for this session.</div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {events.map((e, idx) => (
                          <li key={`${e.ts}-${idx}`} className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-medium text-foreground">{e.type}</div>
                              <div className="text-xs text-muted-foreground">{formatTs(e.ts)}</div>
                            </div>
                            <pre className="mt-2 max-h-40 overflow-auto text-xs text-foreground/90">
                              {JSON.stringify(e.payload ?? {}, null, 2)}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </AdminGate>
  )
}
