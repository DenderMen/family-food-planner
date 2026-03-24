import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentFamily } from "@/lib/db/get-family";

export interface MemberResponse {
  id: string;
  name: string;
  emoji: string;
  role: string;
  ageGroup: string;
  isNursing: boolean;
  isMainCook: boolean;
  likes: string[];
  dislikes: string[];
  allergies: string[];
  dietaryNeeds: string[];
}

export interface MembersListResponse {
  members: MemberResponse[];
}

export async function GET() {
  try {
    const family = await getCurrentFamily();
    if (!family) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, family.id));

    const members: MemberResponse[] = rows.map((m) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji ?? "👤",
      role: m.role,
      ageGroup: m.ageGroup,
      isNursing: m.isNursing ?? false,
      isMainCook: m.isMainCook ?? false,
      likes: (m.likes as string[]) ?? [],
      dislikes: (m.dislikes as string[]) ?? [],
      allergies: (m.allergies as string[]) ?? [],
      dietaryNeeds: Array.isArray(m.dietaryNeeds)
        ? (m.dietaryNeeds as string[])
        : [],
    }));

    return NextResponse.json<MembersListResponse>({ members });
  } catch (error) {
    console.error("GET /api/members:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
