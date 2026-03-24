import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weekPlans, dayPlans, recipes, ingredients } from "@/lib/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { getWeekId } from "@/lib/utils";

// 0=Mo … 6=So
const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export interface RawIngredient {
  ingredientName: string;
  amount: number;
  unit: string;
  shop: string;
  estimatedPrice: number;
  bio: boolean;
  dayOfWeek: number;
  dayName: string;
  recipeName: string;
}

export interface ShoppingApiResponse {
  weekId: string;
  hasPlan: boolean;
  hasRecipes: boolean;
  rawItems: RawIngredient[];
}

export async function GET(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const weekId =
      request.nextUrl.searchParams.get("weekId") ?? getWeekId();

    // ── Look up week plan (never auto-create here) ────────────────────────────
    const [plan] = await db
      .select()
      .from(weekPlans)
      .where(
        and(
          eq(weekPlans.familyId, family.id),
          eq(weekPlans.weekId, weekId)
        )
      )
      .limit(1);

    if (!plan) {
      return NextResponse.json<ShoppingApiResponse>({
        weekId,
        hasPlan: false,
        hasRecipes: false,
        rawItems: [],
      });
    }

    // ── Active day plans (not skipped, recipe assigned) ───────────────────────
    const days = await db
      .select()
      .from(dayPlans)
      .where(
        and(
          eq(dayPlans.weekPlanId, plan.id),
          eq(dayPlans.skipped, false)
        )
      )
      .orderBy(asc(dayPlans.dayOfWeek));

    const activeDays = days.filter((d) => d.recipeId !== null);

    if (activeDays.length === 0) {
      return NextResponse.json<ShoppingApiResponse>({
        weekId,
        hasPlan: true,
        hasRecipes: false,
        rawItems: [],
      });
    }

    // ── Load recipes + snack recipes with ingredients ─────────────────────────
    const recipeIds = [...new Set([
      ...activeDays.map((d) => d.recipeId!),
      ...activeDays.filter((d) => (d as { snackRecipeId?: string | null }).snackRecipeId).map((d) => (d as { snackRecipeId: string }).snackRecipeId),
    ])];

    const recipeRows = await db
      .select({ id: recipes.id, name: recipes.name })
      .from(recipes)
      .where(inArray(recipes.id, recipeIds));

    const ingredientRows = await db
      .select()
      .from(ingredients)
      .where(inArray(ingredients.recipeId, recipeIds))
      .orderBy(asc(ingredients.sortOrder));

    // Group ingredients by recipeId
    const ingByRecipe = new Map<string, typeof ingredientRows>();
    for (const ing of ingredientRows) {
      if (!ing.recipeId) continue;
      if (!ingByRecipe.has(ing.recipeId)) ingByRecipe.set(ing.recipeId, []);
      ingByRecipe.get(ing.recipeId)!.push(ing);
    }

    const recipeNameMap = new Map(recipeRows.map((r) => [r.id, r.name]));

    // ── Build raw item list (main recipe + snack per day) ─────────────────────
    const rawItems: RawIngredient[] = [];

    for (const day of activeDays) {
      const dayName = DAY_NAMES[day.dayOfWeek] ?? `Tag ${day.dayOfWeek}`;

      // Main recipe ingredients
      const recipeName = recipeNameMap.get(day.recipeId!) ?? "Unbekannt";
      for (const ing of ingByRecipe.get(day.recipeId!) ?? []) {
        rawItems.push({
          ingredientName: ing.name,
          amount: parseFloat(ing.amount),
          unit: ing.unit,
          shop: ing.preferredShop ?? "Supermarkt",
          estimatedPrice: parseFloat(ing.estimatedPrice ?? "0"),
          bio: ing.bio ?? false,
          dayOfWeek: day.dayOfWeek,
          dayName,
          recipeName,
        });
      }

      // Snack recipe ingredients (if any)
      const snackId = (day as { snackRecipeId?: string | null }).snackRecipeId;
      if (snackId) {
        const snackName = recipeNameMap.get(snackId) ?? "Snack";
        for (const ing of ingByRecipe.get(snackId) ?? []) {
          rawItems.push({
            ingredientName: ing.name,
            amount: parseFloat(ing.amount),
            unit: ing.unit,
            shop: ing.preferredShop ?? "Supermarkt",
            estimatedPrice: parseFloat(ing.estimatedPrice ?? "0"),
            bio: ing.bio ?? false,
            dayOfWeek: day.dayOfWeek,
            dayName,
            recipeName: `${snackName} (Snack)`,
          });
        }
      }
    }

    return NextResponse.json<ShoppingApiResponse>({
      weekId,
      hasPlan: true,
      hasRecipes: true,
      rawItems,
    });
  } catch (error) {
    console.error("GET /api/shopping:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
