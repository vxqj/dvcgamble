import { rarityIndex } from "./engine";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Global Feed now runs on Supabase (via /api/feed and /api/feed/broadcast)
// instead of ntfy.sh. ntfy rate-limits by IP, and that bucket is SHARED by
// everyone behind the same IP — on a school network where a lot of players
// share one public IP, that shared allowance was getting blown through
// almost immediately, which is why the feed (and presence) kept 429ing and
// never actually loading for anyone behind it. Routing through our own
// Supabase-backed API sidesteps that entirely.

// A single big Multi Open / Auto Open batch can produce several rare pulls
// back to back. Rather than firing one insert per pull, these get
// coalesced down to just the rarest one every MIN_BROADCAST_INTERVAL_MS —
// the feed's job is to show that something rare happened, not to
// individually log every duplicate from one big open.
const MIN_BROADCAST_INTERVAL_MS = 1200;
let queue = [];
let pumping = false;

async function pump() {
  if (pumping) return;
  pumping = true;
  while (queue.length > 0) {
    const batch = queue;
    queue = [];
    const rarest = batch.reduce((best, p) => (p._idx < best._idx ? p : best), batch[0]);
    const { _idx, ...payload } = rarest;
    try {
      await fetch("/api/feed/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // best-effort broadcast, ignore network failures
    }
    await sleep(MIN_BROADCAST_INTERVAL_MS);
  }
  pumping = false;
}

export function broadcastPull({ rarityKey, rarityLabel, color, name, packLabel, username, titleKey }) {
  queue.push({ rarityKey, rarityLabel, color, name, packLabel, username, titleKey, _idx: rarityIndex(rarityKey) });
  pump();
}

export async function fetchFeedHistory() {
  try {
    const res = await fetch("/api/feed");
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (e) {
    return [];
  }
}

const POLL_INTERVAL_MS = 4000;

// Replaces the old ntfy SSE subscription with polling — same
// onMessage(payload) callback shape as before, so FeedTab.jsx (and
// anything else calling this) needed zero changes. Only genuinely new
// events (by id) since the last poll get passed through, oldest first, so
// they still feel like they're arriving one at a time rather than in a
// dump. The very first poll just primes the "seen" set instead of firing
// 60 onMessage calls at once — FeedTab already loads initial history
// itself via fetchFeedHistory(), this is only for what shows up live after.
export function subscribeFeed(onMessage) {
  let stopped = false;
  let seen = new Set();
  let primed = false;

  async function poll() {
    if (stopped) return;
    const events = await fetchFeedHistory();
    const fresh = events.filter((e) => !seen.has(e.id));
    events.forEach((e) => seen.add(e.id));
    if (primed) {
      fresh
        .slice()
        .sort((a, b) => a.ts - b.ts)
        .forEach((e) => onMessage(e));
    } else {
      primed = true;
    }
  }

  poll();
  const t = setInterval(poll, POLL_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(t);
  };
}