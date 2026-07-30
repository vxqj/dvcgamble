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
  let stopped = false;

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

  // The previous version left es.onerror as a no-op, so once the SSE
  // connection to ntfy.sh dropped (idle timeout, network blip, tab
  // backgrounded on mobile, etc.) it never reconnected — the browser just
  // silently stopped receiving other players' pings forever, and everyone
  // else aged out of `seen` after timeoutMs even though they were still
  // playing. This connect()/scheduleReconnect() pair rebuilds the
  // connection with a growing backoff whenever it dies, and resets the
  // backoff back to the base delay once a connection is confirmed open.
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
  const pingInterval = setInterval(ping, PRESENCE_CONFIG.heartbeatMs);
  const pruneInterval = setInterval(prune, PRESENCE_CONFIG.pruneCheckMs);

  return () => {
    stopped = true;
    clearInterval(pingInterval);
    clearInterval(pruneInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (es) es.close();
  };
}