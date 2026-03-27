import {
  pgTable, uuid, text, integer, numeric, boolean,
} from "drizzle-orm/pg-core";
import { weekPlans } from "./week-plans";
import { recipes } from "./recipes";

export const dayPlans = pgTable("day_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekPlanId: uuid("week_plan_id").references(() => weekPlans.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  date: text("date").notNull(),
  recipeId: uuid("recipe_id").references(() => recipes.id),
  snackRecipeId: uuid("snack_recipe_id").references(() => recipes.id),
  type: text("type"), // 'abendessen' | 'abendbrot'
  guestCount: integer("guest_count").default(0),
  scaleFactor: numeric("scale_factor").default("1.0"),
  notes: text("notes").default(""),
  skipped: boolean("skipped").default(false),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }).default("0"),
});

export type DayPlan = typeof dayPlans.$inferSelect;
export type NewDayPlan = typeof dayPlans.$inferInsert;
