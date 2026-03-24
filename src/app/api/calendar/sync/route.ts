import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weekPlans, dayPlans, recipes, ingredients } from "@/lib/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { getTokens, getCalendarId, getCalendarClient, recipeEmoji, buildEventDescription } from "@/lib/google-calendar";
import { getWeekId, getWeekDates } from "@/lib/utils";

// 0=Mo … 6=So
const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export interface SyncResponse {
  created: number;
  skipped: number;
  errors: string[];
  weekId: string;
}

export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // ── Check Google tokens ───────────────────────────────────────────────────
    const tokens = getTokens(family);
    if (!tokens) {
      return NextResponse.json(
        { error: "Google Kalender nicht verbunden. Bitte zuerst verbinden." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({})) as { weekId?: string };
    const weekId = body.weekId ?? getWeekId();
    const weekDates = getWeekDates(weekId);

    // ── Load week plan ────────────────────────────────────────────────────────
    const [plan] = await db
      .select()
      .from(weekPlans)
      .where(and(eq(weekPlans.familyId, family.id), eq(weekPlans.weekId, weekId)))
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: "Kein Wochenplan für diese Woche gefunden." },
        { status: 404 }
      );
    }

    // ── Load active day plans ─────────────────────────────────────────────────
    const days = await db
      .select()
      .from(dayPlans)
      .where(and(eq(dayPlans.weekPlanId, plan.id), eq(dayPlans.skipped, false)))
      .orderBy(asc(dayPlans.dayOfWeek));

    const activeDays = days.filter((d) => d.recipeId !== null);

    if (activeDays.length === 0) {
      return NextResponse.json(
        { error: "Keine Rezepte im Wochenplan zugewiesen." },
        { status: 400 }
      );
    }

    // ── Load full recipes with ingredients ────────────────────────────────────
    const recipeIds = [...new Set(activeDays.map((d) => d.recipeId!))];

    const recipeRows = await db
      .select()
      .from(recipes)
      .where(inArray(recipes.id, recipeIds));

    const ingredientRows = await db
      .select()
      .from(ingredients)
      .where(inArray(ingredients.recipeId, recipeIds))
      .orderBy(asc(ingredients.sortOrder));

    const ingByRecipe = new Map<string, typeof ingredientRows>();
    for (const ing of ingredientRows) {
      if (!ing.recipeId) continue;
      if (!ingByRecipe.has(ing.recipeId)) ingByRecipe.set(ing.recipeId, []);
      ingByRecipe.get(ing.recipeId)!.push(ing);
    }

    const recipeMap = new Map(recipeRows.map((r) => [r.id, r]));

    // ── Build calendar client ─────────────────────────────────────────────────
    const calendarId = getCalendarId(family);
    const calendar = await getCalendarClient(family.id, tokens);

    // ── Create events ─────────────────────────────────────────────────────────
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const day of activeDays) {
      const recipe = recipeMap.get(day.recipeId!);
      if (!recipe) { skipped++; continue; }

      const date = weekDates[day.dayOfWeek];
      if (!date) { skipped++; continue; }

      const dateStr = date.toISOString().split("T")[0]; // "2026-03-23"
      const startTime = `${dateStr}T17:30:00`;
      const endTime   = `${dateStr}T18:00:00`;

      const emoji = recipeEmoji(recipe.name, recipe.category);
      const ings  = ingByRecipe.get(recipe.id) ?? [];

      const description = buildEventDescription({
        name:        recipe.name,
        prepTime:    recipe.prepTime,
        cookTime:    recipe.cookTime,
        ingredients: ings.map((i) => ({
          name:          i.name,
          amount:        i.amount,
          unit:          i.unit,
          preferredShop: i.preferredShop,
        })),
      });

      try {
        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: `${emoji} ${recipe.name}`,
            description,
            start: { dateTime: startTime, timeZone: "Europe/Berlin" },
            end:   { dateTime: endTime,   timeZone: "Europe/Berlin" },
            reminders: { useDefault: false, overrides: [] },
            colorId: "1", // Peacock (blue)
          },
        });
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${DAY_NAMES[day.dayOfWeek]} (${recipe.name}): ${msg}`);
      }
    }

    // Note: tokens are auto-saved via the oauth2 "tokens" event in getCalendarClient
    const result: SyncResponse = { created, skipped, errors, weekId };
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/calendar/sync:", err);
    return NextResponse.json(
      { error: "Fehler beim Sync mit Google Calendar." },
      { status: 500 }
    );
  }
}
