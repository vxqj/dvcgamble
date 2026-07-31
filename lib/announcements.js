import { ANNOUNCEMENT_CONFIG } from "./config";

// Same pattern as lib/feed.js — a public ntfy.sh topic everyone subscribes
// to, just for admin announcements instead of rare pulls. Deliberately its
// own topic so an announcement never gets coalesced/delayed by the feed's
// rate-limit queue (see feed.js) and so the two can't collide.
export function subscribeAnnouncements(onMessage) {
  if (!ANNOUNCEMENT_CONFIG.enabled) return () => {};
  if (typeof window === "undefined" || !("EventSource" in window)) return () => {};
  let es;
  try {
    es = new EventSource(`https://ntfy.sh/${ANNOUNCEMENT_CONFIG.ntfyTopic}/sse`);
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
