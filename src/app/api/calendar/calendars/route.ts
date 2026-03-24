import { NextRequest, NextResponse } from "next/server";
import { getCurrentFamily } from "@/lib/db/get-family";
import { getTokens, getCalendarClient, saveCalendarId } from "@/lib/google-calendar";

export interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
}

export interface CalendarsResponse {
  calendars: CalendarItem[];
  selectedCalendarId: string;
}

// GET – list all calendars for this user
export async function GET() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const tokens = getTokens(family);
    if (!tokens) {
      return NextResponse.json(
        { error: "Google Kalender nicht verbunden." },
        { status: 400 }
      );
    }

    const calendar = await getCalendarClient(family.id, tokens);
    const list = await calendar.calendarList.list({ minAccessRole: "writer" });

    const calendars: CalendarItem[] = (list.data.items ?? []).map((c) => ({
      id: c.id!,
      summary: c.summary ?? c.id!,
      primary: c.primary ?? false,
      accessRole: c.accessRole ?? "writer",
    }));

    // Re-read preferences to get the currently selected calendarId
    const prefs = (family.preferences ?? {}) as { googleCalendarId?: string };
    const selectedCalendarId = prefs.googleCalendarId ?? "primary";

    return NextResponse.json<CalendarsResponse>({ calendars, selectedCalendarId });
  } catch (err) {
    console.error("GET /api/calendar/calendars:", err);
    return NextResponse.json({ error: "Fehler beim Laden der Kalender." }, { status: 500 });
  }
}

// PUT – save selected calendarId
export async function PUT(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { calendarId } = await request.json() as { calendarId: string };
    if (!calendarId) {
      return NextResponse.json({ error: "calendarId fehlt" }, { status: 400 });
    }

    await saveCalendarId(family.id, calendarId);
    return NextResponse.json({ success: true, calendarId });
  } catch (err) {
    console.error("PUT /api/calendar/calendars:", err);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }
}
