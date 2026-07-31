import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminAuth";
import { ANNOUNCEMENT_CONFIG } from "../../../../lib/config";

function genId() {
  return "ann-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { message } = await request.json().catch(() => ({}));
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const payload = { id: genId(), message: message.trim().slice(0, 300), ts: Date.now() };

  try {
    await fetch(`https://ntfy.sh/${ANNOUNCEMENT_CONFIG.ntfyTopic}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return NextResponse.json({ error: "Broadcast failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
