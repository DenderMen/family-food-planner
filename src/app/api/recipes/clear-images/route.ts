import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

/**
 * POST /api/recipes/clear-images
 * Sets imageUrl to null for all recipes belonging to the current family.
 * Use this to remove broken Pollinations URLs before regenerating via Puter.js.
 */
export async function POST() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const result = await db
      .update(recipes)
      .set({ imageUrl: null })
      .where(eq(recipes.familyId, family.id))
      .returning({ id: recipes.id });

    return NextResponse.json({ cleared: result.length });
  } catch (error) {
    console.error("POST /api/recipes/clear-images:", error);
    return NextResponse.json({ error: "Fehler beim Bereinigen" }, { status: 500 });
  }
}
