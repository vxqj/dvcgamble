import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

export async function GET(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("player_state")
    .select("state")
    .eq("player_id", player.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Load failed" }, { status: 500 });
  return NextResponse.json({ state: data ? data.state : null });
}

export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { state } = await request.json().catch(() => ({}));
  if (!state || typeof state !== "object") {
    return NextResponse.json({ error: "Missing state" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("player_state")
    .upsert({ player_id: player.id, state, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
