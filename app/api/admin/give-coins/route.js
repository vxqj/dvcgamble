import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { requireAdmin, findPlayerByUsername } from "../../../../lib/adminAuth";

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { targetUsername, amount } = await request.json().catch(() => ({}));
  const amt = Math.round(Number(amount));
  if (!targetUsername || !Number.isFinite(amt) || amt === 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const target = await findPlayerByUsername(db, targetUsername);
  if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { data, error } = await db.rpc("increment_pending_coins", {
    p_player_id: target.id,
    p_amount: amt,
  });
  if (error) return NextResponse.json({ error: "Grant failed" }, { status: 500 });

  return NextResponse.json({ ok: true, pending: data });
}
