import { PRESENCE_CONFIG } from "./config";

// Presence now runs on Supabase (via /api/presence/ping and
// /api/presence/count) instead of ntfy.sh, for the same reason the Global
// Feed moved off it: ntfy rate-limits by IP, and that bucket is shared by
// everyone behind the same IP, so a school network's worth of players
// heartbeating was blowing through it constantly. This version is also
// simpler than the old one — no SSE connection to manage/reconnect, no
// local "seen" map to prune, no shared rate-limit backoff between this and
// the feed. The server just counts recent pings directly.

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Generated once per browser tab/session, never stored — just enough for
// the server to tell distinct pingers apart within its timeout window.
const SESSION_ID = genId();

function jitter(baseMs, spreadMs) {
  return baseMs + Math.floor(Math.random() * spreadMs);
}

// Starts pinging presence and polling the count. Calls onCountChange(n)
// whenever a fresh count comes back. Returns a cleanup function.
export function startPresence(onCountChange) {
  if (!PRESENCE_CONFIG.enabled) return () => {};
  if (typeof window === "undefined") return () => {};

  let stopped = false;
  let pingTimer = null;
  let pollTimer = null;

  function ping() {
    fetch("/api/presence/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID }),
    }).catch(() => {
      // best-effort — offline/blocked just means the count stays stale locally
    });
  }

  async function pollCount() {
    try {
      const res = await fetch("/api/presence/count");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.count === "number") onCountChange(data.count);
    } catch (e) {
      // best-effort
    }
  }

  // Recursive setTimeout with jitter, same reasoning as before: everyone
  // who loaded the page around the same time shouldn't heartbeat in
  // lockstep, so each tick is spread out randomly rather than firing on a
  // fixed setInterval.
  function scheduleNextPing() {
    pingTimer = setTimeout(() => {
      if (stopped) return;
      ping();
      scheduleNextPing();
    }, jitter(PRESENCE_CONFIG.heartbeatMs, 6000));
  }

  function scheduleNextPoll() {
    pollTimer = setTimeout(() => {
      if (stopped) return;
      pollCount();
      scheduleNextPoll();
    }, jitter(PRESENCE_CONFIG.pollFallbackMs || 8000, 3000));
  }

  ping();
  pollCount();
  scheduleNextPing();
  scheduleNextPoll();

  return () => {
    stopped = true;
    if (pingTimer) clearTimeout(pingTimer);
    if (pollTimer) clearTimeout(pollTimer);
  };
}