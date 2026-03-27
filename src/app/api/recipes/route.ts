import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, ingredients } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { isPantryStaple } from "@/lib/pantry-staples";

async function uniqueSlug(familyId: string, base: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.familyId, familyId), eq(recipes.slug, slug)))
      .limit(1);
    if (existing.length === 0) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function GET() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const recipeList = await db.query.recipes.findMany({
      where: eq(recipes.familyId, family.id),
      with: { ingredients: { orderBy: [asc(ingredients.sortOrder)] } },
      orderBy: [asc(recipes.name)],
    });

    return NextResponse.json(recipeList);
  } catch (error) {
    console.error("GET /api/recipes:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Rezepte" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { ingredients: ingredientsList, ...recipeData } = body;

    if (!recipeData.name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const name = String(recipeData.name).trim();
    const baseSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const slug = await uniqueSlug(family.id, baseSlug);

    const [newRecipe] = await db
      .insert(recipes)
      .values({
        familyId: family.id,
        name,
        type: recipeData.type === "abendbrot" ? "abendbrot" : "abendessen",
        category: ["fleisch","fisch","vegetarisch","abendbrot","snack"].includes(recipeData.category)
          ? recipeData.category : "vegetarisch",
        prepTime: Number(recipeData.prepTime) || 0,
        cookTime: Number(recipeData.cookTime) || 0,
        totalTime: (Number(recipeData.prepTime) || 0) + (Number(recipeData.cookTime) || 0),
        estimatedCost: String(recipeData.estimatedCost || "0"),
        isFavorite: Boolean(recipeData.isFavorite),
        imageUrl: recipeData.imageUrl ? String(recipeData.imageUrl) : null,
        steps: Array.isArray(recipeData.steps) ? recipeData.steps.filter((s: unknown) => typeof s === "string") : [],
        slug,
      })
      .returning();

    if (ingredientsList?.length > 0) {
      await db.insert(ingredients).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ingredientsList.map((ing: any, i: number) => ({
          recipeId: newRecipe.id,
          name: ing.name,
          amount: String(ing.amount || "0"),
          unit: ing.unit || "Stück",
          category: ing.category || "sonstiges",
          preferredShop: ing.preferredShop || "Supermarkt",
          estimatedPrice: String(ing.estimatedPrice || "0"),
          bio: Boolean(ing.bio),
          isBasic: ing.isBasic !== undefined ? Boolean(ing.isBasic) : isPantryStaple(ing.name),
          sortOrder: i,
        }))
      );
    }

    const created = await db.query.recipes.findFirst({
      where: eq(recipes.id, newRecipe.id),
      with: { ingredients: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Rezepts" },
      { status: 500 }
    );
  }
}
