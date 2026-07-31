import { NextResponse } from "next/server";
import { getPlayerFromToken, tokenFromRequest } from "../../../../lib/session";

// Lets the client re-verify who it actually is, straight from the DB, using
// only the session token. Used on page load to overwrite whatever's sitting
// in localStorage (which the user can freely edit in devtools) with the
// real, canonical username — so a devtools edit never sticks past a reload.
// isAdmin comes from the same DB lookup, for the same reason: the client
// can't grant itself admin by editing anything locally, it can only ever
// display whatever this route says.
export async function GET(request) {
  const token = tokenFromRequest(request);
  const player = await getPlayerFromToken(token);
  if (!player) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ username: player.username, isAdmin: !!player.is_admin });
}