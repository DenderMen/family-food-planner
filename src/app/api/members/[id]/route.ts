import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

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

    const body = await request.json() as {
      likes?: string[];
      dislikes?: string[];
      allergies?: string[];
      dietaryNeeds?: string[];
    };

    // Verify the member belongs to this family
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.id, id), eq(familyMembers.familyId, family.id)))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [updated] = await db
      .update(familyMembers)
      .set({
        likes: body.likes ?? (member.likes as string[]) ?? [],
        dislikes: body.dislikes ?? (member.dislikes as string[]) ?? [],
        allergies: body.allergies ?? (member.allergies as string[]) ?? [],
        dietaryNeeds: body.dietaryNeeds ?? member.dietaryNeeds ?? [],
      })
      .where(eq(familyMembers.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/members/[id]:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
