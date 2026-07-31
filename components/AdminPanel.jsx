"use client";

import { useEffect, useState } from "react";
import { RARITIES, PACKS } from "../lib/config";
import {
  fetchMeFull,
  adminGiveCoins, adminForcePull, adminSetLuck, adminBroadcastPull, adminAnnounce,
} from "../lib/authClient";

// This component doesn't trust the fact that it got rendered at all. If
// someone forces it open via React DevTools (setting whatever state your
// page uses to control visibility) without actually being logged in as
// admin, this still refuses to show anything functional — it does its own
// fresh /api/auth/me check the moment it mounts, and that's the only thing
// that decides whether the real panel appears. Nothing about "why was I
// rendered" carries any authority here; only "does the server, right now,
// say this token is admin" does.
export default function AdminPanel({ token, onClose }) {
  const [verified, setVerified] = useState(null); // null = checking, true/false once known

  useEffect(() => {
    let cancelled = false;
    fetchMeFull(token).then((me) => {
      if (!cancelled) setVerified(!!(me && me.isAdmin));
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (verified === null) {
    return (
      <div className="modal-backdrop auth-modal-backdrop">
        <div className="auth-modal" style={{ width: "min(460px, 94vw)" }}>
          <button className="modal-close-btn" onClick={onClose} title="Close">×</button>
          <div className="auth-body">
            <div className="auth-sub">Checking...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!verified) {
    // Someone/something rendered this without real admin auth behind it.
    // Show nothing useful and close itself out.
    return (
      <div className="modal-backdrop auth-modal-backdrop">
        <div className="auth-modal" style={{ width: "min(460px, 94vw)" }}>
          <button className="modal-close-btn" onClick={onClose} title="Close">×</button>
          <div className="auth-body">
            <div className="auth-error">Not authorized.</div>
          </div>
        </div>
      </div>
    );
  }

  return <VerifiedAdminPanel token={token} onClose={onClose} />;
}

function VerifiedAdminPanel({ token, onClose }) {
  const [tab, setTab] = useState("coins");

  return (
    <div className="modal-backdrop auth-modal-backdrop">
      <div className="auth-modal" style={{ width: "min(460px, 94vw)" }}>
        <button className="modal-close-btn" onClick={onClose} title="Close">×</button>

        <div className="auth-tabs" style={{ flexWrap: "wrap" }}>
          {[
            ["coins", "Coins"],
            ["force", "Force Pull"],
            ["luck", "Luck"],
            ["broadcast", "Fake Feed"],
            ["announce", "Announce"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`auth-tab${tab === key ? " active" : ""}`}
              onClick={() => setTab(key)}
              style={{ fontSize: 11.5, padding: "8px 10px" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="auth-body">
          {tab === "coins" && <GiveCoinsForm token={token} />}
          {tab === "force" && <ForcePullForm token={token} />}
          {tab === "luck" && <LuckForm token={token} />}
          {tab === "broadcast" && <BroadcastForm token={token} />}
          {tab === "announce" && <AnnounceForm token={token} />}
        </div>
      </div>
    </div>
  );
}

function Result({ status }) {
  if (!status) return null;
  return (
    <div className={status.ok ? "auth-sub" : "auth-error"} style={{ marginTop: 10 }}>
      {status.message}
    </div>
  );
}

function GiveCoinsForm({ token }) {
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      await adminGiveCoins(token, { targetUsername: username.trim(), amount: Number(amount) });
      setStatus({ ok: true, message: `Queued ${amount} coins for ${username}. Applies next time they load / autosave.` });
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="auth-label">Player username</div>
      <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="AdjectiveNoun1234" />
      <div className="auth-label">Coins (negative to remove)</div>
      <input className="auth-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" />
      <button className="auth-submit-btn" onClick={submit} disabled={busy || !username || !amount}>
        {busy ? "Sending..." : "Give coins"}
      </button>
      <Result status={status} />
    </>
  );
}

function ForcePullForm({ token }) {
  const [username, setUsername] = useState("");
  const [rarityKey, setRarityKey] = useState(RARITIES[RARITIES.length - 1].key);
  const [cardName, setCardName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      await adminForcePull(token, { targetUsername: username.trim(), rarityKey, cardName: cardName.trim() || undefined });
      setStatus({ ok: true, message: `Queued — swapped into ${username}'s next pack open.` });
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="auth-label">Player username</div>
      <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="AdjectiveNoun1234" />
      <div className="auth-label">Rarity</div>
      <select className="auth-input" value={rarityKey} onChange={(e) => setRarityKey(e.target.value)}>
        {RARITIES.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </select>
      <div className="auth-label">Card name (blank = random of that rarity)</div>
      <input className="auth-input" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="optional" />
      <button className="auth-submit-btn" onClick={submit} disabled={busy || !username}>
        {busy ? "Sending..." : "Force next pull"}
      </button>
      <Result status={status} />
    </>
  );
}

function LuckForm({ token }) {
  const [siteWide, setSiteWide] = useState(true);
  const [username, setUsername] = useState("");
  const [multiplier, setMultiplier] = useState("3");
  const [minutes, setMinutes] = useState("15");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      await adminSetLuck(token, {
        targetUsername: siteWide ? undefined : username.trim(),
        multiplier: Number(multiplier),
        minutes: Number(minutes),
      });
      setStatus({ ok: true, message: siteWide ? `Site-wide luck boost live for ${minutes} min.` : `Luck boost live for ${username} for ${minutes} min.` });
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#fff", marginBottom: 10 }}>
        <input type="checkbox" checked={siteWide} onChange={(e) => setSiteWide(e.target.checked)} />
        Site-wide (everyone, including guests)
      </label>
      {!siteWide && (
        <>
          <div className="auth-label">Player username</div>
          <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="AdjectiveNoun1234" />
        </>
      )}
      <div className="auth-label">Multiplier (rarer tiers boosted more)</div>
      <input className="auth-input" type="number" step="0.5" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
      <div className="auth-label">Duration (minutes)</div>
      <input className="auth-input" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      <button className="auth-submit-btn" onClick={submit} disabled={busy || (!siteWide && !username)}>
        {busy ? "Sending..." : "Start luck boost"}
      </button>
      <Result status={status} />
    </>
  );
}

function BroadcastForm({ token }) {
  const [rarityKey, setRarityKey] = useState(RARITIES[0].key);
  const [cardName, setCardName] = useState("");
  const [packKey, setPackKey] = useState(PACKS[0] ? PACKS[0].key : "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      await adminBroadcastPull(token, { rarityKey, cardName: cardName.trim() || undefined, packKey });
      setStatus({ ok: true, message: "Posted to Global Feed." });
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="auth-label">Rarity</div>
      <select className="auth-input" value={rarityKey} onChange={(e) => setRarityKey(e.target.value)}>
        {RARITIES.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </select>
      <div className="auth-label">Card name (blank = rarity label)</div>
      <input className="auth-input" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="optional" />
      <div className="auth-label">Pack shown ("from ___")</div>
      <select className="auth-input" value={packKey} onChange={(e) => setPackKey(e.target.value)}>
        {PACKS.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>
      <button className="auth-submit-btn" onClick={submit} disabled={busy}>
        {busy ? "Sending..." : "Post to feed"}
      </button>
      <Result status={status} />
    </>
  );
}

function AnnounceForm({ token }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      await adminAnnounce(token, { message: message.trim() });
      setStatus({ ok: true, message: "Broadcast to everyone currently on the site." });
      setMessage("");
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="auth-label">Announcement (shown as a banner site-wide)</div>
      <input className="auth-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Luck event starting now — good luck!" maxLength={300} />
      <button className="auth-submit-btn" onClick={submit} disabled={busy || !message.trim()}>
        {busy ? "Sending..." : "Send announcement"}
      </button>
      <Result status={status} />
    </>
  );
}
