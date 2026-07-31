import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminAuth";
import { FEED_CONFIG, PACKS } from "../../../../lib/config";
import { rarityByKey } from "../../../../lib/engine";

function genId() {
  return "admin-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Posts straight to the same public ntfy topic the real feed uses (see
// lib/feed.js broadcastPull), with the same shape, so it shows up in
// FeedTab exactly like a genuine pull. The feed is identity-free by
// design — this doesn't (and can't) claim to be a specific player, it's
// just "Someone pulled a Legendary" like every other entry.
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rarityKey, cardName, packKey } = await request.json().catch(() => ({}));
  if (!rarityKey) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const rarity = rarityByKey(rarityKey);
  const pack = PACKS.find((p) => p.key === packKey);

  const payload = {
    id: genId(),
    rarityKey: rarity.key,
    rarityLabel: rarity.label,
    color: rarity.color,
    name: cardName || rarity.label,
    packLabel: pack ? pack.label : undefined,
    ts: Date.now(),
  };

  try {
    await fetch(`https://ntfy.sh/${FEED_CONFIG.ntfyTopic}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return NextResponse.json({ error: "Broadcast failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
