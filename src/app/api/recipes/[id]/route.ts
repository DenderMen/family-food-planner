import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, ingredients } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { isPantryStaple } from "@/lib/pantry-staples";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const recipe = await db.query.recipes.findFirst({
      where: and(eq(recipes.id, id), eq(recipes.familyId, family.id)),
      with: { ingredients: { orderBy: [asc(ingredients.sortOrder)] } },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("GET /api/recipes/[id]:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const [updated] = await db
      .update(recipes)
      .set({
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
        slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        updatedAt: new Date(),
      })
      .where(and(eq(recipes.id, id), eq(recipes.familyId, family.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });
    }

    if (ingredientsList !== undefined) {
      await db.delete(ingredients).where(eq(ingredients.recipeId, id));
      if (ingredientsList.length > 0) {
        await db.insert(ingredients).values(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ingredientsList.map((ing: any, i: number) => ({
            recipeId: id,
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
    }

    const result = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: { ingredients: { orderBy: [asc(ingredients.sortOrder)] } },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT /api/recipes/[id]:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    await db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.familyId, family.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recipes/[id]:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
