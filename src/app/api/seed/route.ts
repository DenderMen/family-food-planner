import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipes, familyMembers } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { seedRecipes, seedSnacks, seedFamilyMembers } from "@/lib/seed";

export async function POST() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const existing = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.familyId, family.id), ne(recipes.category, "snack")));

    const existingSnacks = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.familyId, family.id), eq(recipes.category, "snack")));

    const existingMembers = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, family.id));

    let seededMain = false;
    let seededSnacks = false;
    let seededMembers = false;

    if (existing.length === 0) {
      await seedRecipes(family.id);
      seededMain = true;
    }

    if (existingSnacks.length === 0) {
      await seedSnacks(family.id);
      seededSnacks = true;
    }

    if (existingMembers.length === 0) {
      await seedFamilyMembers(family.id);
      seededMembers = true;
    }

    const created = [
      seededMain && "6 Hauptrezepte",
      seededSnacks && "20 Brotzeit-Snacks",
      seededMembers && "5 Familienmitglieder",
    ].filter(Boolean);

    return NextResponse.json({
      message: created.length > 0
        ? `Erstellt: ${created.join(" + ")}!`
        : "Alle Daten bereits vorhanden.",
      seeded: seededMain || seededSnacks || seededMembers,
    });
  } catch (error) {
    console.error("POST /api/seed:", error);
    return NextResponse.json({ error: "Fehler beim Seeden" }, { status: 500 });
  }
}
