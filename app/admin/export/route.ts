import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

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
}

function csvEscape(value: string) {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`
  }
  return value
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
    }
  }

  const output = Array.from(sessions.values()).map((s) => {
    const pre = s.pre_survey ?? {}
    const post = s.post_survey ?? {}
    const ended = s.game_ended ?? {}

    return {
      session_id: s.session_id,
      consented_at: s.consented_at ?? "",
      participant_name: s.participant_name ?? "",
      game_state: s.game_state ?? "",
      event_count: String(s.event_count),
      last_event_ts: s.last_event_ts ?? "",
      pre_age_range: pre.ageRange ?? "",
      pre_gender: pre.gender ?? "",
      pre_experience: pre.experience ?? "",
      post_enjoyment: post.enjoyment ?? "",
      post_difficulty: post.difficulty ?? "",
      post_fairness: post.fairness ?? "",
      post_ai_realism: post.aiRealism ?? "",
      post_feedback: post.feedback ?? "",
      game_winner_side: ended.winnerSide ?? "",
      game_liar: ended.liar ?? "",
      game_suspect: ended.suspect ?? "",
      game_keyword: ended.keyword ?? "",
      game_topic: ended.topic ?? "",
      game_votes: ended.votes ? JSON.stringify(ended.votes) : "",
    }
  })

  const csv = toCsv(output)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"sessions.csv\"",
    },
  })
}
