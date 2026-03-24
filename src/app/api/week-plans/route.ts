import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weekPlans } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

export async function GET() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const plans = await db
      .select()
      .from(weekPlans)
      .where(eq(weekPlans.familyId, family.id))
      .orderBy(desc(weekPlans.year), desc(weekPlans.weekNumber))
      .limit(10);

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/week-plans:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
