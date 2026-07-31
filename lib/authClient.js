"use client";

const SESSION_KEY = "dvc_gamble_session_v1";

export function getSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setSession(session) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    // ignore
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    // ignore
  }
}

async function postJson(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function fetchUsernameCandidate() {
  const res = await fetch("/api/auth/username");
  const data = await res.json();
  return data.username;
}

// Re-verifies the logged-in player's REAL username straight from the DB
// using only the session token. Called on every page load so that an
// edited localStorage value (e.g. via devtools) never sticks — it gets
// overwritten with the canonical name within moments of loading. Returns
// null if the token is missing/invalid/expired.
export async function fetchMe(token) {
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.username || null;
  } catch (e) {
    return null;
  }
}

// Same as fetchMe, but also returns isAdmin — server-verified, same as the
// username. Use this instead of fetchMe wherever the app needs to decide
// whether to show the hidden admin button; nothing about that decision
// ever comes from localStorage or anything the client itself computed.
export async function fetchMeFull(token) {
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.username) return null;
    return { username: data.username, isAdmin: !!data.isAdmin };
  } catch (e) {
    return null;
  }
}

export async function signup({ username, password, state }) {
  return postJson("/api/auth/signup", { username, password, state });
}

export async function login({ loginCode, password }) {
  return postJson("/api/auth/login", { loginCode, password });
}

export async function loadStateFromCloud(token) {
  if (!token) return null;
  try {
    const res = await fetch("/api/game/state", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.state || null;
  } catch (e) {
    return null;
  }
}

export async function saveStateToCloud(token, state) {
  if (!token) return;
  try {
    await fetch("/api/game/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ state }),
    });
  } catch (e) {
    // best-effort — the localStorage save already happened regardless
  }
}

// Fire-and-forget save used when the tab is closing/hiding. sendBeacon
// can't set a custom Authorization header, so the token rides in the body
// instead — /api/game/beacon verifies it there.
export function beaconSave(token, state) {
  if (!token || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    const blob = new Blob([JSON.stringify({ token, state })], { type: "application/json" });
    navigator.sendBeacon("/api/game/beacon", blob);
  } catch (e) {
    // ignore
  }
}

export async function submitEventEntry(token, { rarityKey, cardName }) {
  if (!token) return null;
  try {
    const res = await fetch("/api/event/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rarityKey, cardName }),
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

export async function fetchEvent() {
  try {
    const res = await fetch("/api/event");
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ----------------------------------------------------------------------
// Luck / forced-pull / pending-coin-grant — called around pack opening and
// on a light poll, for any logged-in player (not admin-only; these are the
// consumer side of what an admin action produces).
// ----------------------------------------------------------------------

export async function fetchLuckMultiplier(token) {
  try {
    const res = await fetch("/api/game/luck", token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    if (!res.ok) return 1;
    const data = await res.json();
    return Number(data.multiplier) || 1;
  } catch (e) {
    return 1;
  }
}

// Returns { rarityKey, cardName } | null, and clears it server-side.
export async function consumeForcedPull(token) {
  if (!token) return null;
  try {
    const res = await fetch("/api/game/forced-pull", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.forced || null;
  } catch (e) {
    return null;
  }
}

// Returns however many coins were pending (0 if none) and clears them
// server-side. Caller is responsible for adding this to local state coins
// and saving.
export async function claimPendingCoins(token) {
  if (!token) return 0;
  try {
    const res = await fetch("/api/game/claim-coins", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.amount) || 0;
  } catch (e) {
    return 0;
  }
}

// ----------------------------------------------------------------------
// Admin actions. Every one of these still gets rejected server-side unless
// the token belongs to the is_admin account — this client code doesn't
// grant anything by existing, it's just a thin wrapper.
// ----------------------------------------------------------------------

export async function adminGiveCoins(token, { targetUsername, amount }) {
  return postJson("/api/admin/give-coins", { targetUsername, amount }, token);
}

export async function adminForcePull(token, { targetUsername, rarityKey, cardName }) {
  return postJson("/api/admin/force-pull", { targetUsername, rarityKey, cardName }, token);
}

export async function adminSetLuck(token, { targetUsername, multiplier, minutes }) {
  return postJson("/api/admin/luck", { targetUsername, multiplier, minutes }, token);
}

export async function adminBroadcastPull(token, { rarityKey, cardName, packKey }) {
  return postJson("/api/admin/broadcast", { rarityKey, cardName, packKey }, token);
}

export async function adminAnnounce(token, { message }) {
  return postJson("/api/admin/announcement", { message }, token);
}

// ----------------------------------------------------------------------
// Auctions — see components/AuctionTab.jsx / AuctionDetailModal.jsx.
// ----------------------------------------------------------------------

// No auth required — auction listings are public viewing, same as the
// Feed/Event tabs. Also lazily settles any auctions whose timer already
// ran out, server-side, before returning the list.
export async function fetchAuctions() {
  try {
    const res = await fetch("/api/auction/list");
    if (!res.ok) return [];
    const data = await res.json();
    return data.auctions || [];
  } catch (e) {
    return [];
  }
}

export async function createAuction(token, { cardName, rarityKey, serial, startingPrice, durationSeconds }) {
  return postJson("/api/auction/create", { cardName, rarityKey, serial, startingPrice, durationSeconds }, token);
}

export async function placeBid(token, { auctionId, amount }) {
  return postJson("/api/auction/bid", { auctionId, amount }, token);
}

export async function fetchAuctionWallet(token) {
  if (!token) return 0;
  try {
    const res = await fetch("/api/auction/wallet", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.wallet) || 0;
  } catch (e) {
    return 0;
  }
}

export async function depositToWallet(token, amount) {
  return postJson("/api/auction/wallet", { action: "deposit", amount }, token);
}

export async function withdrawFromWallet(token, amount) {
  return postJson("/api/auction/wallet", { action: "withdraw", amount }, token);
}

// Pops any cards this player won (or reclaimed, if their own auction got
// no bids) from settled auctions since the last claim. Meant to be polled
// periodically, same pattern as claimPendingCoins — the caller merges the
// returned cards into local state itself.
export async function claimAuctionCards(token) {
  if (!token) return [];
  try {
    const res = await fetch("/api/auction/claim", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cards || [];
  } catch (e) {
    return [];
  }
}