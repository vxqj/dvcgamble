import { supabaseAdmin } from "./supabase";

// Curated word lists so nothing inappropriate can ever come out — there is
// no free-text username field anywhere in this app, on purpose. Add more
// words any time, just keep them clean.
const ADJECTIVES = [
  "Shadow", "Golden", "Crimson", "Rapid", "Silent", "Frozen", "Blazing",
  "Mighty", "Sneaky", "Lucky", "Iron", "Cosmic", "Wild", "Rusty", "Turbo",
  "Phantom", "Electric", "Savage", "Royal", "Sly", "Frosty", "Chrome",
  "Neon", "Feral", "Nimble", "Grim", "Solar", "Lunar", "Toxic", "Velvet",
];

const NOUNS = [
  "Falcon", "Tiger", "Wolf", "Ranger", "Ninja", "Rocket", "Panther",
  "Cobra", "Knight", "Comet", "Dragon", "Hawk", "Viper", "Titan",
  "Wizard", "Raider", "Storm", "Fox", "Bandit", "Phoenix", "Goblin",
  "Cyclone", "Reaper", "Otter", "Badger", "Griffin", "Yeti", "Rhino",
  "Pirate", "Ghost",
];

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function randomCandidate() {
  const adj = ADJECTIVES[randInt(ADJECTIVES.length)];
  const noun = NOUNS[randInt(NOUNS.length)];
  const num = 100 + randInt(9000); // 100-9099
  return `${adj}${noun}${num}`;
}

// Strictly validates that a username is an EXACT Adjective+Noun+number
// combo from the curated lists above — not just "letters then digits"
// shaped. This is what actually closes off the free-text hole: without
// this, someone could skip the UI, POST straight to /api/auth/signup with
// any string like "WeirdStuff123", and since it merely LOOKED like a valid
// shape it would get stored permanently and shown to everyone. Every
// caller that accepts a client-submitted username must run it through this
// first — never re-introduce the old shape-only regex check.
export function isValidGeneratedUsername(username) {
  if (typeof username !== "string") return false;
  const m = username.match(/^([A-Za-z]+)(\d{3,4})$/);
  if (!m) return false;
  const letters = m[1];
  const num = parseInt(m[2], 10);
  if (num < 100 || num > 9099) return false;
  for (const adj of ADJECTIVES) {
    if (letters.startsWith(adj)) {
      const noun = letters.slice(adj.length);
      if (NOUNS.includes(noun)) return true;
    }
  }
  return false;
}

// Generates a username that isn't already taken. Purely server-side — the
// client only ever gets shown the result of this (via the dice reroll), it
// never gets to submit its own text.
export async function generateUsername() {
  const db = supabaseAdmin();
  for (let i = 0; i < 20; i++) {
    const candidate = randomCandidate();
    const { data, error } = await db
      .from("players")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  // Absurdly unlucky 20 collisions in a row — fall back to a unique suffix.
  return randomCandidate() + "-" + Date.now().toString(36).slice(-4);
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export function generateLoginCode() {
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += CODE_ALPHABET[randInt(CODE_ALPHABET.length)];
  }
  return out.slice(0, 5) + "-" + out.slice(5);
}
