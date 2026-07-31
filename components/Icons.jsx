// Small stroke-style icons shared by the nav tabs and top bar. Plain SVG,
// sized via CSS (currentColor + no fixed width/height) so they inherit
// whatever color/size context they're dropped into.

export function ShopIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7h18l-1.4 12.2a2 2 0 0 1-2 1.8H6.4a2 2 0 0 1-2-1.8L3 7Z" />
      <path d="M8 7V5.5a4 4 0 0 1 8 0V7" />
    </svg>
  );
}

export function InventoryIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M3 8.5 5 4h14l2 4.5" />
      <path d="M9.5 12.5h5" />
    </svg>
  );
}

export function FeedIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a15.5 15.5 0 0 1 0 18" />
      <path d="M12 3a15.5 15.5 0 0 0 0 18" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function UpgradeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 19V6" />
      <path d="M5.5 12.5 12 6l6.5 6.5" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
      <path d="M6 7l1 12.5a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function PeopleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M21.5 20c0-2.6-1.9-4.8-4.5-5.6" />
    </svg>
  );
}

export function TrophyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a3 3 0 0 0 3 5" />
      <path d="M16 5h3a3 3 0 0 1-3 5" />
      <path d="M12 12v4" />
      <path d="M9 20h6" />
      <path d="M10 16h4l1 4H9l1-4Z" />
    </svg>
  );
}

export function GavelIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m14.5 4.5-6 6" />
      <path d="m17.5 7.5-6 6" />
      <path d="m11.5 9.5-6 6 3 3 6-6" />
      <path d="M2 22l5-5" />
      <path d="m18 2 4 4-2.5 2.5-4-4Z" />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   PACK ART ICONS
   One illustrated icon per pack "tier" (see PACKS[].icon in lib/config.js),
   used in the Shop grid, the Inventory's owned-pack cards, and the pack-open
   modal's hero. All draw in currentColor plus soft white/black overlays for
   shading, so they inherit whatever --accent color the pack card sets —
   no per-pack SVG needed, just pick one of these five and a color.
   -------------------------------------------------------------------------- */

export function PackIcon({ icon, ...props }) {
  switch (icon) {
    case "satchel":
      return <SatchelIcon {...props} />;
    case "chest":
      return <ChestIcon {...props} />;
    case "vault":
      return <VaultIcon {...props} />;
    case "dice":
      return <DiceIcon {...props} />;
    case "crate":
    default:
      return <CrateIcon {...props} />;
  }
}

function CrateIcon(props) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <rect x="8" y="20" width="48" height="34" rx="4" fill="currentColor" />
      <rect x="8" y="20" width="48" height="34" rx="4" stroke="#000" strokeOpacity="0.22" strokeWidth="1.5" />
      <path d="M8 24h48" stroke="#000" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M14 20v34M50 20v34" stroke="#000" strokeOpacity="0.22" strokeWidth="2" />
      <path d="M8 37h48" stroke="#000" strokeOpacity="0.18" strokeWidth="1.5" />
      <path d="M6 20 32 8l26 12" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d="M6 20 32 8l26 12" stroke="#fff" strokeOpacity="0.18" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="27" r="2" fill="#000" fillOpacity="0.3" />
      <circle cx="50" cy="27" r="2" fill="#000" fillOpacity="0.3" />
      <circle cx="14" cy="47" r="2" fill="#000" fillOpacity="0.3" />
      <circle cx="50" cy="47" r="2" fill="#000" fillOpacity="0.3" />
    </svg>
  );
}

function SatchelIcon(props) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <path d="M20 15c0-6 5-11 12-11s12 5 12 11" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M14 24c0-4 3-7 7-7h22c4 0 7 3 7 7l3 25c.6 5-3.3 9-8.3 9H19.3c-5 0-8.9-4-8.3-9l3-25Z"
        fill="currentColor"
      />
      <path
        d="M14 24c0-4 3-7 7-7h22c4 0 7 3 7 7l3 25c.6 5-3.3 9-8.3 9H19.3c-5 0-8.9-4-8.3-9l3-25Z"
        stroke="#000" strokeOpacity="0.2" strokeWidth="1.5"
      />
      <path d="M18 25c2-3 4.5-4.5 14-4.5S44 22 46 25" stroke="#fff" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="24" y="30" width="16" height="12" rx="3" fill="#000" fillOpacity="0.22" />
      <circle cx="32" cy="36" r="2.4" fill="#fff" fillOpacity="0.55" />
    </svg>
  );
}

