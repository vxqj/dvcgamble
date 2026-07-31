"use client";

import { useEffect, useState } from "react";
import { COIN_INTERVAL_MS } from "../lib/config";
import { fmtNum } from "../lib/engine";
import { PeopleIcon } from "./Icons";

export default function TopBar({
  coins, onlineCount, coinsPerTick, authedUsername, onOpenAuth, onLogout,
  isAdmin, onOpenAdmin,
}) {
  const [tick, setTick] = useState(false);
  const [prevCoins, setPrevCoins] = useState(coins);

  useEffect(() => {
    if (coins !== prevCoins) {
      setTick(true);
      setPrevCoins(coins);
      const t = setTimeout(() => setTick(false), 350);
      return () => clearTimeout(t);
    }
  }, [coins, prevCoins]);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">DVC</div>
        <div className="brand-text">
          <div className="name">DVC <span>GAMBLE</span></div>
          <div className="tag">card unbox</div>
        </div>
      </div>
      <div className="topbar-pills">
        <div className="coin-pill online-pill" title="Estimated players online right now">
          <PeopleIcon className="pill-icon" />
          <div>
            <div className="coin-value">{fmtNum(onlineCount || 1)}</div>
            <div className="coin-rate">online now</div>
          </div>
        </div>
        <div className={`coin-pill${tick ? " tick" : ""}`}>
          <div className="coin-icon" />
          <div>
            <div className="coin-value">{fmtNum(coins)}</div>
            <div className="coin-rate">+{coinsPerTick || 1} every {(COIN_INTERVAL_MS / 1000).toFixed(0)}s</div>
          </div>
        </div>
        {/*
          Only ever rendered when the server (fetchMeFull -> /api/auth/me)
          said isAdmin: true for the currently logged-in account. This is
          the ONLY place the button appears — nothing shows it based on a
          localStorage flag or anything else the client could fake, and
          clicking it still goes through the same server check again on
          every action anyway (see lib/adminAuth.js), so this is purely a
          convenience for you, not the actual security boundary.
        */}
        {isAdmin && (
          <button
            className="auth-btn"
            onClick={onOpenAdmin}
            title="Admin"
            style={{ width: 34, padding: 0, fontSize: 15 }}
          >
            ⚙
          </button>
        )}
        {authedUsername ? (
          <button className="auth-btn logged-in" onClick={onLogout} title="Log out">
            {authedUsername}
          </button>
        ) : (
          <button className="auth-btn" onClick={onOpenAuth}>
            Sign Up / Log In
          </button>
        )}
      </div>
    </header>
  );
}