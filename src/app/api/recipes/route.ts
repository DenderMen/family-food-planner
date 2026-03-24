import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, ingredients } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { pollinationsImageUrl } from "@/lib/utils";

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
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        familyId: family.id,
        name,
        type: recipeData.type === "abendbrot" ? "abendbrot" : "warm",
        category: ["fleisch","fisch","vegetarisch","abendbrot","snack"].includes(recipeData.category)
          ? recipeData.category : "vegetarisch",
        prepTime: Number(recipeData.prepTime) || 0,
        cookTime: Number(recipeData.cookTime) || 0,
        totalTime: (Number(recipeData.prepTime) || 0) + (Number(recipeData.cookTime) || 0),
        estimatedCost: String(recipeData.estimatedCost || "0"),
        isFavorite: Boolean(recipeData.isFavorite),
        nursingBoost: recipeData.nursingBoost ? String(recipeData.nursingBoost) : null,
        imageUrl: recipeData.imageUrl ? String(recipeData.imageUrl) : pollinationsImageUrl(name),
        steps: Array.isArray(recipeData.steps) ? recipeData.steps.filter((s: unknown) => typeof s === "string") : [],
        slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
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
