import { FEED_CONFIG } from "./config";

// The feed is intentionally identity-free — every entry is shown as
// "Someone". There's no username or account system in this app at all,
// so there's nothing to anonymize beyond just not inventing a display name.
function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(16).slice(2);
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
  };
  try {
    await fetch(`https://ntfy.sh/${FEED_CONFIG.ntfyTopic}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // best-effort broadcast, ignore network failures
  }
  return payload;
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
