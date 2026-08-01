import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { PRESENCE_CONFIG } from "../../../../lib/config";

// No auth required — presence is anonymous and identity-free, same as
// before. This replaces posting a heartbeat to ntfy.sh, which was the
// actual problem: ntfy rate-limits by IP, and that bucket is SHARED by
// everyone behind the same IP (e.g. a whole school network), so a room
// full of players heartbeating every ~20s was blowing through the shared
// allowance almost immediately and the count just stopped updating.
export async function POST(request) {
  try {
    const { sessionId } = await request.json().catch(() => ({}));
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const db = supabaseAdmin();
    await db
      .from("presence_pings")
      .upsert({ session_id: sessionId.slice(0, 100), last_seen: new Date().toISOString() });

    // Cheap, occasional cleanup — ~1% of pings also sweep out sessions
    // that are well past the timeout window, so this table doesn't grow
    // forever. Doesn't need to be exact or block the response.
    if (Math.random() < 0.01) {
      const staleCutoff = new Date(Date.now() - PRESENCE_CONFIG.timeoutMs * 5).toISOString();
      db.from("presence_pings").delete().lt("last_seen", staleCutoff).then(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PRESENCE PING ERROR:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
