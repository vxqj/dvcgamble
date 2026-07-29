"use client";

import { useEffect, useState } from "react";
import { fetchEvent } from "../lib/authClient";

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

  const podium = event.podium || [];
  const first = podium[0];
  const second = podium[1];
  const third = podium[2];

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
