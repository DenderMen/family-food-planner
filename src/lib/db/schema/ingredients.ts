import {
  pgTable, uuid, text, numeric, boolean, integer,
} from "drizzle-orm/pg-core";
import { recipes } from "./recipes";

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  preferredShop: text("preferred_shop").default("Supermarkt"),
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }).notNull().default("0"),
  bio: boolean("bio").default(false),
  regional: boolean("regional").default(false),
  isOptional: boolean("is_optional").default(false),
  sortOrder: integer("sort_order").default(0),
});

export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
