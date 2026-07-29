import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../../lib/supabase";
import { generateUsername, generateLoginCode } from "../../../../lib/usernames";
import { hashLoginCode } from "../../../../lib/crypto";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password, state } = body;

    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // The client's dice-reroll UI shows a server-generated candidate, but we
    // never just trust whatever it echoes back — re-validate the shape and
    // re-check availability. If anything's off, generate a fresh one
    // ourselves so there's no path for an arbitrary typed string to sneak in.
    let finalUsername = null;
    if (typeof username === "string" && /^[A-Za-z]{3,20}\d{3,4}$/.test(username)) {
      const { data: existing } = await db
        .from("players")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!existing) finalUsername = username;
    }
    if (!finalUsername) finalUsername = await generateUsername();

    const passwordHash = await bcrypt.hash(password, 10);
    const loginCode = generateLoginCode();
    const loginCodeHash = hashLoginCode(loginCode);

    const { data: player, error } = await db
      .from("players")
      .insert({ username: finalUsername, password_hash: passwordHash, login_code_hash: loginCodeHash })
      .select("id, username")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That username was just taken — try again" }, { status: 409 });
      }
      throw error;
    }

    // Carry over whatever progress they'd already made locally so signing
    // up never costs them anything.
    const initialState = state && typeof state === "object" ? state : {};
    const { error: stateErr } = await db
      .from("player_state")
      .insert({ player_id: player.id, state: initialState });
    if (stateErr) throw stateErr;

    const { data: session, error: sessErr } = await db
      .from("sessions")
      .insert({ player_id: player.id })
      .select("token")
      .single();
    if (sessErr) throw sessErr;

    return NextResponse.json({
      token: session.token,
      username: player.username,
      loginCode,
      state: initialState,
    });
  } catch (e) {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
