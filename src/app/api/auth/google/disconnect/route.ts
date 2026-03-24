import { NextResponse } from "next/server";
import { removeTokens } from "@/lib/google-calendar";
import { getCurrentFamily } from "@/lib/db/get-family";

export async function POST() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    await removeTokens(family.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Google disconnect error:", err);
    return NextResponse.json({ error: "Fehler beim Trennen" }, { status: 500 });
  }
}
