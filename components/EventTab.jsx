"use client";

import { useEffect, useState } from "react";
import { fetchEvent } from "../lib/authClient";
import { RARITIES } from "../lib/config";

function timeLeft(endsAt) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

const rarityLookup = {};
RARITIES.forEach((r) => {
  rarityLookup[r.key] = r;
});

export default function EventTab({ loggedIn }) {
  const [event, setEvent] = useState(null);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetchEvent().then((data) => {
        if (!cancelled && data) setEvent(data);
      });
    }
    load();
    const poll = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!event) return;
    setLeft(timeLeft(event.endsAt));
    const t = setInterval(() => setLeft(timeLeft(event.endsAt)), 1000);
    return () => clearInterval(t);
  }, [event]);

  if (!event) {
    return <div className="inv-empty">Loading event...</div>;
  }

  const leaderboard = event.leaderboard || [];
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];
  const rest = leaderboard.slice(3);

  return (
    <div>
      <div className="section-title">
        RAREST PULL EVENT <div className="line" />
      </div>

      <div className="event-timer">
        {left ? (
          <>
            <TimeBlock value={left.days} label="days" />
            <TimeBlock value={left.hours} label="hrs" />
            <TimeBlock value={left.mins} label="min" />
            <TimeBlock value={left.secs} label="sec" />
          </>
        ) : (
          <div className="event-ended">Event has ended</div>
        )}
      </div>

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-2)", margin: "12px 0 24px" }}>
        Whoever pulls the rarest card before the timer hits zero takes 1st
        place — and something from the canteen. Only your single rarest pull
        counts.
      </p>

      {!loggedIn && <div className="event-login-hint">Sign up or log in to enter the event.</div>}

      <div className="podium">
        <PodiumSpot place={2} entry={second} height={110} />
        <PodiumSpot place={1} entry={first} height={150} />
        <PodiumSpot place={3} entry={third} height={80} />
      </div>

      {rest.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--muted-2)",
              textTransform: "uppercase",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Rank 4–{leaderboard.length}</span>
            <span>Top {leaderboard.length}</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 480,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {rest.map((entry, i) => (
              <LeaderboardRow key={entry.username + i} rank={i + 4} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeBlock({ value, label }) {
  return (
    <div className="time-block">
      <div className="time-value">{String(value).padStart(2, "0")}</div>
      <div className="time-label">{label}</div>
    </div>
  );
}

function PodiumSpot({ place, entry, height }) {
  return (
    <div className={`podium-spot podium-place-${place}`}>
      <div className="podium-card">
        {entry ? (
          <>
            <div className="podium-username">{entry.username}</div>
            <div className="podium-rarity">{entry.rarity_label}</div>
            <div className="podium-cardname">{entry.card_name}</div>
          </>
        ) : (
          <div className="podium-empty">— open —</div>
        )}
      </div>
      <div className="podium-stand" style={{ height }}>
        <span className="podium-number">{place}</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, entry }) {
  const rarity = rarityLookup[entry.rarity_key];
  const rarityStyle = rarity && rarity.gradient
    ? { "--rarity-gradient": rarity.gradient }
    : { color: rarity ? rarity.color : "var(--muted-2)" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--muted-2)",
          width: 28,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.username}
      </div>
      <div
        className={rarity && rarity.gradient ? "gradient-text" : undefined}
        style={{
          ...rarityStyle,
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          fontWeight: 700,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {entry.rarity_label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--muted-2)",
          flexShrink: 0,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {entry.card_name}
      </div>
    </div>
  );
}
