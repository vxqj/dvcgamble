"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeFeed } from "../lib/feed";
import { rarityIndex, rarityByKey, titleByKey, titleDisplay } from "../lib/engine";

// Only pulls RARER than this show up here (Sovereign and up, in the
// current RARITIES order) — everything Ascended-or-more-common stays out
// of everyone's face, the Global Feed already logs Legendary+ for anyone
// who wants to see those. Change this to any RARITIES key to move the bar.
const THRESHOLD_RARITY_KEY = "Sacred";

// How long a toast stays up before it starts fading out, and how long the
// fade itself takes — EXIT_MS must match the .rpt-leaving animation
// duration below or the element gets yanked mid-animation.
const VISIBLE_MS = 6000;
const EXIT_MS = 320;

export default function RarePullToast() {
  // Each entry: { id, payload, leaving, paused }. Multiple can be stacked
  // if two rare pulls land close together — same pattern as
  // AnnouncementBanner.jsx, each with its own independent, hover-pausable
  // timer.
  const [items, setItems] = useState([]);
  const timersRef = useRef(new Map()); // id -> { timeoutId, startedAt, remaining }

  useEffect(() => {
    const threshold = rarityIndex(THRESHOLD_RARITY_KEY);
    // subscribeFeed only calls back for events genuinely new since mount
    // (it silently primes on the first poll) — so this never replays old
    // history as toasts on page load, only live pulls from here on.
    const unsubscribe = subscribeFeed((payload) => {
      if (rarityIndex(payload.rarityKey) > threshold) return; // not rare enough
      const id = payload.id != null ? payload.id : `${payload.ts}-${payload.name}`;
      setItems((prev) => {
        if (prev.some((it) => it.id === id)) return prev; // ignore a dup delivery
        return [...prev, { id, payload, leaving: false, paused: false }];
      });
      scheduleRemoval(id, VISIBLE_MS);
    });
    return () => {
      unsubscribe();
      timersRef.current.forEach((meta) => meta.timeoutId && clearTimeout(meta.timeoutId));
      timersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleRemoval(id, ms) {
    const timeoutId = setTimeout(() => startLeaving(id), ms);
    timersRef.current.set(id, { timeoutId, startedAt: Date.now(), remaining: ms });
  }

  function startLeaving(id) {
    const meta = timersRef.current.get(id);
    if (meta?.timeoutId) clearTimeout(meta.timeoutId);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, leaving: true } : it)));
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      timersRef.current.delete(id);
    }, EXIT_MS);
  }

  function pauseTimer(id) {
    const meta = timersRef.current.get(id);
    if (!meta || !meta.timeoutId) return;
    clearTimeout(meta.timeoutId);
    const elapsed = Date.now() - meta.startedAt;
    const remaining = Math.max(meta.remaining - elapsed, 0);
    timersRef.current.set(id, { timeoutId: null, startedAt: meta.startedAt, remaining });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, paused: true } : it)));
  }

  function resumeTimer(id) {
    const meta = timersRef.current.get(id);
    if (!meta || meta.timeoutId) return;
    scheduleRemoval(id, meta.remaining);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, paused: false } : it)));
  }

  if (items.length === 0) return null;

  return (
    <>
      <RarePullToastStyles />
      <div className="rpt-stack">
        {items.map((it) => (
          <RarePullCard
            key={it.id}
            item={it}
            onMouseEnter={() => pauseTimer(it.id)}
            onMouseLeave={() => resumeTimer(it.id)}
            onDismiss={() => startLeaving(it.id)}
          />
        ))}
      </div>
    </>
  );
}

