import { NextResponse } from "next/server";
import { getCurrentFamily } from "@/lib/db/get-family";
import { getTokens, getCalendarId } from "@/lib/google-calendar";

export interface SettingsResponse {
  googleCalendar: {
    connected: boolean;
    calendarId: string;
  };
}

export async function GET() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const tokens = getTokens(family);

    return NextResponse.json<SettingsResponse>({
      googleCalendar: {
        connected: tokens !== null && Boolean(tokens.refreshToken),
        calendarId: getCalendarId(family),
      },
    });
  } catch (err) {
    console.error("GET /api/settings:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
