import { FEED_CONFIG } from "./config";
import { rarityIndex } from "./engine";

// The feed is intentionally identity-free — every entry is shown as
// "Someone". There's no username or account system in this app at all,
// so there's nothing to anonymize beyond just not inventing a display name.
function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(16).slice(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ntfy.sh rate-limits by IP, shared across every topic that browser talks
// to (feed AND presence both draw from the same bucket). A single big
// Multi Open / Auto Open batch used to fire one broadcastPull() POST per
// rare pull with zero delay between them — a run with several legendary+
// pulls back to back could blow straight through that shared allowance in
// under a second, and then every OTHER request from that browser (like
// the online-presence pings) started 429ing too, even though presence
// itself was never the problem.
//
// This queue fixes that: broadcasts are sent at most once every
// MIN_BROADCAST_INTERVAL_MS. If several rare pulls land while we're still
// waiting out that interval, they're coalesced down to just the single
// rarest one in the batch — the feed's job is to show that something rare
// happened, not to individually log every duplicate from one big open, so
// nothing meaningful is lost by not sending all of them.
const MIN_BROADCAST_INTERVAL_MS = 2500;
let queue = [];
let pumping = false;
let cooldownUntil = 0;

async function pump() {
  if (pumping) return;
  pumping = true;
  while (queue.length > 0) {
    const now = Date.now();
    if (now < cooldownUntil) {
      await sleep(cooldownUntil - now);
    }
    const batch = queue;
    queue = [];
    // Keep the rarest (lowest rarityIndex) pull from whatever piled up.
    const rarest = batch.reduce((best, p) => (p._idx < best._idx ? p : best), batch[0]);
    const { _idx, ...payload } = rarest;
    try {
      const res = await fetch(`https://ntfy.sh/${FEED_CONFIG.ntfyTopic}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      if (res.status === 429) {
        const retryAfterSec = Number(res.headers.get("Retry-After"));
        cooldownUntil = Date.now() + (Number.isFinite(retryAfterSec) ? retryAfterSec * 1000 : MIN_BROADCAST_INTERVAL_MS * 3);
      } else {
        cooldownUntil = Date.now() + MIN_BROADCAST_INTERVAL_MS;
      }
    } catch (e) {
      // best-effort broadcast, ignore network failures — just wait out the
      // normal interval before trying the next queued batch.
      cooldownUntil = Date.now() + MIN_BROADCAST_INTERVAL_MS;
    }
  }
  pumping = false;
}

export async function broadcastPull({ rarityKey, rarityLabel, color, name, packLabel }) {
  if (!FEED_CONFIG.enabled) return null;
  const payload = {
    id: genId(),
    rarityKey,
    rarityLabel,
    color,
    name,
    packLabel,
    ts: Date.now(),
    _idx: rarityIndex(rarityKey),
  };
  queue.push(payload);
  pump();
  const { _idx, ...visible } = payload;
  return visible;
}

export function subscribeFeed(onMessage) {
  if (!FEED_CONFIG.enabled) return () => {};
  if (typeof window === "undefined" || !("EventSource" in window)) return () => {};
  let es;
  try {
    es = new EventSource(`https://ntfy.sh/${FEED_CONFIG.ntfyTopic}/sse`);
    es.onmessage = (e) => {
      try {
        const envelope = JSON.parse(e.data);
        if (envelope.event === "message" && envelope.message) {
          onMessage(JSON.parse(envelope.message));
        }
      } catch (err) {
        // ignore malformed envelope
      }
    };
    es.onerror = () => {};
  } catch (e) {
    return () => {};
  }
  return () => es && es.close();
}

export async function fetchFeedHistory() {
  if (!FEED_CONFIG.enabled) return [];
  try {
    const res = await fetch(`https://ntfy.sh/${FEED_CONFIG.ntfyTopic}/json?poll=1&since=all`);
    const text = await res.text();
    const lines = text.trim().split("\n").filter(Boolean);
    const payloads = [];
    lines.forEach((line) => {
      try {
        const envelope = JSON.parse(line);
        if (envelope.message) payloads.push(JSON.parse(envelope.message));
      } catch (e) {
        // skip malformed line
      }
    });
    return payloads.sort((a, b) => a.ts - b.ts);
  } catch (e) {
    return [];
  }
}