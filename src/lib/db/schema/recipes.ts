import {
  pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { families } from "./families";

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type").notNull(), // 'warm' | 'abendbrot'
  category: text("category").notNull(), // 'fleisch' | 'fisch' | 'vegetarisch' | 'abendbrot'
  tags: text("tags").array().default([]),
  seasons: text("seasons").array().default([]),
  prepTime: integer("prep_time").notNull(),
  cookTime: integer("cook_time").notNull(),
  totalTime: integer("total_time").notNull(),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }).notNull(),
  steps: jsonb("steps").notNull().default([]),
  childAdaptions: jsonb("child_adaptions").default({}),
  nursingBoost: text("nursing_boost"),
  nutrition: jsonb("nutrition").default({}),
  servings: jsonb("servings").default({}),
  isFavorite: boolean("is_favorite").default(false),
  source: text("source"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
