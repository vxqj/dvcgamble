"use client";

import { useEffect, useState } from "react";
import { fetchUsernameCandidate, signup, login } from "../lib/authClient";

export default function AuthModal({ localState, onClose, onAuthed }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [username, setUsername] = useState("");
  const [rolling, setRolling] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [issuedCode, setIssuedCode] = useState(null); // shown once after signup
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode === "signup" && !username) rerollUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function rerollUsername() {
    setRolling(true);
    setError("");
    try {
      const name = await fetchUsernameCandidate();
      setUsername(name);
    } catch (e) {
      setError("Couldn't reach the server — try again");
    } finally {
      setRolling(false);
    }
  }

  async function handleSignup() {
    setError("");
    if (password.length < 4) return setError("Password must be at least 4 characters");
    if (password !== confirmPassword) return setError("Passwords don't match");
    setBusy(true);
    try {
      const res = await signup({ username, password, state: localState });
      setIssuedCode({ code: res.loginCode, username: res.username, token: res.token, state: res.state });
    } catch (e) {
      setError(e.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    setError("");
    if (!loginCode || !password) return setError("Enter your login code and password");
    setBusy(true);
    try {
      const res = await login({ loginCode, password });
      onAuthed({ token: res.token, username: res.username, state: res.state });
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!issuedCode) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(issuedCode.code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }

  function handleDoneWithCode() {
    onAuthed({ token: issuedCode.token, username: issuedCode.username, state: issuedCode.state });
  }

  return (
    <div className="modal-backdrop auth-modal-backdrop">
      <div className="auth-modal">
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ×
        </button>

        {issuedCode ? (
          <div className="auth-code-screen">
            <div className="auth-title">Save this login code</div>
            <p className="auth-sub">
              This is the only time it's shown. You'll need it — with your
              password — to log back in on another device or after clearing
              your browser.
            </p>
            <div className="auth-code-box" onClick={handleCopy}>
              {issuedCode.code}
              <span className="auth-copy-hint">{copied ? "Copied!" : "tap to copy"}</span>
            </div>
            <button className="auth-submit-btn" onClick={handleDoneWithCode}>
              I've saved it — continue
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                className={`auth-tab${mode === "signup" ? " active" : ""}`}
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
              >
                Sign Up
              </button>
              <button
                className={`auth-tab${mode === "login" ? " active" : ""}`}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Log In
              </button>
            </div>

            {mode === "signup" ? (
              <div className="auth-body">
                <div className="auth-label">Your username</div>
                <div className="auth-username-row">
                  <div className="auth-username-box">{username || "..."}</div>
                  <button
                    className="auth-dice-btn"
                    onClick={rerollUsername}
                    disabled={rolling}
                    title="Reroll username"
                    type="button"
                  >
                    🎲
                  </button>
                </div>
                <div className="auth-label">Password</div>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                />
                <div className="auth-label">Confirm password</div>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {error && <div className="auth-error">{error}</div>}
                <button className="auth-submit-btn" onClick={handleSignup} disabled={busy}>
                  {busy ? "Creating..." : "Create account"}
                </button>
              </div>
            ) : (
              <div className="auth-body">
                <div className="auth-label">Login code</div>
                <input
                  className="auth-input"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  placeholder="XXXXX-XXXXX"
                />
                <div className="auth-label">Password</div>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && <div className="auth-error">{error}</div>}
                <button className="auth-submit-btn" onClick={handleLogin} disabled={busy}>
                  {busy ? "Logging in..." : "Log in"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
