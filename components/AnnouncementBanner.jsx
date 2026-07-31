<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Announcement banner preview</title>
<style>
  :root { --font-mono: 'SF Mono', 'Fira Code', monospace; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #0a0b0e;
    background-image: radial-gradient(circle at 50% 0%, #14151b 0%, #0a0b0e 60%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    font-family: -apple-system, sans-serif;
  }
  button {
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid rgba(242,193,75,0.3);
    background: rgba(242,193,75,0.08);
    color: #f4c95d;
    cursor: pointer;
  }
  button:hover { background: rgba(242,193,75,0.16); }

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
  .ann-text, .ann-icon, .ann-close { position: relative; z-index: 1; }
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
</style>
</head>
<body>

<button id="fire1">Show one announcement</button>
<button id="fire2">Show two stacked</button>

<div class="ann-stack" id="stack"></div>

<script>
  const VISIBLE_MS = 5000;
  const EXIT_MS = 260;
  const stack = document.getElementById('stack');
  let counter = 0;

  function addAnnouncement(message) {
    const id = 'a' + (counter++);
    const card = document.createElement('div');
    card.className = 'ann-card';
    card.innerHTML = `
      <span class="ann-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5L11.9 7.4L18 8.2L13.3 12.1L14.7 18.2L10 14.8L5.3 18.2L6.7 12.1L2 8.2L8.1 7.4L10 1.5Z" />
        </svg>
      </span>
      <span class="ann-text">${message}</span>
      <button type="button" class="ann-close" aria-label="Dismiss">
        <svg viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>
      <span class="ann-progress" style="animation-duration:${VISIBLE_MS}ms"></span>
    `;
    stack.appendChild(card);

    let startedAt = Date.now(), remaining = VISIBLE_MS, timeoutId;
    const progress = card.querySelector('.ann-progress');

    function schedule(ms) {
      timeoutId = setTimeout(leave, ms);
      startedAt = Date.now();
      remaining = ms;
    }
    function leave() {
      card.classList.add('ann-leaving');
      setTimeout(() => card.remove(), EXIT_MS);
    }
    card.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
      remaining = Math.max(remaining - (Date.now() - startedAt), 0);
      progress.style.animationPlayState = 'paused';
    });
    card.addEventListener('mouseleave', () => {
      schedule(remaining);
      progress.style.animationPlayState = 'running';
    });
    card.querySelector('.ann-close').addEventListener('click', () => {
      clearTimeout(timeoutId);
      leave();
    });
    schedule(VISIBLE_MS);
  }

  document.getElementById('fire1').addEventListener('click', () => {
    addAnnouncement('Vault Pack drop just landed — guaranteed Legendary+.');
  });
  document.getElementById('fire2').addEventListener('click', () => {
    addAnnouncement('Server restart in 10 minutes.');
    setTimeout(() => addAnnouncement('Double credits event is now live.'), 300);
  });
</script>
</body>
</html>