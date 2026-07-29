import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken } from "../../../../lib/session";

// sendBeacon can't set an Authorization header, so this route accepts the
// token in the request body instead. Only used for the "tab is
// closing/hiding" save — the normal path is POST /api/game/state with a
// Bearer header.
export async function POST(request) {
  try {
    const { token, state } = await request.json().catch(() => ({}));
    const player = await getPlayerFromToken(token);
    if (!player || !state || typeof state !== "object") {
      return NextResponse.json({ ok: false });
    }
    const db = supabaseAdmin();
    await db
      .from("player_state")
      .upsert({ player_id: player.id, state, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false });
  }
}
