import { google } from "googleapis";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
}

export interface FamilyPreferences {
  googleCalendar?: GoogleCalendarTokens;
  googleCalendarId?: string; // selected calendarId (default: "primary")
}

// ─── OAuth2 client factory ────────────────────────────────────────────────────

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

export function getGoogleAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",   // always return a refresh_token
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });
}

// ─── Token persistence ────────────────────────────────────────────────────────

export async function saveTokens(familyId: string, tokens: GoogleCalendarTokens) {
  const [current] = await db.select({ prefs: families.preferences })
    .from(families)
    .where(eq(families.id, familyId))
    .limit(1);

  const prefs = (current?.prefs ?? {}) as FamilyPreferences;

  await db.update(families)
    .set({
      preferences: { ...prefs, googleCalendar: tokens } as object,
      updatedAt: new Date(),
    })
    .where(eq(families.id, familyId));
}

export async function removeTokens(familyId: string) {
  const [current] = await db.select({ prefs: families.preferences })
    .from(families)
    .where(eq(families.id, familyId))
    .limit(1);

  const prefs = (current?.prefs ?? {}) as FamilyPreferences;
  const { googleCalendar: _removed, ...rest } = prefs;

  await db.update(families)
    .set({ preferences: rest as object, updatedAt: new Date() })
    .where(eq(families.id, familyId));
}

export function getTokens(family: { preferences: unknown }): GoogleCalendarTokens | null {
  const prefs = (family.preferences ?? {}) as FamilyPreferences;
  return prefs.googleCalendar ?? null;
}

export function getCalendarId(family: { preferences: unknown }): string {
  const prefs = (family.preferences ?? {}) as FamilyPreferences;
  return prefs.googleCalendarId ?? "primary";
}

export async function saveCalendarId(familyId: string, calendarId: string) {
  const [current] = await db.select({ prefs: families.preferences })
    .from(families)
    .where(eq(families.id, familyId))
    .limit(1);

  const prefs = (current?.prefs ?? {}) as FamilyPreferences;

  await db.update(families)
    .set({
      preferences: { ...prefs, googleCalendarId: calendarId } as object,
      updatedAt: new Date(),
    })
    .where(eq(families.id, familyId));
}

// ─── Authenticated calendar client ───────────────────────────────────────────

export async function getCalendarClient(
  familyId: string,
  tokens: GoogleCalendarTokens,
) {
  const oauth2 = createOAuth2Client();

  oauth2.setCredentials({
    access_token:  tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date:   tokens.expiresAt,
  });

  // Persist refreshed tokens automatically
  oauth2.on("tokens", async (newTokens) => {
    if (newTokens.access_token) {
      await saveTokens(familyId, {
        accessToken:  newTokens.access_token,
        refreshToken: newTokens.refresh_token ?? tokens.refreshToken,
        expiresAt:    newTokens.expiry_date ?? Date.now() + 3600_000,
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2 });
}

// ─── Emoji helper (shared with kids page) ────────────────────────────────────

export function recipeEmoji(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes("pizza"))                                           return "🍕";
  if (n.includes("bolognese") || n.includes("spaghetti"))           return "🍝";
  if (n.includes("pasta") || n.includes("nudel"))                   return "🍝";
  if (n.includes("spätzle") || (n.includes("käse") && !n.includes("pizza"))) return "🧀";
  if (n.includes("gratin") || n.includes("kartoffel"))              return "🥔";
  if (n.includes("fischstäbchen") || n.includes("fisch"))           return "🐟";
  if (n.includes("hot dog") || n.includes("würstchen") || n.includes("pommes")) return "🌭";
  if (n.includes("spinat"))                                          return "🥬";
  if (n.includes("suppe"))                                           return "🍲";
  if (n.includes("burger"))                                          return "🍔";
  if (n.includes("brot") || n.includes("abendbrot"))                return "🥪";
  if (category === "fisch")                                          return "🐟";
  if (category === "fleisch")                                        return "🥩";
  if (category === "abendbrot")                                      return "🥪";
  return "🍽️";
}

// ─── Event description builder ────────────────────────────────────────────────

interface IngRow {
  name: string;
  amount: string;
  unit: string;
  preferredShop: string | null;
}

interface RecipeForEvent {
  name: string;
  prepTime: number;
  cookTime: number;
  ingredients?: IngRow[];
}

export function buildEventDescription(recipe: RecipeForEvent): string {
  const lines: string[] = [];

  lines.push(`⏰ ${recipe.prepTime + recipe.cookTime} Min Zubereitung\n`);

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    lines.push("📋 Zutaten:");
    for (const ing of recipe.ingredients) {
      const shop = ing.preferredShop ? ` · ${ing.preferredShop}` : "";
      lines.push(`  • ${ing.amount} ${ing.unit} ${ing.name}${shop}`);
    }
    lines.push("");
  }

  lines.push("— Family Dinner Planner");
  return lines.join("\n");
}
