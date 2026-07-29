import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../../lib/supabase";
import { hashLoginCode } from "../../../../lib/crypto";

export async function POST(request) {
  try {
    const { loginCode, password } = await request.json().catch(() => ({}));
    if (!loginCode || !password) {
      return NextResponse.json({ error: "Login code and password required" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const codeHash = hashLoginCode(loginCode);

    const { data: player, error } = await db
      .from("players")
      .select("id, username, password_hash")
      .eq("login_code_hash", codeHash)
      .maybeSingle();

    if (error || !player) {
      return NextResponse.json({ error: "Invalid login code or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, player.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid login code or password" }, { status: 401 });
    }

    const { data: stateRow } = await db
      .from("player_state")
      .select("state")
      .eq("player_id", player.id)
      .maybeSingle();

    const { data: session, error: sessErr } = await db
      .from("sessions")
      .insert({ player_id: player.id })
      .select("token")
      .single();
    if (sessErr) throw sessErr;

    return NextResponse.json({
      token: session.token,
      username: player.username,
      state: stateRow ? stateRow.state : null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
