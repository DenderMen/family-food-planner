import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { getCurrentFamily } from "@/lib/db/get-family";

export async function GET() {
  const family = await getCurrentFamily();
  if (!family) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const url = getGoogleAuthUrl();
  return NextResponse.redirect(url);
}
