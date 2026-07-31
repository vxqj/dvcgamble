"use client";

import { useEffect, useState } from "react";
import { PATCH_NOTES } from "../lib/config";

const SEEN_KEY = "dvc_gamble_patch_notes_seen_version";

export default function PatchNotesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!PATCH_NOTES || !PATCH_NOTES.version) return;
    let seen = null;
    try {
      seen = localStorage.getItem(SEEN_KEY);
    } catch (e) {
      // localStorage unavailable — just don't show it rather than risk a loop
      return;
    }
    if (seen !== PATCH_NOTES.version) setOpen(true);
  }, []);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, PATCH_NOTES.version);
    } catch (e) {
      // ignore — worst case it shows again next visit, not the end of the world
    }
  }

  if (!open || !PATCH_NOTES) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 200 }}>
      <div
        style={{
          width: "min(480px, 92vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          background: "var(--surface, #16161a)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "26px 24px 22px",
          position: "relative",
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            color: "var(--muted-2, #9a9aa2)",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent, #f2c14e)",
            marginBottom: 4,
          }}
        >
          {PATCH_NOTES.version}
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            color: "#fff",
            marginBottom: 18,
          }}
        >
          {PATCH_NOTES.title || "Patch Notes"}
        </div>

        {(PATCH_NOTES.sections || []).map((section, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11.5,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--muted-2, #9a9aa2)",
                marginBottom: 8,
              }}
            >
              {section.heading}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {(section.items || []).map((item, j) => (
                <li key={j} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <button
          onClick={handleClose}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "11px 0",
            borderRadius: 10,
            border: "1px solid var(--accent, #f2c14e)",
            background: "rgba(242,193,78,0.12)",
            color: "var(--accent, #f2c14e)",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
