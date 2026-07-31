import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

// Called by the client right before it opens a pack. Atomically reads AND
// clears pending_forced_pull in one round trip (fetch then null it out) so
// the same forced card can never accidentally get applied to two pack
// opens in a row, even if the client calls this twice in quick succession.
export async function GET(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ forced: null });

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("players")
      .select("pending_forced_pull")
      .eq("id", player.id)
      .maybeSingle();
    if (error || !data || !data.pending_forced_pull) {
      return NextResponse.json({ forced: null });
    }

    await db.from("players").update({ pending_forced_pull: null }).eq("id", player.id);

    return NextResponse.json({ forced: data.pending_forced_pull });
  } catch (e) {
    console.error("FORCED PULL FETCH ERROR:", e);
    return NextResponse.json({ forced: null });
  }
}
