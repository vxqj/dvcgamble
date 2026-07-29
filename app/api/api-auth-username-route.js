import { NextResponse } from "next/server";
import { generateUsername } from "../../../../lib/usernames";

export async function GET() {
  try {
    const username = await generateUsername();
    return NextResponse.json({ username });
  } catch (e) {
    return NextResponse.json({ error: "Could not generate a username" }, { status: 500 });
  }
}
