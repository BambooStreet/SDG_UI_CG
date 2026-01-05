import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const base = process.env.GAME_BACKEND_URL;
  if (!base) return NextResponse.json({ error: "Missing GAME_BACKEND_URL" }, { status: 500 });

  const body = await req.json().catch(() => ({}));

  const r = await fetch(`${base}/game/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "Content-Type": "application/json" } });
}
