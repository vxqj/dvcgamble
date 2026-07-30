"use client";

import { useEffect, useRef, useState } from "react";
import { rarityIndex } from "../lib/engine";
import { ENABLE_PRISMATIC_ANIMATION } from "../lib/config";
import { PackIcon } from "./Icons";

// Larger batches (Multi Open) reveal a lot more cards at once — stagger
// faster as the batch grows so a 25+ card reveal doesn't take forever,
// while a normal 5-card pack still gets the slower, punchier pacing.
// `speedMultiplier` comes from the Quick Hands upgrade (1 = base speed,
// smaller = faster) and scales on top of the batch-size pacing below.
function flipStaggerMs(count, speedMultiplier = 1) {
  const base = count > 24 ? 55 : count > 15 ? 90 : count > 8 ? 150 : 300;
  return Math.round(base * speedMultiplier);
}

// Must match the duration of the `prismaticFlip` keyframes in globals.css —
// this one stays fixed regardless of Quick Hands, since speeding it up
// would desync it from the CSS animation.
const PRISMATIC_FLIP_MS = 1300;

// How long the "done" screen sits before an auto-open run collects it and
// moves on to the next batch — long enough to actually see what you got.
// Scaled down by Quick Hands the same way the flip stagger is, with its
// own floor so it never disappears entirely.
const BASE_AUTO_COLLECT_DELAY_MS = 1100;
const MIN_AUTO_COLLECT_DELAY_MS = 350;

// Gate on the master switch in lib/config.js — a rarity flagged
// prismatic: true only gets the effect if the switch is also on.
function isPrismatic(rarity) {
  return ENABLE_PRISMATIC_ANIMATION && !!rarity.prismatic;
}

// CSS vars for a rarity's own foil glow cycle (falls back to the default
// rainbow in globals.css if a rarity doesn't define pulseColors).
function pulseVars(rarity) {
  const c = rarity.pulseColors;
  if (!c || c.length < 4) return undefined;
  return { "--pc1": c[0], "--pc2": c[1], "--pc3": c[2], "--pc4": c[3] };
}