function ChestIcon(props) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <path d="M9 28c0-3.3 2.7-6 6-6h34c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H15c-3.3 0-6-2.7-6-6V28Z" fill="currentColor" />
      <path d="M9 28c0-3.3 2.7-6 6-6h34c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H15c-3.3 0-6-2.7-6-6V28Z" stroke="#000" strokeOpacity="0.24" strokeWidth="1.5" />
      <path d="M8 30c8-5 40-5 48 0" stroke="#fff" strokeOpacity="0.2" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path
        d="M12 26v-3c0-6.6 8.9-12 20-12s20 5.4 20 12v3"
        stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      <path
        d="M12 26v-3c0-6.6 8.9-12 20-12s20 5.4 20 12v3"
        stroke="#000" strokeOpacity="0.15" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      <rect x="9" y="27" width="46" height="4.5" fill="#000" fillOpacity="0.25" />
      <rect x="27" y="30" width="10" height="14" rx="2.5" fill="#000" fillOpacity="0.3" />
      <circle cx="32" cy="35" r="2.2" fill="#ffe08a" />
      <circle cx="15" cy="34" r="1.8" fill="#000" fillOpacity="0.28" />
      <circle cx="15" cy="44" r="1.8" fill="#000" fillOpacity="0.28" />
      <circle cx="49" cy="34" r="1.8" fill="#000" fillOpacity="0.28" />
      <circle cx="49" cy="44" r="1.8" fill="#000" fillOpacity="0.28" />
    </svg>
  );
}

function VaultIcon(props) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <circle cx="32" cy="32" r="24" fill="currentColor" />
      <circle cx="32" cy="32" r="24" stroke="#000" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="17.5" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="6.5" fill="#000" fillOpacity="0.32" />
      <circle cx="32" cy="32" r="6.5" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.2" />
      <g stroke="#000" strokeOpacity="0.3" strokeWidth="3.4" strokeLinecap="round">
        <path d="M32 14.5v6" />
        <path d="M32 43.5v6" />
        <path d="M14.5 32h6" />
        <path d="M43.5 32h6" />
        <path d="M20 20l4.2 4.2" />
        <path d="M39.8 39.8L44 44" />
        <path d="M44 20l-4.2 4.2" />
        <path d="M24.2 39.8L20 44" />
      </g>
      <circle cx="20.5" cy="20.5" r="2.6" fill="#fff" fillOpacity="0.18" />
    </svg>
  );
}

function DiceIcon(props) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <path d="M27 40l-16-9.5V13l16 9.5v17.5Z" fill="currentColor" />
      <path d="M27 40l17-9.5V13l-17 9.5v17.5Z" fill="currentColor" fillOpacity="0.75" />
      <path d="M27 22.5 44 13l-17-8-17 8 17 9.5Z" fill="currentColor" fillOpacity="0.92" />
      <path d="M27 40l-16-9.5V13l16 9.5v17.5Z" stroke="#000" strokeOpacity="0.25" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M27 40l17-9.5V13l-17 9.5v17.5Z" stroke="#000" strokeOpacity="0.25" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M27 22.5 44 13l-17-8-17 8 17 9.5Z" stroke="#000" strokeOpacity="0.2" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="22" cy="19" r="1.8" fill="#fff" fillOpacity="0.85" />
      <circle cx="16" cy="26" r="1.8" fill="#fff" fillOpacity="0.85" />
      <circle cx="22" cy="33" r="1.8" fill="#fff" fillOpacity="0.85" />
      <circle cx="36" cy="19" r="1.7" fill="#000" fillOpacity="0.35" />
      <circle cx="36" cy="27" r="1.7" fill="#000" fillOpacity="0.35" />
      <circle cx="42" cy="23" r="1.7" fill="#000" fillOpacity="0.35" />
      <circle cx="36" cy="35" r="1.7" fill="#000" fillOpacity="0.35" />
      <path d="M50 15l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2 2.2-5Z" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}