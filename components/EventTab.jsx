"use client";

import { useEffect, useState } from "react";
import { fetchEvent } from "../lib/authClient";
import { RARITIES } from "../lib/config";
import { titleByKey, rarityByKey } from "../lib/engine";

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

// Classic podium-tier colors — these describe RANK (1st/2nd/3rd), separate
// from the glowing card above each stand which is colored by the RARITY of
// the card that got them there. Keeps the two ideas visually distinct.
const PLACE_THEME = {
  1: { grad: "linear-gradient(160deg, #ffe9a8 0%, #f2c14e 45%, #b8860b 100%)", ring: "#f2c14e" },
  2: { grad: "linear-gradient(160deg, #f2f4f7 0%, #c3c9d1 45%, #8b929c 100%)", ring: "#c3c9d1" },
  3: { grad: "linear-gradient(160deg, #f0b088 0%, #cd7f4a 45%, #8a5127 100%)", ring: "#cd7f4a" },
};

// Same treatment as FeedTab.jsx's TitleTag — looks the title's linked
// rarity back up so [KEY] renders in that rarity's actual color/gradient
// instead of a flat generic color.
function TitleTag({ titleKey }) {
  const title = titleByKey(titleKey);
  if (!title) return null;
  const rarity = rarityByKey(title.rarityKey);
  const style = rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: rarity.color };
  return (
    <span className={`feed-title-tag${rarity.gradient ? " gradient-text" : ""}`} style={style}>
      [{titleKey}]
    </span>
  );
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

  const leaderboard = event.leaderboard || [];
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];
  const rest = leaderboard.slice(3);

  return (
    <div>
      <EventStyles />

      <div className="section-title">
        RAREST PULL EVENT <div className="line" />
      </div>

      <div className="evt-timer">
        {left ? (
          <>
            <TimeBlock value={left.days} label="days" />
            <TimeBlock value={left.hours} label="hrs" />
            <TimeBlock value={left.mins} label="min" />
            <TimeBlock value={left.secs} label="sec" />
          </>
        ) : (
          <div className="evt-ended">Event has ended</div>
        )}
      </div>

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-2)", margin: "14px 0 28px" }}>
        Whoever pulls the rarest card before the timer hits zero takes 1st
        place — and something from the canteen. Only your single rarest pull
        counts.
      </p>

      {!loggedIn && <div className="evt-login-hint">Sign up or log in to enter the event.</div>}

      <div className="evt-podium">
        <PodiumSpot place={2} entry={second} height={92} />
        <PodiumSpot place={1} entry={first} height={130} />
        <PodiumSpot place={3} entry={third} height={68} />
      </div>

      {rest.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div className="evt-rest-header">
            <span>Rank 4–{leaderboard.length}</span>
            <span>Top {leaderboard.length}</span>
          </div>
          <div className="evt-row-list">
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
    <div className="evt-time-block">
      <div className="evt-time-value">{String(value).padStart(2, "0")}</div>
      <div className="evt-time-label">{label}</div>
    </div>
  );
}

function PodiumSpot({ place, entry, height }) {
  const theme = PLACE_THEME[place];
  const rarity = entry ? rarityLookup[entry.rarity_key] : null;
  const glowColor = rarity ? rarity.color : "#888";
  const isPrismatic = rarity && rarity.gradient;
  const cardStyle = entry
    ? {
        "--evt-glow": glowColor + "66",
        borderColor: glowColor,
        background: isPrismatic
          ? `linear-gradient(160deg, ${glowColor}22 0%, rgba(20,20,24,0.9) 55%)`
          : `linear-gradient(160deg, ${glowColor}1a 0%, rgba(20,20,24,0.9) 55%)`,
      }
    : undefined;
  const rarityTextStyle = rarity && rarity.gradient ? { "--rarity-gradient": rarity.gradient } : rarity ? { color: rarity.color } : undefined;

  return (
    <div className={`evt-spot evt-spot-${place}`}>
      <div className="evt-rank-badge" style={{ background: theme.grad, boxShadow: `0 4px 14px ${theme.ring}55` }}>
        {place === 1 ? <CrownIcon /> : <MedalIcon place={place} />}
      </div>
      <div
        className={`evt-card${entry ? " has-entry" : ""}${isPrismatic ? " evt-shimmer" : ""}`}
        style={cardStyle}
      >
        {entry ? (
          <>
            <div className="evt-username">
              {entry.title_key && <TitleTag titleKey={entry.title_key} />} {entry.username}
            </div>
            <div className={`evt-rarity${rarity && rarity.gradient ? " gradient-text" : ""}`} style={rarityTextStyle}>
              {entry.rarity_label}
            </div>
            <div className="evt-cardname">{entry.card_name}</div>
          </>
        ) : (
          <div className="evt-empty-spot">— open —</div>
        )}
      </div>
      <div className="evt-stand" style={{ height, background: theme.grad }}>
        <span className="evt-stand-num">{place}</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, entry }) {
  const rarity = rarityLookup[entry.rarity_key];
  const accent = rarity ? rarity.color : "var(--muted-2)";
  const rarityStyle = rarity && rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: accent };

  return (
    <div className="evt-row" style={{ "--evt-accent": accent }}>
      <div className="evt-rank-chip">{rank}</div>
      <div className="evt-row-name">
        {entry.title_key && <TitleTag titleKey={entry.title_key} />} {entry.username}
      </div>
      <div className={`evt-row-rarity${rarity && rarity.gradient ? " gradient-text" : ""}`} style={rarityStyle}>
        {entry.rarity_label}
      </div>
      <div className="evt-row-card">{entry.card_name}</div>
    </div>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2a1a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" fill="#2a1a00" fillOpacity="0.18" />
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
      <path d="M5 18h14" />
    </svg>
  );
}

