import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentFamily() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [existing] = await db
    .select()
    .from(families)
    .where(eq(families.ownerId, user.id))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(families)
    .values({ name: "Familie", ownerId: user.id })
    .returning();

  return created;
}
