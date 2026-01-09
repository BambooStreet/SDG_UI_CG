import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import surveyItems from "@/data/survey_item.json"

type SurveySection = Record<string, Record<string, string>>

const PRE_SURVEY = (surveyItems as { pre_survey: SurveySection }).pre_survey
const POST_SURVEY = (surveyItems as { post_survey: SurveySection }).post_survey

type EventRow = {
  session_id: string
  consented_at: string | null
  state_json: any
  ts: string | null
  type: string | null
  payload: any
}

type SessionAggregate = {
  session_id: string
  consented_at: string | null
  participant_name: string | null
  game_state: string | null
  event_count: number
  last_event_ts: string | null
  pre_survey?: any
  post_survey?: any
  game_ended?: any
  ai_description_auth?: boolean
  ai_description_group?: string | null
  mid_check_confidence?: string | null
  mid_check_suspect?: string | null
  pre_survey_started_at?: string | null
  pre_survey_submitted_at?: string | null
  post_survey_started_at?: string | null
  post_survey_submitted_at?: string | null
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value)
  if (text.includes("\"") || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/\"/g, "\"\"")}"`
  }
  return text
}

function toCsv(rows: Record<string, string>[]) {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","))
  }
  return lines.join("\n")
}

function buildSurveyColumns(prefix: string, sections: SurveySection) {
  const columns: { key: string; sectionKey: string; questionId: string }[] = []
  for (const [sectionKey, items] of Object.entries(sections)) {
    for (const questionId of Object.keys(items)) {
      columns.push({
        key: `${prefix}_${sectionKey}_${questionId}`,
        sectionKey,
        questionId,
      })
    }
  }
  return columns
}

function getSurveyValue(
  payload: Record<string, Record<string, string>> | undefined,
  sectionKey: string,
  questionId: string,
) {
  return payload?.[sectionKey]?.[questionId] ?? ""
}

function toDurationSeconds(start?: string | null, end?: string | null) {
  if (!start || !end) return ""
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return ""
  if (endMs < startMs) return ""
  return String(Math.round((endMs - startMs) / 1000))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam && /^\d+$/.test(limitParam) ? Number.parseInt(limitParam, 10) : null

  const rows = limit
    ? ((await sql`
        with base as (
          select session_id, consented_at, state_json
          from sessions
          order by consented_at desc nulls last
          limit ${limit}
        )
        select
          b.session_id::text as session_id,
          b.consented_at,
          b.state_json,
          e.ts,
          e.type,
          e.payload
        from base b
        left join events e on e.session_id = b.session_id
        order by b.consented_at desc nulls last, e.ts asc
      `) as EventRow[])
    : ((await sql`
        select
          s.session_id::text as session_id,
          s.consented_at,
          s.state_json,
          e.ts,
          e.type,
          e.payload
        from sessions s
        left join events e on e.session_id = s.session_id
        order by s.consented_at desc nulls last, e.ts asc
      `) as EventRow[])

  const sessions = new Map<string, SessionAggregate>()

  for (const row of rows) {
    const session_id = row.session_id
    let agg = sessions.get(session_id)
    if (!agg) {
      const participant_name = row.state_json?.participantName ?? null
      const game_state = row.state_json?.game?.game_state ?? null
      agg = {
        session_id,
        consented_at: row.consented_at ?? null,
        participant_name,
        game_state,
        event_count: 0,
        last_event_ts: null,
      }
      sessions.set(session_id, agg)
    }

    if (row.type) {
      agg.event_count += 1
      agg.last_event_ts = row.ts ?? agg.last_event_ts
      if (row.type === "PRE_SURVEY") agg.pre_survey = row.payload
      if (row.type === "POST_SURVEY") agg.post_survey = row.payload
      if (row.type === "GAME_ENDED") agg.game_ended = row.payload
      if (row.type === "AI_DESCRIPTION" && row.payload?.auth !== undefined) {
        if (agg.ai_description_auth === undefined) {
          agg.ai_description_auth = row.payload.auth
        }
        if (agg.ai_description_group == null && row.payload?.group) {
          agg.ai_description_group = row.payload.group
        }
      }
      if (row.type === "MID_CHECK") {
        if (agg.mid_check_confidence == null) {
          agg.mid_check_confidence = row.payload?.confidence != null ? String(row.payload.confidence) : ""
        }
        if (agg.mid_check_suspect == null) {
          agg.mid_check_suspect = row.payload?.suspectName ?? ""
        }
      }
      if (row.type === "PRE_SURVEY_STARTED" && !agg.pre_survey_started_at)
        agg.pre_survey_started_at = row.ts ?? agg.pre_survey_started_at
      if (row.type === "POST_SURVEY_STARTED" && !agg.post_survey_started_at)
        agg.post_survey_started_at = row.ts ?? agg.post_survey_started_at
      if (row.type === "PRE_SURVEY") agg.pre_survey_submitted_at = row.ts ?? agg.pre_survey_submitted_at
      if (row.type === "POST_SURVEY") agg.post_survey_submitted_at = row.ts ?? agg.post_survey_submitted_at
    }
  }

  const preColumns = buildSurveyColumns("pre", PRE_SURVEY)
  const postColumns = buildSurveyColumns("post", POST_SURVEY)

  const output = Array.from(sessions.values()).map((s) => {
    const pre = s.pre_survey ?? {}
    const post = s.post_survey ?? {}
    const ended = s.game_ended ?? {}

    const row: Record<string, string> = {
      session_id: s.session_id,
      consented_at: s.consented_at ?? "",
      participant_name: s.participant_name ?? "",
      game_state: s.game_state ?? "",
      event_count: String(s.event_count),
      last_event_ts: s.last_event_ts ?? "",
      pre_survey_started_at: s.pre_survey_started_at ?? "",
      pre_survey_submitted_at: s.pre_survey_submitted_at ?? "",
      pre_survey_duration_seconds: toDurationSeconds(s.pre_survey_started_at, s.pre_survey_submitted_at),
      post_survey_started_at: s.post_survey_started_at ?? "",
      post_survey_submitted_at: s.post_survey_submitted_at ?? "",
      post_survey_duration_seconds: toDurationSeconds(s.post_survey_started_at, s.post_survey_submitted_at),
      ai_description_auth: s.ai_description_auth === undefined ? "" : String(s.ai_description_auth),
      ai_description_group: s.ai_description_group ?? "",
      mid_check_suspect: s.mid_check_suspect ?? "",
      mid_check_confidence: s.mid_check_confidence ?? "",
    }

    for (const col of preColumns) {
      row[col.key] = String(getSurveyValue(pre, col.sectionKey, col.questionId))
    }
    for (const col of postColumns) {
      row[col.key] = String(getSurveyValue(post, col.sectionKey, col.questionId))
    }

    row.game_winner_side = ended.winnerSide ?? ""
    row.game_liar = ended.liar ?? ""
    row.game_suspect = ended.suspect ?? ""
    row.game_keyword = ended.keyword ?? ""
    row.game_topic = ended.topic ?? ""
    row.game_votes = ended.votes ? JSON.stringify(ended.votes) : ""

    return row
  })

  const csv = toCsv(output)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"sessions.csv\"",
    },
  })
}
