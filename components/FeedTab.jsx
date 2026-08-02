"use client";

import { useEffect, useState } from "react";
import { subscribeFeed, fetchFeedHistory } from "../lib/feed";
import { titleByKey, titleDisplay } from "../lib/engine";

export default function FeedTab({ localFeedCache }) {
  const [items, setItems] = useState(localFeedCache || []);

  useEffect(() => {
    let cancelled = false;
    fetchFeedHistory().then((history) => {
      if (cancelled) return;
      setItems((prev) => mergeById(prev, history));
    });
    const unsubscribe = subscribeFeed((payload) => {
      setItems((prev) => mergeById(prev, [payload]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const sorted = items.slice().sort((a, b) => b.ts - a.ts).slice(0, 60);

  return (
    <div>
      <div className="section-title">GLOBAL FEED <div className="line" /></div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-2)", marginBottom: 16 }}>
        Anonymous, no accounts — every Legendary-or-better pull across everyone currently playing shows up here.
      </p>
      {sorted.length === 0 ? (
        <div className="feed-empty">No rare pulls broadcast yet — waiting for the first one...</div>
      ) : (
        <div className="feed-list">
          {sorted.map((p) => (
            <div className="feed-item" key={p.id}>
              {p.username ? (
                <span className="feed-tag feed-identity">
                  {p.titleKey && <TitleTag titleKey={p.titleKey} />} {p.username}
                </span>
              ) : (
                <span className="feed-tag">Someone</span>
              )}
              <span>pulled</span>
              <span className="feed-rarity" style={{ color: p.color }}>{p.rarityLabel}</span>
              {p.packLabel && <span style={{ color: "var(--muted-2)" }}>from {p.packLabel}</span>}
              <span style={{ color: "var(--muted-2)", marginLeft: "auto" }}>
                {new Date(p.ts).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Titles are cosmetic tags earned by hatching a card of the linked rarity
// (see lib/config.js's TITLES) — this looks that rarity back up so the
// [KEY] tag renders in that rarity's actual color/gradient instead of a
// flat generic color, same treatment every other rarity display in the
// app already gets.
function TitleTag({ titleKey }) {
  const title = titleByKey(titleKey);
  const display = titleDisplay(title);
  if (!display) return null;
  const style = display.gradient ? { "--rarity-gradient": display.gradient } : { color: display.color };
  return (
    <span className={`feed-title-tag${display.gradient ? " gradient-text" : ""}`} style={style}>
      [{titleKey}]
    </span>
  );
}

function mergeById(a, b) {
  const map = new Map();
  [...a, ...b].forEach((p) => map.set(p.id, p));
  return Array.from(map.values());
}