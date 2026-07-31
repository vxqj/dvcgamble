"use client";

import { useState } from "react";

// Simple dismissible heads-up banner, styled to match the amber "technical
// issue" banner style. Toggle SHOW_BANNER below to turn it on/off without
// deleting anything — flip it back to false once things are stable and the
// banner disappears everywhere with no other changes needed.
const SHOW_BANNER = false;
const MESSAGE = "We're aware some players may be experiencing slowness right now — working on it.";

export default function StatusBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!SHOW_BANNER || dismissed) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "linear-gradient(90deg, #2a1a05, #1f1503)",
        borderBottom: "1px solid rgba(242,193,78,0.25)",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        color: "#f2c14e",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#f2c14e",
          color: "#1a1200",
          fontWeight: 800,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        !
      </span>
      <span style={{ flex: 1 }}>{MESSAGE}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "#f2c14e",
          opacity: 0.7,
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}
