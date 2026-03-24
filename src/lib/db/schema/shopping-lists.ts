import {
  pgTable, uuid, text, numeric, boolean, timestamp, integer,
} from "drizzle-orm/pg-core";
import { weekPlans } from "./week-plans";

export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekPlanId: uuid("week_plan_id").references(() => weekPlans.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  targetDate: text("target_date"),
  coversDays: integer("covers_days").array().default([]),
  totalEstimated: numeric("total_estimated", { precision: 10, scale: 2 }).default("0"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;
