import {
  pgTable, uuid, text, integer, numeric, timestamp,
} from "drizzle-orm/pg-core";
import { families } from "./families";

export const weekPlans = pgTable("week_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
  weekId: text("week_id").notNull(),
  year: integer("year").notNull(),
  weekNumber: integer("week_number").notNull(),
  budgetLimit: numeric("budget_limit", { precision: 10, scale: 2 }).default("150"),
  status: text("status").default("draft"), // 'draft' | 'planned' | 'active' | 'completed'
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WeekPlan = typeof weekPlans.$inferSelect;
export type NewWeekPlan = typeof weekPlans.$inferInsert;
