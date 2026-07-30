"use client";

// Client-side helpers for the global card exist-count / serial system.
// The actual counting happens server-side (Supabase, via record_card_pulls)
// so it stays consistent across every player and can't be edited in
// devtools — this file just calls those endpoints and keeps a small
// in-memory cache so the same card doesn't get re-fetched on every hover.

const countCache = new Map(); // cardName -> last known count

// Registers a batch of pulled card names, IN THE EXACT ORDER they were
// rolled (duplicates included), and returns their new global counts in
// that same order. For a serialized rarity, counts[i] IS the card's
// permanent serial number.
export async function recordCardPulls(names) {
  if (!names || names.length === 0) return [];
  try {
    const res = await fetch("/api/cards/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });
    if (!res.ok) return names.map(() => null);
    const data = await res.json();
    const counts = data.counts || [];
    counts.forEach((c, i) => {
      if (c != null) countCache.set(names[i], c);
    });
    return counts;
  } catch (e) {
    return names.map(() => null);
  }
}

// Fetches (and caches) the current global exist count for a set of card
// names — used by the Inventory hover tooltip. Returns { name: count }.
export async function fetchCardCounts(names) {
  const uncached = names.filter((n) => !countCache.has(n));
  if (uncached.length > 0) {
    try {
      const res = await fetch(`/api/cards/counts?names=${encodeURIComponent(uncached.join(","))}`);
      if (res.ok) {
        const data = await res.json();
        Object.entries(data.counts || {}).forEach(([name, count]) => countCache.set(name, count));
      }
    } catch (e) {
      // best-effort — tooltip just won't show a number for these
    }
  }
  const out = {};
  names.forEach((n) => {
    if (countCache.has(n)) out[n] = countCache.get(n);
  });
  return out;
}

export function getCachedCount(name) {
  return countCache.has(name) ? countCache.get(name) : null;
}
