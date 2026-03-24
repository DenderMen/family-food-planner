import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { weekPlans, dayPlans, recipes, familyMembers } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { getWeekId, getCurrentSeason, formatEuro } from "@/lib/utils";

// ─── Exported types (used by the UI) ─────────────────────────────────────────

export interface SuggestedIngredient {
  name: string;
  amount: string;
  unit: string;
  category: string;
  preferredShop: string;
  estimatedPrice: string;
  bio: boolean;
}

export interface SuggestedRecipe {
  name: string;
  type: "warm" | "abendbrot";
  category: "fleisch" | "fisch" | "vegetarisch" | "abendbrot";
  prepTime: number;
  cookTime: number;
  estimatedCost: number;
  nursingBoost: string | null;
  reason: string;
  bestFor: string;
  steps: string[];
  ingredients: SuggestedIngredient[];
}

export interface SuggestResponse {
  suggestions: SuggestedRecipe[];
}

// ─── JSON repair ──────────────────────────────────────────────────────────────
// Attempts to fix truncated JSON by closing open brackets/braces/strings.

function tryRepairJson(raw: string): string {
  let s = raw.trim();

  // Close an open string value if the last char is mid-string
  // Count unescaped double quotes; odd count → open string
  const quoteCount = (s.match(/(?<!\\)"/g) ?? []).length;
  if (quoteCount % 2 !== 0) {
    s += '"';
  }

  // Close open arrays and objects from innermost outward
  const stack: string[] = [];
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && (i === 0 || s[i - 1] !== "\\")) {
      inString = !inString;
    }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // Append missing closing characters in reverse order
  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

function parseResponse(text: string): SuggestResponse {
  // Strip markdown code fences
  const stripped = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();

  // First try: parse as-is
  try {
    return JSON.parse(stripped) as SuggestResponse;
  } catch {
    // Second try: repair and parse
    const repaired = tryRepairJson(stripped);
    try {
      return JSON.parse(repaired) as SuggestResponse;
    } catch (e2) {
      throw new Error(`JSON nicht parsebar: ${e2 instanceof Error ? e2.message : String(e2)}`);
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { wish?: string; weekId?: string };
    const weekId = body.weekId ?? getWeekId();
    const wish   = (body.wish ?? "").trim();

    // ── Load family members with preferences ──────────────────────────────────
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, family.id));

    // ── Load current week plan ────────────────────────────────────────────────
    const [plan] = await db
      .select()
      .from(weekPlans)
      .where(and(eq(weekPlans.familyId, family.id), eq(weekPlans.weekId, weekId)))
      .limit(1);

    const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    let spentBudget = 0;
    const plannedMeals: Array<{ day: string; name: string; category: string }> = [];

    if (plan) {
      const days = await db
        .select()
        .from(dayPlans)
        .where(eq(dayPlans.weekPlanId, plan.id))
        .orderBy(asc(dayPlans.dayOfWeek));

      for (const day of days) {
        if (day.skipped || !day.recipeId) continue;
        spentBudget += parseFloat(day.estimatedCost || "0");
        const [rec] = await db.select({ name: recipes.name, category: recipes.category }).from(recipes).where(eq(recipes.id, day.recipeId)).limit(1);
        if (rec) plannedMeals.push({ day: DAY_NAMES[day.dayOfWeek], name: rec.name, category: rec.category });
      }
    }

    const remainingBudget = Math.max(0, 150 - spentBudget);
    const maxCostPerMeal  = Math.min(remainingBudget, 25);
    const season          = getCurrentSeason();

    // ── Category balance: what's missing? ────────────────────────────────────
    const catCount = { fleisch: 0, fisch: 0, vegetarisch: 0, abendbrot: 0 };
    for (const m of plannedMeals) {
      if (m.category in catCount) catCount[m.category as keyof typeof catCount]++;
    }
    const missing: string[] = [];
    if (catCount.fisch === 0) missing.push("Fisch fehlt noch");
    if (catCount.vegetarisch < 2) missing.push("mehr Gemüse/Veg");
    if (catCount.fleisch > 3) missing.push("weniger Fleisch");

    // ── Build preferences context ─────────────────────────────────────────────
    const memberContext = members.map((m) => {
      const likes = (m.likes as string[] | null) ?? [];
      const dislikes = (m.dislikes as string[] | null) ?? [];
      const allergies = (m.allergies as string[] | null) ?? [];
      const needs = Array.isArray(m.dietaryNeeds) ? (m.dietaryNeeds as string[]) : [];
      const parts: string[] = [];
      if (likes.length) parts.push(`mag: ${likes.join(", ")}`);
      if (dislikes.length) parts.push(`mag nicht: ${dislikes.join(", ")}`);
      if (allergies.length) parts.push(`Allergien: ${allergies.join(", ")}`);
      if (needs.length) parts.push(needs.join(", "));
      if (m.isNursing) parts.push("stillt (+500kcal, extra Kalzium/Eisen/Omega3)");
      return `${m.emoji ?? ""} ${m.name}: ${parts.join("; ") || "keine Angaben"}`;
    }).join("\n");

    // ── Build prompt ──────────────────────────────────────────────────────────
    const plannedStr = plannedMeals.length > 0
      ? plannedMeals.map((m) => `${m.day}: ${m.name} (${m.category})`).join(", ")
      : "noch nichts geplant";
    const missingStr = missing.length > 0 ? `Fehlend: ${missing.join(", ")}` : "";

    const prompt = `Familienrezept-Assistent. Stil: Familienkost.de / KptnCook – alltagstauglich, deutsche Familienküche, keine exotischen Zutaten.

Familienmitglieder und Vorlieben:
${memberContext || "2 Erwachsene (1 stillend), Kinder 4+2, Baby"}

Regeln: max. 30 Min, kein Scharfes, kein rohes Fleisch, kein Alkohol, Bio bevorzugt.
Saison: ${season} | Budget-Rest: ${formatEuro(remainingBudget)} (max. ${formatEuro(maxCostPerMeal)}/Gericht)
Bereits geplant: ${plannedStr}
${missingStr}
${wish ? `Wunsch: "${wish}"` : ""}

Laden-Zuordnung (fest einhalten):
- Metzger: Fleisch, Hackfleisch, Wurst, Aufschnitt
- Aldi: Nudeln, Mehl, Reis, Kartoffeln, Zucker, Öl, Gewürze, Konserven, TK-Basics
- Supermarkt: Gemüse, Obst, Milch, Käse, Eier, Sahne, Brot, TK-Gemüse, Fisch

Preise: realistische deutsche Supermarktpreise 2025 (Hackfleisch 500g=4,50€, Spaghetti 500g=1,20€, Sahne 200ml=0,89€).

Schlage genau 3 verschiedene Abendessen vor. Begründe jeden Vorschlag kurz (1 Satz) und nenne wem es besonders schmeckt.
Antworte NUR mit diesem JSON, kein Markdown:

{"suggestions":[{"name":"...","type":"warm","category":"fleisch","prepTime":10,"cookTime":20,"estimatedCost":12.00,"nursingBoost":"...oder null","reason":"Fisch fehlt + Kaja braucht Omega3","bestFor":"Kaja & Theo","steps":["Schritt 1","Schritt 2"],"ingredients":[{"name":"...","amount":"300","unit":"g","category":"fleisch","preferredShop":"Metzger","estimatedPrice":"4.50","bio":false}]}]}

Wichtig: max. 6 Zutaten, max. 5 Schritte, genau 3 Rezepte.`;

    // ── Call Claude ───────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    // Log stop reason to help diagnose future truncation
    if (message.stop_reason !== "end_turn") {
      console.warn("POST /api/suggest: unexpected stop_reason:", message.stop_reason);
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Keine Textantwort von Claude erhalten." },
        { status: 502 }
      );
    }

    let parsed: SuggestResponse;
    try {
      parsed = parseResponse(textBlock.text);
    } catch (parseErr) {
      console.error("POST /api/suggest parse error:", parseErr, "\nRaw:", textBlock.text.slice(0, 300));
      return NextResponse.json(
        { error: "Claude hat kein gültiges JSON zurückgegeben. Bitte nochmal versuchen." },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
      return NextResponse.json(
        { error: "Keine Vorschläge erhalten. Bitte nochmal versuchen." },
        { status: 422 }
      );
    }

    // Keep at most 3 suggestions
    parsed.suggestions = parsed.suggestions.slice(0, 3);

    return NextResponse.json<SuggestResponse>(parsed);
  } catch (err) {
    console.error("POST /api/suggest:", err);
    const msg = err instanceof Error ? err.message : "Fehler beim Generieren";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
