import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

export const dynamic = "force-dynamic";

// Admin's "give coins" only ever increments pending_coin_delta on the
// players row — it never writes to player_state directly, because the
// player's own browser autosaves its in-memory state every few seconds
// and would silently overwrite a direct edit with its own (older) numbers.
// This route is how the grant actually reaches the player: the client
// calls it on load and periodically, gets back whatever's pending, adds it
// to its own in-memory coins, and lets its normal save path persist that —
// so the grant becomes part of the player's own state instead of racing it.
export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ amount: 0 });

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("players")
      .select("pending_coin_delta")
      .eq("id", player.id)
      .maybeSingle();
    const amount = data ? Number(data.pending_coin_delta) || 0 : 0;
    if (error || amount === 0) return NextResponse.json({ amount: 0 });

    await db.from("players").update({ pending_coin_delta: 0 }).eq("id", player.id);
    return NextResponse.json({ amount });
  } catch (e) {
    console.error("CLAIM COINS ERROR:", e);
    return NextResponse.json({ amount: 0 });
  }
}