"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeAnnouncements } from "../lib/announcements";

// How long a pill stays fully visible before it starts fading out.
const VISIBLE_MS = 5000;
// Must match the .ann-leaving animation duration in AnnouncementStyles below
// — this is how long we wait after starting the exit animation before
// actually removing the item, so it gets to finish playing instead of
// popping out instantly.
const EXIT_MS = 280;

export default function AnnouncementBanner() {
  // Each entry: { id, message, leaving, paused }. Multiple can be visible at
  // once — if a new announcement comes in while one's already showing, it's
  // appended to the end and renders BELOW the existing one(s) in the stack,
  // each with its own independent timer that can be paused on hover.
  const [items, setItems] = useState([]);
  // id -> { timeoutId, startedAt, remaining }
  const timersRef = useRef(new Map());

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((payload) => {
      setItems((prev) => {
        if (prev.some((it) => it.id === payload.id)) return prev; // ignore a dup delivery
        return [...prev, { id: payload.id, message: payload.message }];
      });
      scheduleRemoval(payload.id, VISIBLE_MS);
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
      <AnnouncementStyles />
      <div className="ann-stack">
        {items.map((it) => (
          <div
            key={it.id}
            className={`ann-card${it.leaving ? " ann-leaving" : ""}`}
            onMouseEnter={() => pauseTimer(it.id)}
            onMouseLeave={() => resumeTimer(it.id)}
            role="status"
          >
            <span className="ann-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1.5L11.9 7.4L18 8.2L13.3 12.1L14.7 18.2L10 14.8L5.3 18.2L6.7 12.1L2 8.2L8.1 7.4L10 1.5Z" />
              </svg>
            </span>
            <span className="ann-text">{it.message}</span>
            <button
              type="button"
              className="ann-close"
              aria-label="Dismiss"
              onClick={() => startLeaving(it.id)}
            >
              <svg viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            <span
              className="ann-progress"
              style={{
                animationDuration: `${VISIBLE_MS}ms`,
                animationPlayState: it.paused ? "paused" : "running",
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function AnnouncementStyles() {
  return (
    <style>{`
      .ann-stack {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 6600;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        pointer-events: none;
        width: min(92vw, 420px);
      }
      .ann-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 13px 15px 14px 13px;
        border-radius: 12px;
        border: 1px solid transparent;
        background:
          linear-gradient(180deg, #14161c, #0b0c10) padding-box,
          linear-gradient(135deg, #f2c14b, #a855f7) border-box;
        box-shadow:
          0 1px 0 rgba(255,255,255,0.05) inset,
          0 20px 40px -14px rgba(0,0,0,0.7),
          0 0 22px -2px rgba(242,193,75,0.35),
          0 0 46px -10px rgba(168,85,247,0.4);
        font-family: var(--font-mono);
        pointer-events: auto;
        overflow: hidden;
        transform-origin: 50% 0%;
        animation: annIn 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      .ann-card.ann-leaving {
        animation: annOut 0.26s cubic-bezier(0.4, 0, 1, 1) forwards;
      }
      .ann-icon {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(135deg, #f4c95d, #a855f7);
        box-shadow: 0 0 14px -2px rgba(242,193,75,0.6);
      }
      .ann-icon svg { width: 15px; height: 15px; color: #17101f; }
      .ann-text {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        line-height: 1.45;
        letter-spacing: 0.01em;
        color: #f2ecdd;
        word-break: break-word;
      }
      .ann-close {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin: -2px -2px -2px 0;
        padding: 0;
        border: none;
        border-radius: 5px;
        background: transparent;
        color: rgba(242,236,221,0.4);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .ann-close svg { width: 10px; height: 10px; }
      .ann-close:hover {
        background: rgba(242,193,75,0.14);
        color: #f4c95d;
      }
      .ann-close:focus-visible {
        outline: 1.5px solid #f4c95d;
        outline-offset: 1px;
      }
      .ann-progress {
        position: absolute;
        left: 0;
        bottom: 0;
        height: 3px;
        width: 100%;
        background: linear-gradient(90deg, #f4c95d, #a855f7);
        box-shadow: 0 0 8px rgba(242,193,75,0.6);
        transform-origin: left center;
        animation-name: annProgress;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
      .ann-text, .ann-icon, .ann-close {
        position: relative;
        z-index: 1;
      }
      @keyframes annIn {
        0%   { opacity: 0;   transform: translateY(-36px) scale(0.4, 0.4); }
        45%  { opacity: 1;   transform: translateY(3px)   scale(1.08, 0.9); }
        62%  { opacity: 1;   transform: translateY(-4px)  scale(0.96, 1.06); }
        78%  { opacity: 1;   transform: translateY(1px)   scale(1.03, 0.98); }
        90%  { opacity: 1;   transform: translateY(-1px)  scale(0.99, 1.01); }
        100% { opacity: 1;   transform: translateY(0)     scale(1, 1); }
      }
      @keyframes annOut {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-10px) scale(0.92); }
      }
      @keyframes annProgress {
        0% { transform: scaleX(1); }
        100% { transform: scaleX(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .ann-card, .ann-card.ann-leaving, .ann-progress { animation: none; }
      }
    `}</style>
  );
}