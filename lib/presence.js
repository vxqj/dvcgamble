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

  let es;
  try {
    if ("EventSource" in window) {
      es = new EventSource(`https://ntfy.sh/${PRESENCE_CONFIG.ntfyTopic}/sse`);
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
      es.onerror = () => {};
    }
  } catch (e) {
    // EventSource unavailable — presence just won't see anyone but self
  }

  ping();
  const pingInterval = setInterval(ping, PRESENCE_CONFIG.heartbeatMs);
  const pruneInterval = setInterval(prune, PRESENCE_CONFIG.pruneCheckMs);

  return () => {
    clearInterval(pingInterval);
    clearInterval(pruneInterval);
    if (es) es.close();
  };
}
