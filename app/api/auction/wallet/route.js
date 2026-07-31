import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

export async function GET(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("players").select("coins").eq("id", player.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Load failed" }, { status: 500 });
  return NextResponse.json({ wallet: data ? data.coins : 0 });
}

// action: "deposit" | "withdraw"
export async function POST(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  const action = body.action === "withdraw" ? "withdraw" : "deposit";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const fn = action === "withdraw" ? "withdraw_from_wallet" : "deposit_to_wallet";
  const { data, error } = await db.rpc(fn, { p_player_id: player.id, p_amount: Math.floor(amount) });

  if (error) {
    return NextResponse.json({ error: error.message || "Transfer failed" }, { status: 400 });
  }

  return NextResponse.json({ wallet: data });
}
