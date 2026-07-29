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

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
