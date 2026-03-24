import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weekPlans, dayPlans, recipes } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";
import { getWeekDates } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const [yearStr, wStr] = weekId.split("-W");
    const year = parseInt(yearStr, 10);
    const weekNumber = parseInt(wStr, 10);

    // Get or create week plan
    let [plan] = await db
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
      [plan] = await db
        .insert(weekPlans)
        .values({
          familyId: family.id,
          weekId,
          year,
          weekNumber,
          budgetLimit: "150",
          status: "draft",
        })
        .returning();
    }

    // Get day plans with recipes (main + snack)
    const days = await db.query.dayPlans.findMany({
      where: eq(dayPlans.weekPlanId, plan.id),
      with: { recipe: true, snackRecipe: true },
      orderBy: [asc(dayPlans.dayOfWeek)],
    });

    // Ensure 7 day slots exist
    const dates = getWeekDates(weekId);
    const dayMap = new Map(days.map((d) => [d.dayOfWeek, d]));

    const fullDays = dates.map((date, i) => {
      const dayOfWeek = i; // 0=Mo, 6=So
      return dayMap.get(dayOfWeek) ?? {
        id: null,
        weekPlanId: plan.id,
        dayOfWeek,
        date: date.toISOString().split("T")[0],
        recipeId: null,
        snackRecipeId: null,
        type: null,
        notes: "",
        skipped: false,
        estimatedCost: "0",
        recipe: null,
        snackRecipe: null,
      };
    });

    return NextResponse.json({ ...plan, days: fullDays });
  } catch (error) {
    console.error("GET /api/week-plans/[weekId]:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

interface DayUpdate {
  dayOfWeek: number;
  date: string;
  recipeId: string | null;
  snackRecipeId?: string | null;
  type: string | null;
  skipped: boolean;
  notes?: string;
  estimatedCost?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { days }: { days: DayUpdate[] } = body;

    const [yearStr, wStr] = weekId.split("-W");
    const year = parseInt(yearStr, 10);
    const weekNumber = parseInt(wStr, 10);

    // Get or create week plan
    let [plan] = await db
      .select()
      .from(weekPlans)
      .where(and(eq(weekPlans.familyId, family.id), eq(weekPlans.weekId, weekId)))
      .limit(1);

    if (!plan) {
      [plan] = await db
        .insert(weekPlans)
        .values({ familyId: family.id, weekId, year, weekNumber, budgetLimit: "150", status: "draft" })
        .returning();
    }

    // Upsert each day
    for (const day of days) {
      const existing = await db
        .select()
        .from(dayPlans)
        .where(and(eq(dayPlans.weekPlanId, plan.id), eq(dayPlans.dayOfWeek, day.dayOfWeek)))
        .limit(1);

      // Get recipe + snack cost
      let cost = 0;
      if (day.recipeId) {
        const [r] = await db.select({ cost: recipes.estimatedCost }).from(recipes).where(eq(recipes.id, day.recipeId)).limit(1);
        if (r) cost += parseFloat(r.cost || "0");
      }
      if (day.snackRecipeId) {
        const [s] = await db.select({ cost: recipes.estimatedCost }).from(recipes).where(eq(recipes.id, day.snackRecipeId)).limit(1);
        if (s) cost += parseFloat(s.cost || "0");
      }
      const totalCost = cost.toFixed(2);

      if (existing.length > 0) {
        await db
          .update(dayPlans)
          .set({
            recipeId: day.recipeId,
            snackRecipeId: day.snackRecipeId ?? null,
            type: day.type,
            skipped: day.skipped,
            notes: day.notes ?? "",
            estimatedCost: totalCost,
          })
          .where(eq(dayPlans.id, existing[0].id));
      } else {
        await db.insert(dayPlans).values({
          weekPlanId: plan.id,
          dayOfWeek: day.dayOfWeek,
          date: day.date,
          recipeId: day.recipeId,
          snackRecipeId: day.snackRecipeId ?? null,
          type: day.type,
          skipped: day.skipped,
          notes: day.notes ?? "",
          estimatedCost: totalCost,
        });
      }
    }

    // Return updated plan
    return GET(request, { params });
  } catch (error) {
    console.error("PUT /api/week-plans/[weekId]:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