function MedalIcon({ place }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#241a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="7" fill="#241a10" fillOpacity="0.16" />
      <circle cx="12" cy="13" r="7" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fontWeight="700" stroke="none" fill="#241a10">
        {place}
      </text>
      <path d="M9 7 7 2M15 7l2-5" />
    </svg>
  );
}

function EventStyles() {
  return (
    <style>{`
      .evt-timer { display: flex; gap: 10px; flex-wrap: wrap; }
      .evt-time-block {
        min-width: 62px; text-align: center; padding: 12px 8px;
        border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
      }
      .evt-time-value { font-family: var(--font-mono); font-weight: 800; font-size: 24px; color: #fff; line-height: 1; }
      .evt-time-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted-2); margin-top: 5px; }
      .evt-ended { font-family: var(--font-mono); font-size: 13px; color: var(--muted-2); padding: 10px 0; }
      .evt-login-hint {
        font-family: var(--font-mono); font-size: 11.5px; color: var(--accent, #f2c14e);
        background: rgba(242,193,78,0.08); border: 1px solid rgba(242,193,78,0.25);
        border-radius: 10px; padding: 10px 14px; margin-bottom: 24px;
      }

      .evt-podium { display: flex; align-items: flex-end; justify-content: center; gap: 14px; margin: 4px 0 36px; }
      .evt-spot { display: flex; flex-direction: column; align-items: center; width: 150px; }
      .evt-spot-1 { width: 168px; }

      .evt-rank-badge {
        width: 42px; height: 42px; border-radius: 50%; display: flex;
        align-items: center; justify-content: center; margin-bottom: -18px;
        z-index: 2; border: 2px solid rgba(0,0,0,0.35);
      }

      .evt-card {
        width: 100%; min-height: 108px; border-radius: 14px; border: 1.5px solid rgba(255,255,255,0.1);
        padding: 26px 12px 14px; text-align: center; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px; position: relative; overflow: hidden;
      }
      .evt-card.has-entry { animation: evtGlowPulse 2.6s ease-in-out infinite; }
      .evt-card.evt-shimmer::after {
        content: ""; position: absolute; inset: 0;
        background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0.16) 55%, transparent 70%);
        background-size: 220% 100%; animation: evtShimmer 2.4s linear infinite;
        pointer-events: none;
      }
      .evt-username { font-weight: 800; font-size: 13.5px; color: #fff; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .evt-rarity { font-family: var(--font-mono); font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.03em; }
      .evt-cardname { font-family: var(--font-mono); font-size: 10.5px; color: var(--muted-2); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .evt-empty-spot { font-family: var(--font-mono); font-size: 11px; color: var(--muted-2); }

      .evt-stand { width: 100%; border-radius: 10px 10px 4px 4px; margin-top: 10px; display: flex; align-items: flex-start; justify-content: center; box-shadow: inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.25); }
      .evt-stand-num { font-family: var(--font-mono); font-weight: 800; font-size: 20px; color: rgba(0,0,0,0.45); margin-top: 8px; }

      @keyframes evtGlowPulse {
        0%, 100% { box-shadow: 0 0 16px 1px var(--evt-glow, rgba(255,255,255,0.2)); }
        50% { box-shadow: 0 0 26px 5px var(--evt-glow, rgba(255,255,255,0.35)); }
      }
      @keyframes evtShimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 220% 50%; }
      }

      .evt-rest-header {
        display: flex; justify-content: space-between; font-family: var(--font-mono);
        font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-2);
        margin-bottom: 10px;
      }
      .evt-row-list { display: flex; flex-direction: column; gap: 6px; max-height: 480px; overflow-y: auto; padding-right: 4px; }
      .evt-row {
        display: flex; align-items: center; gap: 14px; padding: 11px 14px;
        border-radius: 11px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-left: 3px solid var(--evt-accent, rgba(255,255,255,0.15));
        transition: background 0.15s ease, transform 0.15s ease;
      }
      .evt-row:hover { background: rgba(255,255,255,0.055); transform: translateX(2px); }
      .evt-rank-chip {
        width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: flex;
        align-items: center; justify-content: center; font-family: var(--font-mono); font-weight: 700;
        font-size: 12px; color: var(--muted-2); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      }
      .evt-row-name { flex: 1; min-width: 0; font-weight: 600; font-size: 13.5px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .evt-row-rarity { font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
      .evt-row-card { font-family: var(--font-mono); font-size: 11.5px; color: var(--muted-2); flex-shrink: 0; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    `}</style>
  );
}