import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { seedFamilyMembers } from "@/lib/seed";

export async function POST() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const existing = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, family.id));

    if (existing.length > 0) {
      return NextResponse.json({
        message: `${existing.length} Familienmitglieder bereits vorhanden.`,
        seeded: false,
      });
    }

    await seedFamilyMembers(family.id);

    return NextResponse.json({
      message: "5 Familienmitglieder erfolgreich angelegt!",
      seeded: true,
    });
  } catch (error) {
    console.error("POST /api/seed-members:", error);
    return NextResponse.json({ error: "Fehler beim Anlegen" }, { status: 500 });
  }
}
