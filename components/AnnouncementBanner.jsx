"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeAnnouncements } from "../lib/announcements";

// How long a pill stays fully visible before it starts fading out.
const VISIBLE_MS = 5000;
// Must match the .ann-leaving animation duration in AnnouncementStyles below
// — this is how long we wait after starting the exit animation before
// actually removing the item, so it gets to finish playing instead of
// popping out instantly.
const EXIT_MS = 320;

export default function AnnouncementBanner() {
  // Each entry: { id, message, leaving }. Multiple can be visible at once —
  // if a new announcement comes in while one's already showing, it's
  // appended to the end and renders BELOW the existing one(s) in the
  // stack, each with its own independent 5s timer.
  const [items, setItems] = useState([]);
  const timersRef = useRef(new Map()); // id -> timeout handle

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((payload) => {
      setItems((prev) => {
        if (prev.some((it) => it.id === payload.id)) return prev; // ignore a dup delivery
        return [...prev, { id: payload.id, message: payload.message }];
      });
      const t = setTimeout(() => startLeaving(payload.id), VISIBLE_MS);
      timersRef.current.set(payload.id, t);
    });
    return () => {
      unsubscribe();
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startLeaving(id) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, leaving: true } : it)));
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      timersRef.current.delete(id);
    }, EXIT_MS);
  }

  if (items.length === 0) return null;

  return (
    <>
      <AnnouncementStyles />
      <div className="ann-stack">
        {items.map((it) => (
          <div key={it.id} className={`ann-pill${it.leaving ? " ann-leaving" : ""}`}>
            <span className="ann-dot">!</span>
            <span className="ann-text">{it.message}</span>
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
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 6600;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        pointer-events: none;
        max-width: min(92vw, 560px);
      }
      .ann-pill {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 22px;
        border-radius: 999px;
        background: linear-gradient(90deg, #1a2a3a, #14212e);
        border: 1px solid rgba(94,180,242,0.4);
        box-shadow: 0 14px 40px rgba(0,0,0,0.55), 0 0 26px rgba(94,180,242,0.18);
        font-family: var(--font-mono);
        font-size: 13px;
        color: #cfe9ff;
        pointer-events: auto;
        animation: annIn 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both;
      }
      .ann-pill.ann-leaving {
        animation: annOut 0.32s ease forwards;
      }
      .ann-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #7fc4f2;
        color: #08131c;
        font-weight: 800;
        font-size: 12px;
        flex-shrink: 0;
      }
      .ann-text {
        white-space: normal;
        word-break: break-word;
        text-align: center;
      }
      @keyframes annIn {
        0% { opacity: 0; transform: scale(0.75) translateY(-14px); }
        60% { opacity: 1; transform: scale(1.04) translateY(2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes annOut {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.85) translateY(-8px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .ann-pill, .ann-pill.ann-leaving { animation: none; }
      }
    `}</style>
  );
}