function RarePullCard({ item, onMouseEnter, onMouseLeave, onDismiss }) {
  const { payload, leaving, paused } = item;
  const rarity = rarityByKey(payload.rarityKey);
  const title = payload.titleKey ? titleByKey(payload.titleKey) : null;
  const titleDisp = title ? titleDisplay(title) : null;
  const glow = rarity.color;

  const cardStyle = {
    "--rpt-glow": glow,
    borderColor: glow,
    background: `linear-gradient(160deg, ${glow}26 0%, rgba(8,8,12,0.95) 62%)`,
  };
  const rarityTextStyle = rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: rarity.color };
  const titleTagStyle = titleDisp
    ? titleDisp.gradient
      ? { "--rarity-gradient": titleDisp.gradient }
      : { color: titleDisp.color }
    : undefined;

  return (
    <div
      className={`rpt-card${leaving ? " rpt-leaving" : ""}${rarity.gradient ? " rpt-shimmer" : ""}`}
      style={cardStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="status"
    >
      <div className="rpt-body">
        <div className="rpt-line1">
          {titleDisp && (
            <span className={`rpt-title-tag${titleDisp.gradient ? " gradient-text" : ""}`} style={titleTagStyle}>
              [{payload.titleKey}]
            </span>
          )}
          <span className="rpt-who">{payload.username || "Someone"}</span>
          <span className="rpt-verb">just unboxed</span>
        </div>
        <div className="rpt-line2">
          <span className={`rpt-rarity${rarity.gradient ? " gradient-text" : ""}`} style={rarityTextStyle}>
            {payload.rarityLabel}
          </span>
          <span className="rpt-cardname">{payload.name}</span>
        </div>
      </div>
      <button type="button" className="rpt-close" aria-label="Dismiss" onClick={onDismiss}>
        <svg viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <span
        className="rpt-progress"
        style={{ animationDuration: `${VISIBLE_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}

function RarePullToastStyles() {
  return (
    <style>{`
      .rpt-stack {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 6500; /* just under AnnouncementBanner's 6600, so an admin
                          announcement always wins if both fire at once */
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        pointer-events: none;
        width: min(94vw, 460px);
      }
      .rpt-card {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
        padding: 14px 16px 15px 15px;
        border-radius: 14px;
        border: 1.5px solid;
        box-shadow:
          0 1px 0 rgba(255,255,255,0.06) inset,
          0 20px 44px -16px rgba(0,0,0,0.75),
          0 0 26px -4px var(--rpt-glow, rgba(255,255,255,0.3)),
          0 0 54px -10px var(--rpt-glow, rgba(255,255,255,0.2));
        font-family: var(--font-mono);
        pointer-events: auto;
        overflow: hidden;
        transform-origin: 50% 0%;
        animation: rptIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both, rptGlowPulse 2.4s ease-in-out infinite 0.55s;
      }
      .rpt-card.rpt-leaving {
        animation: rptOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
      }
      .rpt-card.rpt-shimmer::after {
        content: ""; position: absolute; inset: 0; pointer-events: none;
        background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.14) 45%, rgba(255,255,255,0.14) 55%, transparent 70%);
        background-size: 220% 100%; animation: rptShimmer 2.6s linear infinite;
      }
      .rpt-body { flex: 1; min-width: 0; position: relative; z-index: 1; }
      .rpt-line1 { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }
      .rpt-title-tag { font-weight: 800; font-size: 11px; }
      .rpt-who { font-weight: 800; font-size: 13px; color: #fff; }
      .rpt-verb { font-size: 11px; color: rgba(255,255,255,0.55); }
      .rpt-line2 { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
      .rpt-rarity { font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.03em; }
      .rpt-cardname { font-size: 12px; color: rgba(255,255,255,0.75); }
      .rpt-close {
        position: relative; z-index: 1; flex-shrink: 0;
        display: inline-flex; align-items: center; justify-content: center;
        width: 20px; height: 20px; margin: -2px -2px -2px 0; padding: 0;
        border: none; border-radius: 5px; background: transparent;
        color: rgba(255,255,255,0.4); cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .rpt-close svg { width: 10px; height: 10px; }
      .rpt-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .rpt-close:focus-visible { outline: 1.5px solid var(--rpt-glow, #fff); outline-offset: 1px; }
      .rpt-progress {
        position: absolute; left: 0; bottom: 0; height: 3px; width: 100%;
        background: var(--rpt-glow, #fff);
        box-shadow: 0 0 10px var(--rpt-glow, rgba(255,255,255,0.6));
        transform-origin: left center;
        animation-name: rptProgress; animation-timing-function: linear; animation-fill-mode: forwards;
      }
      @keyframes rptIn {
        0%   { opacity: 0;   transform: translateY(-40px) scale(0.4, 0.4); }
        45%  { opacity: 1;   transform: translateY(4px)   scale(1.08, 0.9); }
        62%  { opacity: 1;   transform: translateY(-4px)  scale(0.96, 1.06); }
        78%  { opacity: 1;   transform: translateY(1px)   scale(1.03, 0.98); }
        90%  { opacity: 1;   transform: translateY(-1px)  scale(0.99, 1.01); }
        100% { opacity: 1;   transform: translateY(0)     scale(1, 1); }
      }
      @keyframes rptOut {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-12px) scale(0.92); }
      }
      @keyframes rptGlowPulse {
        0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 44px -16px rgba(0,0,0,0.75), 0 0 26px -4px var(--rpt-glow, rgba(255,255,255,0.3)), 0 0 54px -10px var(--rpt-glow, rgba(255,255,255,0.2)); }
        50%      { box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 44px -16px rgba(0,0,0,0.75), 0 0 40px 2px var(--rpt-glow, rgba(255,255,255,0.45)), 0 0 76px -6px var(--rpt-glow, rgba(255,255,255,0.3)); }
      }
      @keyframes rptShimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 220% 50%; }
      }
      @keyframes rptProgress {
        0% { transform: scaleX(1); }
        100% { transform: scaleX(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .rpt-card, .rpt-card.rpt-leaving, .rpt-card.rpt-shimmer::after, .rpt-progress { animation: none; }
      }
    `}</style>
  );
}
