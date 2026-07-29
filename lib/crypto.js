import crypto from "crypto";

// Login codes are high-entropy (32^10 combinations) so a deterministic
// SHA-256 is fine here — unlike a password, a login code doesn't need
// bcrypt's slow-hash brute-force resistance, and we need to be able to
// look a player up BY their code (there's no username/email to search by
// on the login screen), which a salted bcrypt hash can't do.
export function hashLoginCode(code) {
  return crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");
}