export default function PackOpenModal({
  pack, results, accent, openCount, soundEnabled, onCollect,
  isAuto, autoStart, onCancelAuto, onHide, speedMultiplier = 1,
}) {
  const [phase, setPhase] = useState("idle"); // idle -> shaking -> revealing -> done
  const [flippedCount, setFlippedCount] = useState(0);
  const [showBig, setShowBig] = useState(false);
  const [bigShake, setBigShake] = useState(false);
  const particleLayerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const collectedRef = useRef(false);

  const best = results.reduce((a, b) => (rarityIndex(b.rarity.key) < rarityIndex(a.rarity.key) ? b : a), results[0]);
  const stagger = flipStaggerMs(results.length, speedMultiplier);
  const autoCollectDelay = Math.max(MIN_AUTO_COLLECT_DELAY_MS, Math.round(BASE_AUTO_COLLECT_DELAY_MS * speedMultiplier));
  const compact = results.length > 8;
  const ultra = results.length > 20;
  const prismaticIndex = results.findIndex((r) => isPrismatic(r.rarity));
  const bestPrismatic = isPrismatic(best.rarity);

  // Auto-open runs skip the "tap to open" idle screen entirely.
  useEffect(() => {
    if (autoStart && phase === "idle") setPhase("shaking");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (phase !== "shaking") return;
    const t = setTimeout(() => setPhase("revealing"), 550);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealing") return;
    let timers = [];
    results.forEach((r, i) => {
      timers.push(
        setTimeout(() => {
          setFlippedCount(i + 1);
          playFlipTone(audioCtxRef, soundEnabled, r.rarity.fx);
        }, i * stagger)
      );
      // Prismatic cards get a much longer flip (spin + grow + land + shake)
      // — fire the big screen shake right as it "lands", near the end of
      // that card's own flip animation rather than the normal flip tick.
      if (isPrismatic(r.rarity)) {
        const landAt = i * stagger + PRISMATIC_FLIP_MS - 150;
        timers.push(setTimeout(() => setBigShake(true), landAt));
        timers.push(setTimeout(() => setBigShake(false), landAt + 520));
      }
    });

    const normalEnd = results.length * stagger + 500;
    const prismaticEnd = prismaticIndex >= 0 ? prismaticIndex * stagger + PRISMATIC_FLIP_MS + 300 : 0;
    const totalTime = Math.max(normalEnd, prismaticEnd);

    timers.push(
      setTimeout(() => {
        setPhase("done");
        if (best.rarity.fx >= 2) {
          setShowBig(true);
          spawnParticles(particleLayerRef.current, best.rarity.color, bestPrismatic ? 100 : best.rarity.fx >= 4 ? 70 : 45);
        }
      }, totalTime)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-open: once the reveal is done, collect automatically after a short
  // viewing delay instead of waiting on a click, so the run can keep going
  // unattended.
  useEffect(() => {
    if (phase !== "done" || !isAuto) return;
    const t = setTimeout(() => {
      if (!collectedRef.current) handleCollect();
    }, autoCollectDelay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isAuto]);

  function handleStart() {
    if (phase !== "idle") return;
    setPhase("shaking");
  }

  function handleCollect() {
    if (collectedRef.current) return;
    collectedRef.current = true;
    onCollect(results);
  }

  return (
    <div className="modal-backdrop">
      {isAuto && onHide && (
        <button className="modal-close-btn" onClick={onHide} title="Hide (keeps auto-opening in the background)">
          −
        </button>
      )}
      <div className={`pack-open-stage${bigShake ? " shake-screen" : ""}`} style={{ "--accent": accent }}>
        {phase === "idle" && (
          <>
            <div className="pack-hero" style={{ "--accent": accent }} onClick={handleStart}>
              <PackIcon icon={pack.icon} className="hero-icon" />
            </div>
            <div className="pack-hint">
              tap to open — {openCount > 1 ? `${openCount}x ${pack.label}` : pack.label}
            </div>
          </>
        )}

        {phase === "shaking" && (
          <div className="pack-hero shaking" style={{ "--accent": accent }}>
            <PackIcon icon={pack.icon} className="hero-icon" />
          </div>
        )}

        {(phase === "revealing" || phase === "done") && (
          <>
            <div className={`reveal-grid${ultra ? " ultra" : compact ? " compact" : ""}`}>
              {results.map((r, i) => (
                <FlipCard key={i} result={r} flipped={i < flippedCount} />
              ))}
            </div>
            <div className="reveal-actions">
              <button className="collect-btn" disabled={phase !== "done"} onClick={handleCollect}>
                {phase === "done" ? (isAuto ? "Collect now" : "Collect") : "Revealing..."}
              </button>
              {isAuto && onCancelAuto && (
                <button className="cancel-auto-btn" onClick={onCancelAuto}>
                  Cancel auto-open
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div id="particle-layer" ref={particleLayerRef} />

      <div id="big-reveal-overlay" className={showBig ? "show" : ""} style={{ "--ray-color": best.rarity.color + "33" }} onClick={() => setShowBig(false)}>
        <div className="big-reveal-rays" />
        <div
          className={`big-reveal-card${bestPrismatic ? " prismatic" : ""}`}
          style={{ "--glow-color": best.rarity.color + "99", borderColor: best.rarity.color, ...pulseVars(best.rarity) }}
        >
          <div className="big-reveal-inner">
            <div
              className="big-reveal-swatch"
              style={{ background: best.rarity.gradient || best.rarity.color, color: best.rarity.color }}
            />
            <div
              className={`big-reveal-label${best.rarity.gradient ? " gradient-text" : ""}`}
              style={best.rarity.gradient ? { "--rarity-gradient": best.rarity.gradient } : { color: best.rarity.color }}
            >
              {best.rarity.label.toUpperCase()}
            </div>
            <div className="big-reveal-name">{best.name}</div>
          </div>
        </div>
        <div className="big-reveal-hint">tap to dismiss</div>
      </div>
    </div>
  );
}

function FlipCard({ result, flipped }) {
  const { rarity, name } = result;
  const prismatic = isPrismatic(rarity);
  const fxClass = prismatic ? " is-prismatic" : rarity.fx >= 1 ? ` is-rare-fx${rarity.fx}` : "";
  const displayName = rarity.hidden && !flipped ? "???" : name;
  const innerClass = `flip-card-inner${flipped ? " flipped" : ""}${flipped && prismatic ? " prismatic-flip" : ""}`;
  const labelStyle = rarity.gradient ? { "--rarity-gradient": rarity.gradient } : { color: rarity.color };
  const backStyle = { color: rarity.color, borderColor: rarity.color, ...pulseVars(rarity) };

  return (
    <div className="flip-card">
      <div className={innerClass}>
        <div className="flip-face flip-front">
          <div className="flip-logo" />
        </div>
        <div className={`flip-face flip-back${fxClass}`} style={backStyle}>
          <div className="fb-swatch" style={{ background: rarity.gradient || rarity.color }} />
          <div className={`fb-rarity${rarity.gradient ? " gradient-text" : ""}`} style={labelStyle}>
            {rarity.hidden ? "???" : rarity.label}
          </div>
          <div className="fb-name">{displayName}</div>
        </div>
      </div>
    </div>
  );
}

function spawnParticles(layer, color, count) {
  if (!layer) return;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.42;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 280;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 40;
    const size = 4 + Math.random() * 6;
    p.style.setProperty("--tx", tx + "px");
    p.style.setProperty("--ty", ty + "px");
    p.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
    p.style.setProperty("--dur", 0.8 + Math.random() * 0.8 + "s");
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.style.background = color;
    if (i % 3 === 0) p.style.boxShadow = `0 0 8px ${color}`;
    frag.appendChild(p);
    setTimeout(() => p.remove(), 1800);
  }
  layer.appendChild(frag);
}

function playFlipTone(audioCtxRef, enabled, fx) {
  if (!enabled) return;
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const baseFreq = 420 + fx * 140;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = fx >= 3 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // audio not available — ignore
  }
}