import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { PRESENCE_CONFIG } from "../../../../lib/config";

const CACHE_MS = 3000;
let cachedPayload = null;
let cachedAt = 0;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    if (cachedPayload && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedPayload, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const db = supabaseAdmin();
    const cutoff = new Date(Date.now() - PRESENCE_CONFIG.timeoutMs).toISOString();
    const { count, error } = await db
      .from("presence_pings")
      .select("session_id", { count: "exact", head: true })
      .gt("last_seen", cutoff);
    if (error) throw error;

    cachedPayload = { count: Math.max(1, count || 0) };
    cachedAt = Date.now();
    return NextResponse.json(cachedPayload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    console.error("PRESENCE COUNT ERROR:", e);
    return NextResponse.json({ count: cachedPayload ? cachedPayload.count : 1 });
  }
}
