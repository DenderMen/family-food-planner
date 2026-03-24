import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, ingredients } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

export interface SnackRecipe {
  id: string;
  name: string;
  estimatedCost: string;
  prepTime: number;
  steps: string[];
  ingredients: {
    id: string;
    name: string;
    amount: string;
    unit: string;
    category: string;
    preferredShop: string;
    estimatedPrice: string;
    bio: boolean;
  }[];
}

export interface SnacksResponse {
  snacks: SnackRecipe[];
}

export async function GET(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const count = parseInt(request.nextUrl.searchParams.get("count") ?? "4", 10);

    // Load all snack recipes for this family
    const allSnacks = await db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.familyId, family.id),
          eq(recipes.category, "snack")
        )
      );

    if (allSnacks.length === 0) {
      return NextResponse.json<SnacksResponse>({ snacks: [] });
    }

    // Shuffle and pick `count` random snacks
    const shuffled = [...allSnacks].sort(() => Math.random() - 0.5).slice(0, count);
    const snackIds = shuffled.map((s) => s.id);

    // Load ingredients for all selected snacks in one query
    const ingRows = await db
      .select()
      .from(ingredients)
      .where(inArray(ingredients.recipeId, snackIds));

    const ingByRecipe = new Map<string, typeof ingRows>();
    for (const ing of ingRows) {
      if (!ing.recipeId) continue;
      if (!ingByRecipe.has(ing.recipeId)) ingByRecipe.set(ing.recipeId, []);
      ingByRecipe.get(ing.recipeId)!.push(ing);
    }

    const snacks: SnackRecipe[] = shuffled.map((s) => ({
      id: s.id,
      name: s.name,
      estimatedCost: s.estimatedCost,
      prepTime: s.prepTime,
      steps: Array.isArray(s.steps) ? (s.steps as string[]) : [],
      ingredients: (ingByRecipe.get(s.id) ?? []).map((ing) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        category: ing.category,
        preferredShop: ing.preferredShop ?? "Supermarkt",
        estimatedPrice: ing.estimatedPrice ?? "0",
        bio: ing.bio ?? false,
      })),
    }));

    return NextResponse.json<SnacksResponse>({ snacks });
  } catch (error) {
    console.error("GET /api/snacks:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
