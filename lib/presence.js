import { PRESENCE_CONFIG } from "./config";

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Generated once per browser tab/session, never stored — just enough to
// tell distinct pingers apart within the current window.
const SESSION_ID = genId();

// Starts pinging a shared ntfy.sh topic and listening for other pingers.
// Calls onCountChange(n) whenever the estimated online count changes.
// Returns a cleanup function.
export function startPresence(onCountChange) {
  if (!PRESENCE_CONFIG.enabled) return () => {};
  if (typeof window === "undefined") return () => {};

  const seen = new Map(); // sessionId -> last seen timestamp
  seen.set(SESSION_ID, Date.now());
  onCountChange(seen.size);

  let es = null;
  let reconnectTimer = null;
  let reconnectDelay = 2000; // starting backoff, grows on repeated failures
  let pingTimer = null;
  let pollTimer = null;
  let stopped = false;

  function jitter(baseMs, spreadMs) {
    return baseMs + Math.floor(Math.random() * spreadMs);
  }

  function ping() {
    seen.set(SESSION_ID, Date.now());
    fetch(`https://ntfy.sh/${PRESENCE_CONFIG.ntfyTopic}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ id: SESSION_ID, ts: Date.now() }),
    }).catch(() => {
      // best-effort — offline/blocked just means the count stays local
    });
  }

  // Recursive setTimeout instead of setInterval, with a few seconds of
  // random jitter on every tick — this is what actually fixes "breaks once
  // a lot of people are online". With a plain setInterval, everyone who
  // loaded the page around the same time (e.g. right after a Discord ping)
  // ends up heartbeating in near-lockstep, so the shared ntfy topic gets
  // hit with a burst of simultaneous requests every ~20s instead of a
  // steady trickle. Spreading each tick out randomly turns that burst into
  // a smooth stream, which is both friendlier to the shared topic and less
  // likely to cause dropped/delayed messages that make the count stall.
  function scheduleNextPing() {
    pingTimer = setTimeout(() => {
      ping();
      scheduleNextPing();
    }, jitter(PRESENCE_CONFIG.heartbeatMs, 6000));
  }

  function prune() {
    const cutoff = Date.now() - PRESENCE_CONFIG.timeoutMs;
    let changed = false;
    seen.forEach((ts, id) => {
      if (ts < cutoff) {
        seen.delete(id);
        changed = true;
      }
    });
    if (changed) onCountChange(seen.size);
  }

  // SSE gives near-instant updates, but it's a single point of failure —
  // one dropped connection (idle timeout, network blip, tab backgrounded,
  // or the shared topic just being busier than usual because a lot of
  // people are online at once) used to mean a browser silently stopped
  // hearing about anyone else until it reconnected. If reconnects also
  // kept failing under that same load, the count could get stuck low or
  // drop back to 1 even though plenty of people were still playing.
  //
  // pollPresence() is a second, fully independent path that periodically
  // asks ntfy directly (same trick the Global Feed already uses for its
  // history) for anyone who's pinged recently, so the count keeps healing
  // itself on its own schedule even if the live SSE stream is having a
  // bad time.
  async function pollPresence() {
    try {
      const sinceSec = Math.floor((Date.now() - PRESENCE_CONFIG.timeoutMs) / 1000);
      const res = await fetch(`https://ntfy.sh/${PRESENCE_CONFIG.ntfyTopic}/json?poll=1&since=${sinceSec}`);
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      let changed = false;
      lines.forEach((line) => {
        try {
          const envelope = JSON.parse(line);
          if (!envelope.message) return;
          const payload = JSON.parse(envelope.message);
          if (payload && payload.id) {
            const ts = envelope.time ? envelope.time * 1000 : Date.now();
            const existing = seen.get(payload.id);
            if (!existing || ts > existing) seen.set(payload.id, ts);
            changed = true;
          }
        } catch (err) {
          // skip malformed line
        }
      });
      if (changed) onCountChange(seen.size);
    } catch (e) {
      // best-effort — SSE is still doing its job in the meantime
    }
  }

  function scheduleNextPoll() {
    pollTimer = setTimeout(() => {
      pollPresence();
      scheduleNextPoll();
    }, jitter(PRESENCE_CONFIG.pollFallbackMs || 15000, 4000));
  }

  function connect() {
    if (stopped || !("EventSource" in window)) return;
    try {
      es = new EventSource(`https://ntfy.sh/${PRESENCE_CONFIG.ntfyTopic}/sse`);
    } catch (e) {
      scheduleReconnect();
      return;
    }
    es.onopen = () => {
      reconnectDelay = 2000; // connection healthy again, reset backoff
    };
    es.onmessage = (e) => {
      try {
        const envelope = JSON.parse(e.data);
        if (envelope.event === "message" && envelope.message) {
          const payload = JSON.parse(envelope.message);
          if (payload && payload.id) {
            seen.set(payload.id, Date.now());
            onCountChange(seen.size);
          }
        }
      } catch (err) {
        // ignore malformed envelope
      }
    };
    es.onerror = () => {
      if (es) {
        es.close();
        es = null;
      }
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 1.5, 30000); // cap at 30s
      connect();
    }, reconnectDelay);
  }

  connect();
  ping();
  pollPresence();
  scheduleNextPing();
  scheduleNextPoll();
  const pruneInterval = setInterval(prune, PRESENCE_CONFIG.pruneCheckMs);

  return () => {
    stopped = true;
    if (pingTimer) clearTimeout(pingTimer);
    if (pollTimer) clearTimeout(pollTimer);
    clearInterval(pruneInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (es) es.close();
  };
}