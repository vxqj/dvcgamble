"use client";

import { useEffect, useState } from "react";
import { subscribeAnnouncements } from "../lib/announcements";

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissedId, setDismissedId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((payload) => {
      setAnnouncement(payload);
    });
    return unsubscribe;
  }, []);

  if (!announcement || announcement.id === dismissedId) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "linear-gradient(90deg, #1a2a3a, #0f1a24)",
        borderBottom: "1px solid rgba(94,180,242,0.3)",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        color: "#7fc4f2",
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
          background: "#7fc4f2",
          color: "#08131c",
          fontWeight: 800,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        !
      </span>
      <span style={{ flex: 1 }}>{announcement.message}</span>
      <button
        onClick={() => setDismissedId(announcement.id)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "#7fc4f2",
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
